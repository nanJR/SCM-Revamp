from fastapi.testclient import TestClient

from scm.api import app

client = TestClient(app)


def test_health():
    body = client.get("/api/health").json()
    assert body["status"] == "ok"
    assert body["llm"] == "deterministic-template"


def test_run_pipeline_mints_verifiable_passports_and_logs_decisions():
    client.post("/api/reset")
    run = client.post("/api/pipeline/run").json()
    assert run["minted"] > 0

    ledger = client.get("/api/ledger").json()
    assert ledger["verification"]["valid"]
    assert len(ledger["passports"]) == run["minted"]

    decisions = client.get("/api/decisions").json()
    agents = {d["agent"] for d in decisions}
    assert {"matchmaker", "negotiation", "logistics", "regulator", "passport_minter"} <= agents

    # A second run appends to the same chain instead of wiping it.
    client.post("/api/pipeline/run")
    ledger2 = client.get("/api/ledger").json()
    assert len(ledger2["passports"]) == 2 * run["minted"]
    assert ledger2["verification"]["valid"]


def test_contamination_halves_usable_volume():
    client.post("/api/reset")
    before = client.get("/api/facilities").json()["F04"]["volume_tons_per_month"]
    after = client.post(
        "/api/facilities/sensor", json={"facility_id": "F04", "moisture_pct": 10, "contamination_flag": True}
    ).json()
    assert after["volume_tons_per_month"] == before / 2


def test_add_facility():
    client.post("/api/reset")
    f = client.post("/api/facilities/add", json={"name": "Test Precast", "role": "buyer", "cluster": "Bidadi"}).json()
    assert f["cost_ceiling_inr_per_ton"] == 850
    assert f["id"] in client.get("/api/facilities").json()
