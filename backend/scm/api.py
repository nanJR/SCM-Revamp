"""FastAPI app. Endpoint paths match the hackathon Express server so the
existing React screens keep working while they are rebuilt."""

from __future__ import annotations

import os
import random
from typing import Any, Optional

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel

from . import constants as c
from .ledger import verify
from .llm import Narrator
from .models import Facility, SensorReading
from .pipeline import run_pipeline
from .numbers import js_round, round_to
from .store import load_seed, make_store

app = FastAPI(title="SCM ReVamp API", version="0.1.0")
app.add_middleware(
    CORSMiddleware,
    allow_origins=os.environ.get("SCM_CORS_ORIGINS", "http://localhost:5173").split(","),
    allow_methods=["*"],
    allow_headers=["*"],
)

store = make_store()
narrator = Narrator()

CLUSTER_COORDS = {k: tuple(v) for k, v in load_seed()["clusters"].items()}


class SensorUpdate(BaseModel):
    facility_id: str
    moisture_pct: float
    contamination_flag: bool


class NewFacility(BaseModel):
    id: Optional[str] = None
    name: str
    role: str = "seller"
    cluster: str = "Peenya"
    material: str = "recycled_concrete_aggregate"
    volume_tons_per_month: float = 100
    cost_floor_inr_per_ton: Optional[float] = None
    cost_ceiling_inr_per_ton: Optional[float] = None
    hazardous: bool = False
    certified_hazard_handler: Optional[bool] = None
    gstin: Optional[str] = None
    kspcb_consent_id: Optional[str] = None


@app.get("/api/health")
def health() -> dict[str, Any]:
    return {"status": "ok", "llm": narrator.model_label, "store": type(store).__name__}


@app.get("/api/facilities")
def facilities() -> dict[str, Facility]:
    return store.facilities()


@app.get("/api/carriers")
def carriers():
    return store.carriers()


@app.post("/api/facilities/add")
def add_facility(body: NewFacility) -> Facility:
    rnd = random.randint(100, 999)
    lat, lon = CLUSTER_COORDS.get(body.cluster, CLUSTER_COORDS["Peenya"])
    seller = body.role != "buyer"
    tax = store.taxonomy.get(body.material, {})
    consent = body.kspcb_consent_id or f"KSPCB/XGN/BNG/{rnd}/2024"
    facility = Facility(
        id=(body.id or "").strip() or f"FAC-BLR-{rnd}",
        name=body.name,
        role="seller" if seller else "buyer",
        cluster=body.cluster,
        lat=lat + (random.random() - 0.5) * 0.015,
        lon=lon + (random.random() - 0.5) * 0.015,
        material=body.material,
        material_category=tax.get("category", "inert_mineral_aggregate"),
        hazardous=body.hazardous,
        certified_hazard_handler=body.certified_hazard_handler if body.certified_hazard_handler is not None else body.hazardous,
        volume_tons_per_month=body.volume_tons_per_month,
        cost_floor_inr_per_ton=(body.cost_floor_inr_per_ton or 450) if seller else None,
        cost_ceiling_inr_per_ton=None if seller else (body.cost_ceiling_inr_per_ton or 850),
        gstin=body.gstin or f"29AABC{rnd}1Z5",
        kspcb_consent_id=consent,
        xgn_details=dict(
            consent_id=consent,
            consent_type="Red-CFO" if body.hazardous else "Orange-CFO",
            valid_till="2027-03-31",
            is_active=True,
            authorized_monthly_quota_tons=js_round(body.volume_tons_per_month * 1.5),
            current_month_consumed_tons=js_round(body.volume_tons_per_month * 0.15),
            category="Red Category (High Impact)" if body.hazardous else "Orange Category (Medium Impact)",
        ),
    )
    return store.upsert_facility(facility)


@app.post("/api/facilities/sensor")
def sensor(body: SensorUpdate) -> Facility:
    facility = store.facilities().get(body.facility_id)
    if facility is None:
        raise HTTPException(404, "Facility not found")
    reading = SensorReading(moisture_pct=body.moisture_pct, contamination_flag=body.contamination_flag)
    facility.sensor_adjustment = reading
    if reading.contamination_flag:
        facility.volume_tons_per_month = round_to(facility.volume_tons_per_month * 0.5, 1)
    elif reading.moisture_pct > c.MOISTURE_PENALTY_THRESHOLD_PCT and facility.role == "seller" and facility.cost_floor_inr_per_ton:
        facility.cost_floor_inr_per_ton = js_round(facility.cost_floor_inr_per_ton * 0.85)
    store.record_sensor(facility.id, reading)
    return store.upsert_facility(facility)


@app.post("/api/facilities/{facility_id}/describe")
async def describe(facility_id: str) -> dict[str, str]:
    f = store.facilities().get(facility_id)
    if f is None:
        raise HTTPException(404, "Facility not found")
    material = f.material.replace("_", " ")
    seller = f.role == "seller"
    price = f.cost_floor_inr_per_ton if seller else f.cost_ceiling_inr_per_ton
    xgn = f.xgn_details
    quota = (
        f"KSPCB quota {xgn.authorized_monthly_quota_tons} t/month, {xgn.current_month_consumed_tons} t used, "
        f"consent valid till {xgn.valid_till}"
        if xgn
        else "standard consent"
    )
    facts = (
        f"{f.name} in {f.cluster}, Karnataka. {'Generates' if seller else 'Takes in'} "
        f"{f.volume_tons_per_month} t/month of {material}. "
        f"{'Floor' if seller else 'Ceiling'} price: {price if price is not None else 'negotiable'} INR/t. "
        f"{'Hazardous (Form 10 manifest needed)' if f.hazardous else 'Non-hazardous'}. {quota}."
    )
    text = await narrator.say(
        "You are the plant operations lead at this facility. In two short first-person paragraphs, describe "
        "what is happening on the floor with this material and your commercial and permit position. "
        "Use only the facts given; do not invent numbers.",
        facts,
        fallback=facts,
        max_tokens=400,
    )
    return {"id": facility_id, "description": text}


@app.post("/api/pipeline/run")
async def run() -> dict[str, Any]:
    result = await run_pipeline(store.facilities(), store.carriers(), store.taxonomy, store.passports(), narrator)
    store.append_passports(result.passports)
    items = [i.model_dump(mode="json") for i in result.items]
    run_id = store.record_run(items, result.decisions)
    return {"run_id": run_id, "items": items, "minted": len(result.passports)}


@app.get("/api/pipeline/results")
def results() -> list[dict[str, Any]]:
    latest = store.latest_run()
    return latest["items"] if latest else []


@app.get("/api/decisions")
def decisions(limit: int = 200) -> list[dict[str, Any]]:
    return store.decisions(limit)


@app.get("/api/ledger")
def ledger() -> dict[str, Any]:
    chain = store.passports()
    return {"passports": [p.model_dump() for p in chain], "verification": verify(chain).model_dump()}


@app.get("/api/ledger/verify")
def ledger_verify():
    return verify(store.passports())


@app.post("/api/reset")
def reset() -> dict[str, str]:
    store.reset()
    return {"status": "reset"}
