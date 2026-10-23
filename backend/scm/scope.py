"""Cut API responses down to what the caller's role may see.

Staff (regulator, admin) see everything. A seller or buyer sees deals, disposals
and passports their linked facility is party to, including pooled lots. A
carrier sees the deals it hauls. Price floors and ceilings are private to the
facility that set them, as in the facility_private table.
"""

from __future__ import annotations

from typing import Any

from .auth import Caller

PRICE_FIELDS = ("cost_floor_inr_per_ton", "cost_ceiling_inr_per_ton")


def hide_prices(f: dict[str, Any], caller: Caller) -> dict[str, Any]:
    if caller.staff or f.get("id") == caller.facility_id:
        return f
    return {**f, **{k: None for k in PRICE_FIELDS}}


def _carrier_of(obj: dict[str, Any] | None) -> str | None:
    return (obj or {}).get("carrier_id")


def _party(caller: Caller, facility_ids: set[str], carrier_id: str | None) -> bool:
    if caller.staff:
        return True
    if caller.facility_id and caller.facility_id in facility_ids:
        return True
    return bool(caller.carrier_id) and caller.carrier_id == carrier_id


def _pool_ids(members: list[dict[str, Any]] | None) -> set[str]:
    return {m["facility_id"] for m in members or []}


def scope_items(items: list[dict[str, Any]], caller: Caller) -> list[dict[str, Any]]:
    out = []
    for item in items:
        ids = {item["seller"]["id"], item["buyer"]["id"]} | _pool_ids(item.get("pooled_members"))
        if not _party(caller, ids, _carrier_of(item.get("logistics_deal"))):
            continue
        out.append({**item, "seller": hide_prices(item["seller"], caller), "buyer": hide_prices(item["buyer"], caller)})
    return out


def scope_disposals(disposals: list[dict[str, Any]], caller: Caller) -> list[dict[str, Any]]:
    return [d for d in disposals if _party(caller, {d["seller_id"]}, d.get("carrier_id"))]


def scope_passports(passports: list[dict[str, Any]], caller: Caller) -> list[dict[str, Any]]:
    out = []
    for p in passports:
        deal = p["deal"]
        ids = {deal["seller_id"], deal.get("buyer_id")} | _pool_ids(deal.get("pooled_members"))
        if _party(caller, ids - {None}, _carrier_of(deal.get("logistics_deal"))):
            out.append(p)
    return out
