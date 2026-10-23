"""The Python port must make the same decisions as the TypeScript engine.

tests/golden/legacy_pipeline.json was produced by running the hackathon
engine (nanJR/SCM-Bit-N-Build-26, commit b3644b2) on its seed data with no LLM
key. Random document numbers and LLM text are excluded; every price, round,
route figure, carrier and regulatory verdict is compared.
"""

import json
from datetime import date
from pathlib import Path

import pytest

from scm import constants as c
from scm.llm import Narrator
from scm.matchmaker import find_candidates, pool_micro_lots
from scm.pipeline import run_pipeline
from scm.store import InMemoryStore

GOLDEN = json.loads((Path(__file__).parent / "golden" / "legacy_pipeline.json").read_text())
LEGACY_AS_OF = date(2026, 9, 12)  # the date hard-coded in the TS regulator

# Deliberate departure from the legacy engine: trips shorter than
# MIN_BILLABLE_KM are billed as a minimum trip (see tests/test_logistics.py).
# Legacy priced the 0.11 km F04 -> F10 hop at INR 1147/ton-km. For those trips
# the freight figures are left out of the comparison; everything else must match.
FREIGHT_KEYS = ("freight_share_inr", "net_payout_inr")


def _drop_freight(item: dict) -> dict:
    members = item["pooled_members"]
    if members:
        members = [{k: v for k, v in m.items() if k not in FREIGHT_KEYS} for m in members]
    return {**item, "freight": None, "pooled_members": members}


@pytest.fixture
def store():
    return InMemoryStore()


def test_candidate_set_matches(store):
    pooled, _ = pool_micro_lots(store.facilities())
    got = [[m.seller_id, m.buyer_id, m.route.distance_km, m.quality_check.compatible] for m in find_candidates(pooled)]
    assert got == GOLDEN["all_candidates"]


async def test_pipeline_matches_legacy(store):
    result = await run_pipeline(
        store.facilities(), store.carriers(), store.taxonomy, [], Narrator("none"), as_of=LEGACY_AS_OF
    )
    assert len(result.items) == len(GOLDEN["items"])

    for item, want in zip(result.items, GOLDEN["items"]):
        route = item.match.route
        got = dict(
            seller_id=item.match.seller_id,
            buyer_id=item.match.buyer_id,
            material=item.match.material,
            distance_km=route.distance_km,
            volume=item.negotiation.volume_tons,
            route=dict(
                transport_cost_total_inr=route.transport_cost_total_inr,
                co2_avoided_kg=route.co2_avoided_kg,
                co2_transport_kg=route.co2_transport_kg,
                net_co2_impact_kg=route.net_co2_impact_kg,
                pm10_avoided_kg=route.pm10_avoided_kg,
                so2_avoided_kg=route.so2_avoided_kg,
                corridor=route.corridor.corridor_name,
            ),
            quality=dict(compatible=item.match.quality_check.compatible, penalty=item.match.quality_check.penalty_discount_pct),
            negotiation=dict(
                outcome=item.negotiation.outcome,
                final=item.negotiation.final_price_inr_per_ton,
                rounds=[[r.seller_ask, r.buyer_bid] for r in item.negotiation.rounds],
                quality_adj=item.negotiation.quality_adjustment_applied,
            ),
            freight=None
            if item.logistics_deal is None
            else dict(
                outcome=item.logistics_deal.outcome,
                carrier=item.logistics_deal.carrier_id,
                rate=item.logistics_deal.final_rate_inr_per_ton_km,
                total=item.logistics_deal.total_freight_cost_inr,
                rounds=[[r.carrier_ask_inr_per_ton_km, r.shipper_bid_inr_per_ton_km] for r in item.logistics_deal.rounds],
            ),
            regulatory=None
            if item.regulatory is None
            else dict(decision=item.regulatory.decision, rule=item.regulatory.rule_applied),
            passport=item.passport is not None,
            contract_total=item.passport.deal["contract"]["total_invoice_inr"] if item.passport else None,
            pooled=item.is_pooled_consignment,
            pooled_members=[p.model_dump() for p in item.pooled_members] if item.pooled_members else None,
        )
        if want["distance_km"] < c.MIN_BILLABLE_KM:
            got, want = _drop_freight(got), _drop_freight(want)
        assert got == want, f"{want['seller_id']} -> {want['buyer_id']}"
