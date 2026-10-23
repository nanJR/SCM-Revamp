"""Persistence. InMemoryStore serves tests and offline demos; SupabaseStore is
the production store (see supabase/migrations for the schema).

Pick one with SCM_STORE=memory|supabase.
"""

from __future__ import annotations

import json
import os
from datetime import datetime, timezone
from importlib import resources
from typing import Any, Protocol

import httpx

from .models import Carrier, DecisionRecord, DigitalWastePassport, Facility, SensorReading


def load_seed() -> dict[str, Any]:
    return json.loads(resources.files("scm.data").joinpath("legacy_seed.json").read_text("utf-8"))


class Store(Protocol):
    taxonomy: dict[str, dict[str, Any]]

    def facilities(self) -> dict[str, Facility]: ...
    def carriers(self) -> dict[str, Carrier]: ...
    def upsert_facility(self, facility: Facility) -> Facility: ...
    def record_sensor(self, facility_id: str, reading: SensorReading) -> None: ...
    def passports(self) -> list[DigitalWastePassport]: ...
    def append_passports(self, blocks: list[DigitalWastePassport]) -> None: ...
    def record_run(self, items: list[dict[str, Any]], decisions: list[DecisionRecord]) -> str: ...
    def reset(self) -> None: ...


class InMemoryStore:
    def __init__(self) -> None:
        self.reset()

    def reset(self) -> None:
        seed = load_seed()
        self.taxonomy = seed["taxonomy"]
        self._facilities = {k: Facility(**v) for k, v in seed["facilities"].items()}
        self._carriers = {k: Carrier(**v) for k, v in seed["carriers"].items()}
        self._passports: list[DigitalWastePassport] = []
        self.runs: list[dict[str, Any]] = []
        self.sensor_log: list[dict[str, Any]] = []

    def facilities(self) -> dict[str, Facility]:
        return {k: v.model_copy(deep=True) for k, v in self._facilities.items()}

    def carriers(self) -> dict[str, Carrier]:
        return dict(self._carriers)

    def upsert_facility(self, facility: Facility) -> Facility:
        self._facilities[facility.id] = facility
        return facility

    def record_sensor(self, facility_id: str, reading: SensorReading) -> None:
        self.sensor_log.append({"facility_id": facility_id, **reading.model_dump()})

    def passports(self) -> list[DigitalWastePassport]:
        return list(self._passports)

    def append_passports(self, blocks: list[DigitalWastePassport]) -> None:
        self._passports.extend(blocks)

    def record_run(self, items: list[dict[str, Any]], decisions: list[DecisionRecord]) -> str:
        run_id = f"run-{len(self.runs) + 1}"
        rows = [{**d.model_dump(), "run_id": run_id} for d in decisions]
        self.runs.append({"id": run_id, "items": items, "decisions": rows})
        return run_id

    def latest_run(self) -> dict[str, Any] | None:
        return self.runs[-1] if self.runs else None

    def decisions(self, limit: int = 200) -> list[dict[str, Any]]:
        # Newest first, like the Supabase store.
        out = [d for r in self.runs for d in r["decisions"]]
        return out[::-1][:limit]


class SupabaseStore:
    """Talks to Supabase's PostgREST API with the service-role key.

    The service role bypasses row-level security, so this class must only run
    server-side. Browsers use the anon key and are limited by RLS policies.
    """

    def __init__(self, url: str | None = None, service_key: str | None = None) -> None:
        url = url or os.environ["SUPABASE_URL"]
        key = service_key or os.environ["SUPABASE_SERVICE_ROLE_KEY"]
        self._http = httpx.Client(
            base_url=f"{url.rstrip('/')}/rest/v1",
            headers={"apikey": key, "Authorization": f"Bearer {key}", "Content-Type": "application/json"},
            timeout=20,
        )
        self.taxonomy = {
            m["code"]: {
                "category": m["category"],
                "hazard": m["hazardous"],
                "standardNote": m["standard_note"],
                "hsnCode": m["hsn_code"],
                "defaultGstRate": float(m["gst_rate_pct"]),
            }
            for m in self._get("materials", select="*")
        }

    def _get(self, table: str, **params: str) -> list[dict[str, Any]]:
        resp = self._http.get(f"/{table}", params=params)
        resp.raise_for_status()
        return resp.json()

    def _post(self, table: str, rows: list[dict[str, Any]] | dict[str, Any], prefer: str = "return=representation"):
        resp = self._http.post(f"/{table}", json=rows, headers={"Prefer": prefer})
        resp.raise_for_status()
        return resp.json() if resp.content else None

    def facilities(self) -> dict[str, Facility]:
        return {r["doc"]["id"]: Facility(**r["doc"]) for r in self._get("facility_docs", select="doc")}

    def carriers(self) -> dict[str, Carrier]:
        return {r["doc"]["id"]: Carrier(**r["doc"]) for r in self._get("carrier_docs", select="doc")}

    def upsert_facility(self, facility: Facility) -> Facility:
        resp = self._http.post("/rpc/upsert_facility_doc", json={"doc": facility.model_dump(exclude_none=True)})
        resp.raise_for_status()
        return facility

    def record_sensor(self, facility_id: str, reading: SensorReading) -> None:
        self._post(
            "sensor_readings",
            {"facility_id": facility_id, "moisture_pct": reading.moisture_pct, "contamination": reading.contamination_flag},
            prefer="return=minimal",
        )

    def passports(self) -> list[DigitalWastePassport]:
        rows = self._get("passports", select="block_index,deal,issued_at,prev_hash,record_hash", order="block_index.asc")
        return [DigitalWastePassport(**r) for r in rows]

    def append_passports(self, blocks: list[DigitalWastePassport]) -> None:
        if blocks:
            self._post("passports", [b.model_dump() for b in blocks], prefer="return=minimal")

    def record_run(self, items: list[dict[str, Any]], decisions: list[DecisionRecord]) -> str:
        run = self._post("pipeline_runs", {"finished_at": datetime.now(timezone.utc).isoformat(), "items": items})[0]
        if decisions:
            self._post(
                "decision_log", [{"run_id": run["id"], **d.model_dump()} for d in decisions], prefer="return=minimal"
            )
        return run["id"]

    def latest_run(self) -> dict[str, Any] | None:
        rows = self._get("pipeline_runs", select="id,items", order="started_at.desc", limit="1")
        return rows[0] if rows else None

    def decisions(self, limit: int = 200) -> list[dict[str, Any]]:
        return self._get("decision_log", select="*", order="id.desc", limit=str(limit))

    def reset(self) -> None:
        # Restores seed facilities only; passports and decisions are append-only.
        resp = self._http.post("/rpc/reset_seed_facilities", json={})
        resp.raise_for_status()


def make_store() -> Store:
    return SupabaseStore() if os.environ.get("SCM_STORE", "memory") == "supabase" else InMemoryStore()
