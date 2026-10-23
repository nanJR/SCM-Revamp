import time
from types import SimpleNamespace

import jwt
import pytest
from cryptography.hazmat.primitives.asymmetric import ec
from fastapi.testclient import TestClient

from scm import auth
from scm.api import app
from scm.auth import ANONYMOUS, Caller, SupabaseAuth, get_caller

client = TestClient(app)
URL = "https://example.supabase.co"


@pytest.fixture
def as_caller():
    def use(caller: Caller):
        app.dependency_overrides[get_caller] = lambda: caller

    yield use
    app.dependency_overrides.clear()


@pytest.fixture
def run_once():
    client.post("/api/reset")
    client.post("/api/pipeline/run")


def test_demo_mode_is_admin(monkeypatch):
    monkeypatch.delenv("SCM_AUTH", raising=False)
    assert client.get("/api/me").json()["role"] == "admin"
    assert client.get("/api/health").json()["auth"] == "off"


def test_signed_out_sees_no_deals_and_no_prices(run_once, as_caller):
    as_caller(ANONYMOUS)
    assert client.get("/api/pipeline/results").json() == []
    assert client.get("/api/disposals").json() == []
    ledger = client.get("/api/ledger").json()
    assert ledger["passports"] == [] and ledger["verification"]["valid"]
    f04 = client.get("/api/facilities").json()["F04"]
    assert f04["cost_floor_inr_per_ton"] is None
    assert client.post("/api/pipeline/run").status_code == 401
    assert client.get("/api/decisions").status_code == 401
    assert client.post("/api/facilities/F04/describe").status_code == 401


def test_seller_sees_only_own_deals_and_own_price(run_once, as_caller):
    as_caller(Caller(role="seller", user_id="u1", facility_id="F04"))
    items = client.get("/api/pipeline/results").json()
    assert items and all("F04" in (i["seller"]["id"], i["buyer"]["id"]) for i in items)
    assert items[0]["seller"]["cost_floor_inr_per_ton"] is not None
    assert all(i["buyer"]["cost_ceiling_inr_per_ton"] is None for i in items)
    passports = client.get("/api/ledger").json()["passports"]
    assert passports and all(p["deal"]["seller_id"] == "F04" for p in passports)
    facilities = client.get("/api/facilities").json()
    assert facilities["F04"]["cost_floor_inr_per_ton"] is not None
    assert facilities["F02"]["cost_floor_inr_per_ton"] is None
    assert client.post("/api/pipeline/run").status_code == 403
    assert client.post("/api/reset").status_code == 403


def test_pool_member_sees_pooled_deal(run_once, as_caller):
    as_caller(Caller(role="seller", user_id="u2", facility_id="F17"))
    items = client.get("/api/pipeline/results").json()
    assert [i["seller"]["id"] for i in items] == ["POOL-PLASTIC_SCRAP-TUMKUR"]


def test_hazardous_seller_sees_own_disposal(run_once, as_caller):
    as_caller(Caller(role="seller", user_id="u3", facility_id="F01"))
    assert {d["seller_id"] for d in client.get("/api/disposals").json()} == {"F01"}


def test_carrier_sees_only_hauls(run_once, as_caller):
    as_caller(Caller(role="carrier", user_id="u4", carrier_id="CAR05"))
    items = client.get("/api/pipeline/results").json()
    assert items and all(i["logistics_deal"]["carrier_id"] == "CAR05" for i in items)


def test_sensor_only_for_own_facility(as_caller):
    client.post("/api/reset")
    as_caller(Caller(role="seller", user_id="u1", facility_id="F04"))
    body = {"moisture_pct": 10, "contamination_flag": False}
    assert client.post("/api/facilities/sensor", json={"facility_id": "F02", **body}).status_code == 403
    assert client.post("/api/facilities/sensor", json={"facility_id": "F04", **body}).status_code == 200


def test_member_cannot_overwrite_or_switch_role(as_caller):
    as_caller(Caller(role="buyer", user_id="u5"))
    assert client.post("/api/facilities/add", json={"name": "X", "role": "seller"}).status_code == 403
    assert client.post("/api/facilities/add", json={"id": "F10", "name": "X", "role": "buyer"}).status_code == 409
    assert client.post("/api/facilities/add", json={"name": "New buyer", "role": "buyer"}).status_code == 200


def test_regulator_runs_and_reads_audit(as_caller):
    as_caller(Caller(role="regulator", user_id="u6"))
    assert client.post("/api/pipeline/run").status_code == 200
    assert client.get("/api/decisions").status_code == 200
    assert client.post("/api/reset").status_code == 403


def _claims(**over):
    now = int(time.time())
    return {"sub": "user-1", "aud": "authenticated", "iss": f"{URL}/auth/v1", "iat": now, "exp": now + 600, **over}


def test_verifies_es256_token_from_jwks(monkeypatch):
    key = ec.generate_private_key(ec.SECP256R1())
    a = SupabaseAuth(URL, "pk")
    monkeypatch.setattr(a._jwks, "get_signing_key_from_jwt", lambda t: SimpleNamespace(key=key.public_key()))
    token = jwt.encode(_claims(), key, algorithm="ES256", headers={"kid": "k1"})
    assert a.verify(token)["sub"] == "user-1"

    other = ec.generate_private_key(ec.SECP256R1())
    with pytest.raises(jwt.InvalidSignatureError):
        a.verify(jwt.encode(_claims(), other, algorithm="ES256"))
    with pytest.raises(jwt.InvalidIssuerError):
        a.verify(jwt.encode(_claims(iss="https://evil.example/auth/v1"), key, algorithm="ES256"))


def test_hs256_needs_the_project_secret():
    token = jwt.encode(_claims(), "s" * 32, algorithm="HS256")
    with pytest.raises(jwt.InvalidTokenError):
        SupabaseAuth(URL, "pk").verify(token)
    assert SupabaseAuth(URL, "pk", "s" * 32).verify(token)["sub"] == "user-1"
    with pytest.raises(jwt.InvalidTokenError, match="unsupported"):
        SupabaseAuth(URL, "pk", "s" * 32).verify(jwt.encode(_claims(), None, algorithm="none"))


def test_required_mode_end_to_end(monkeypatch):
    secret = "s" * 32
    a = SupabaseAuth(URL, "pk", secret)
    monkeypatch.setattr(a, "caller", lambda claims, token: Caller(role="seller", user_id=claims["sub"], facility_id="F04"))
    monkeypatch.setattr(auth, "_auth", a)
    monkeypatch.setenv("SCM_AUTH", "required")

    assert client.get("/api/me").json()["role"] == "anonymous"
    good = jwt.encode(_claims(), secret, algorithm="HS256")
    me = client.get("/api/me", headers={"Authorization": f"Bearer {good}"}).json()
    assert me == {"role": "seller", "facility_id": "F04", "carrier_id": None}
    expired = jwt.encode(_claims(exp=int(time.time()) - 10), secret, algorithm="HS256")
    assert client.get("/api/me", headers={"Authorization": f"Bearer {expired}"}).status_code == 401
    assert client.get("/api/me", headers={"Authorization": "Basic abc"}).status_code == 401
