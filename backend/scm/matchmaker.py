"""Matchmaker agent: micro-lot pooling, candidate search and ranking."""

from __future__ import annotations

from dataclasses import dataclass

from . import constants as c
from .geo import validate_route
from .llm import Narrator
from .models import CandidateMatch, Facility
from .numbers import js_round, round_to
from .quality import check_assay


@dataclass
class PoolMembership:
    facility_id: str
    volume_tons: float
    cost_floor_inr_per_ton: float


def pool_micro_lots(
    facilities: dict[str, Facility],
) -> tuple[dict[str, Facility], dict[str, list[PoolMembership]]]:
    """Merge small same-material, same-cluster sellers into one consignment.

    Fragmented MSME micro-lots of a few tonnes each cannot carry a truck's
    fixed costs alone. Pooled, they clear the same freight and regulatory
    pipeline as one viable shipment, and payouts are split back pro rata.
    """
    groups: dict[tuple[str, str], list[Facility]] = {}
    for f in facilities.values():
        if f.role != "seller" or f.volume_tons_per_month >= c.POOLING_VOLUME_THRESHOLD_TONS:
            continue
        groups.setdefault((f.material, f.cluster), []).append(f)

    pooled = dict(facilities)
    membership: dict[str, list[PoolMembership]] = {}

    for (material, cluster), members in groups.items():
        if len(members) < 2:
            continue
        total = round_to(sum(m.volume_tons_per_month for m in members), 2)
        weighted_floor = sum((m.cost_floor_inr_per_ton or 0) * m.volume_tons_per_month for m in members) / total
        pool_id = f"POOL-{material}-{cluster}".upper()
        template = members[0]
        for m in members:
            del pooled[m.id]

        xgn = None
        if template.xgn_details:
            xgn = template.xgn_details.model_copy(
                update=dict(
                    authorized_monthly_quota_tons=round_to(
                        sum(m.xgn_details.authorized_monthly_quota_tons for m in members if m.xgn_details), 2
                    ),
                    current_month_consumed_tons=round_to(
                        sum(m.xgn_details.current_month_consumed_tons for m in members if m.xgn_details), 2
                    ),
                )
            )

        pooled[pool_id] = template.model_copy(
            update=dict(
                id=pool_id,
                name=f"Pooled Micro-Lot Consignment: {len(members)} MSMEs ({cluster})",
                lat=sum(m.lat for m in members) / len(members),
                lon=sum(m.lon for m in members) / len(members),
                volume_tons_per_month=total,
                cost_floor_inr_per_ton=js_round(weighted_floor),
                lab_assay=None,
                sensor_adjustment=None,
                xgn_details=xgn,
            )
        )
        membership[pool_id] = [
            PoolMembership(m.id, m.volume_tons_per_month, m.cost_floor_inr_per_ton or 0) for m in members
        ]

    return pooled, membership


def find_candidates(facilities: dict[str, Facility]) -> list[CandidateMatch]:
    sellers = [f for f in facilities.values() if f.role == "seller"]
    buyers = [f for f in facilities.values() if f.role == "buyer"]
    out: list[CandidateMatch] = []
    for s in sellers:
        for b in buyers:
            if s.material != b.material:
                continue
            route = validate_route(s, b, min(s.volume_tons_per_month, b.volume_tons_per_month))
            if route.feasible:
                out.append(
                    CandidateMatch(
                        seller_id=s.id,
                        buyer_id=b.id,
                        material=s.material,
                        route=route,
                        quality_check=check_assay(s, b),
                    )
                )
    return out


async def rank_candidates(
    candidates: list[CandidateMatch], facilities: dict[str, Facility], narrator: Narrator, limit: int = 8
) -> list[CandidateMatch]:
    """Nearest-first ranking (legacy behaviour; phase 2 replaces it with a MILP)."""
    ranked = sorted(candidates, key=lambda m: m.route.distance_km)[:limit]
    for m in ranked:
        s, b = facilities[m.seller_id], facilities[m.buyer_id]
        fallback = (
            f"{s.name} and {b.name} trade {m.material.replace('_', ' ')} over {m.route.distance_km:g} km "
            f"via {m.route.corridor.corridor_name}, avoiding {m.route.net_co2_impact_kg:g} kg CO2 net."
        )
        m.justification = await narrator.say(
            "You are the Matchmaker Agent in an industrial symbiosis network. In one short sentence, explain why this pairing makes sense. Be concrete and factual.",
            f"Seller: {s.name} produces {s.material} ({s.volume_tons_per_month:g} tons/month). Buyer: {b.name} needs "
            f"{b.material}. Distance: {m.route.distance_km:g}km. CO2 impact estimate: {m.route.net_co2_impact_kg:g}kg net. "
            f"Corridor: {m.route.corridor.corridor_name}.",
            fallback,
        )
    return ranked
