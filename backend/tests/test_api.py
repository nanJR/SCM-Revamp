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


def test_describe_falls_back_to_facts_without_llm():
    client.post("/api/reset")
    body = client.post("/api/facilities/F04/describe").json()
    assert "120" in body["description"] and "fly ash" in body["description"]
    assert client.post("/api/facilities/NOPE/describe").status_code == 404


def test_run_routes_leftover_hazardous_waste_and_mints_its_passport():
    client.post("/api/reset")
    run = client.post("/api/pipeline/run").json()
    disposals = client.get("/api/disposals").json()
    assert disposals == run["disposals"]
    approved = [d for d in disposals if d["decision"] == "APPROVED"]
    assert approved and all(d["passport"] for d in approved)
    assert all(d["site_id"] != "TSDF-HAROHALLI" for d in approved)
    deal_passports = sum(1 for i in run["items"] if i["passport"])
    assert run["minted"] == deal_passports + len(approved)
    assert any(d["action"] == "reject_site" for d in client.get("/api/decisions").json())
    assert len(client.get("/api/disposal-sites").json()) == 21
