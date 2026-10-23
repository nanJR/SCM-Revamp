"""Orchestrates one full run: pool -> match -> negotiate -> freight -> audit -> regulate -> mint.

Every agent decision is written to the decision log with its inputs, rule and
reason, so a regulator can audit why any deal was made or blocked.
"""

from __future__ import annotations

import random
from dataclasses import dataclass, field
from datetime import date
from typing import Any

from .ledger import mint
from .llm import Narrator
from .logistics import negotiate_freight, select_carrier
from .matchmaker import find_candidates, pool_micro_lots, rank_candidates
from .models import (
    Carrier,
    DecisionRecord,
    DigitalWastePassport,
    Facility,
    PipelineItemResult,
    PooledMember,
    RegulatoryDecision,
)
from .negotiation import negotiate
from .numbers import js_round, round_to
from .paperwork import build_documents, settlement
from .regulator import review_deal

ALLOCATION_TOLERANCE = 0.01


@dataclass
class RunResult:
    items: list[PipelineItemResult]
    passports: list[DigitalWastePassport]
    decisions: list[DecisionRecord] = field(default_factory=list)


async def run_pipeline(
    facilities: dict[str, Facility],
    carriers: dict[str, Carrier],
    taxonomy: dict[str, dict[str, Any]],
    chain: list[DigitalWastePassport],
    narrator: Narrator,
    as_of: date | None = None,
    rng: random.Random | None = None,
) -> RunResult:
    decisions: list[DecisionRecord] = []
    model = narrator.model_label

    def log(agent: str, action: str, subject: dict, **kw) -> None:
        decisions.append(DecisionRecord(agent=agent, action=action, subject=subject, model=model, **kw))

    pooled, membership = pool_micro_lots(facilities)
    for pool_id, members in membership.items():
        log(
            "aggregator",
            "pool_micro_lots",
            {"pool_id": pool_id},
            inputs={"members": [m.facility_id for m in members]},
            output={"volume_tons": pooled[pool_id].volume_tons_per_month},
            reason="Same-material sellers in one cluster below the pooling threshold were merged into one consignment.",
        )

    candidates = find_candidates(pooled)
    ranked = await rank_candidates(candidates, pooled, narrator)
    log(
        "matchmaker",
        "rank_candidates",
        {"candidates": len(candidates)},
        output={"shortlist": [[m.seller_id, m.buyer_id, m.route.distance_km] for m in ranked]},
        rule="Same material, within the 60 km corridor, nearest first, top 8.",
    )

    new_chain = list(chain)
    minted: list[DigitalWastePassport] = []
    items: list[PipelineItemResult] = []
    allocated: dict[str, float] = {}
    carrier_trips: dict[str, int] = {}

    for match in ranked:
        seller, buyer = pooled[match.seller_id], pooled[match.buyer_id]
        volume = min(seller.volume_tons_per_month, buyer.volume_tons_per_month)
        pair = {"seller_id": seller.id, "buyer_id": buyer.id, "material": match.material}

        neg = await negotiate(seller, buyer, match.material, volume, narrator)
        log(
            "negotiation",
            "settle_price",
            pair,
            inputs={"volume_tons": volume, "rounds": [[r.seller_ask, r.buyer_bid] for r in neg.rounds]},
            output={"outcome": neg.outcome, "price_inr_per_ton": neg.final_price_inr_per_ton},
            rule="Monotonic concession, 5 rounds, private floor and ceiling never crossed.",
            reason=neg.reason,
        )

        freight = None
        regulatory: RegulatoryDecision | None = None
        passport = None
        pooled_members = None

        if neg.outcome == "DEAL":
            carrier = select_carrier(carriers, volume, seller.hazardous)
            backhaul = bool(carrier and carrier_trips.get(carrier.id, 0) > 0)
            freight = await negotiate_freight(
                carrier,
                neg.logistics,
                buyer.cost_ceiling_inr_per_ton,
                neg.final_price_inr_per_ton,
                volume,
                match.material,
                narrator,
                backhaul,
            )
            log(
                "logistics",
                "settle_freight",
                pair,
                inputs={"carrier_id": carrier.id if carrier else None, "backhaul": backhaul},
                output={"outcome": freight.outcome, "rate_inr_per_ton_km": freight.final_rate_inr_per_ton_km},
                reason=freight.reason,
            )

            if freight.outcome == "DEAL":
                seller_headroom = seller.volume_tons_per_month - allocated.get(seller.id, 0)
                buyer_headroom = buyer.volume_tons_per_month - allocated.get(buyer.id, 0)
                if volume > seller_headroom + ALLOCATION_TOLERANCE or volume > buyer_headroom + ALLOCATION_TOLERANCE:
                    regulatory = RegulatoryDecision(
                        decision="VETOED",
                        rule_applied="Cross-Deal Allocation Audit (Auditor Agent)",
                        explanation=(
                            f"Blocked: this deal claims {volume:g} tons, but only "
                            f"{max(0, min(seller_headroom, buyer_headroom)):.1f} tons of unclaimed monthly capacity remain "
                            f"after volume already committed to other approved deals in this run (seller headroom "
                            f"{seller_headroom:.1f}t, buyer headroom {buyer_headroom:.1f}t)."
                        ),
                    )
                else:
                    regulatory = await review_deal(seller, buyer, neg, narrator, carrier, as_of)
                log(
                    "regulator",
                    "review",
                    pair,
                    output={"decision": regulatory.decision},
                    rule=regulatory.rule_applied,
                    reason=regulatory.explanation,
                )

                if regulatory.decision == "APPROVED":
                    deal: dict[str, Any] = dict(
                        seller_id=seller.id,
                        buyer_id=buyer.id,
                        material=match.material,
                        volume_tons=volume,
                        agreed_price_per_ton=neg.final_price_inr_per_ton,
                        logistics=neg.logistics.model_dump(),
                        regulatory_decision=regulatory.model_dump(exclude_none=True),
                        logistics_deal=dict(
                            carrier_id=freight.carrier_id,
                            carrier_name=freight.carrier_name,
                            vehicle_type=freight.vehicle_type,
                            agreed_rate_inr_per_ton_km=freight.final_rate_inr_per_ton_km,
                            total_freight_cost_inr=freight.total_freight_cost_inr,
                            negotiation_rounds=[r.model_dump() for r in freight.rounds],
                        ),
                    )
                    deal.update(build_documents(deal, seller, buyer, taxonomy, rng))
                    deal["settlement"] = settlement(deal["contract"]["total_invoice_inr"], rng)

                    members = membership.get(seller.id)
                    if members:
                        pooled_members = []
                        for m in members:
                            freight_share = js_round(freight.total_freight_cost_inr * m.volume_tons / volume)
                            gross = js_round((neg.final_price_inr_per_ton or 0) * m.volume_tons)
                            pooled_members.append(
                                PooledMember(
                                    facility_id=m.facility_id,
                                    facility_name=facilities[m.facility_id].name if m.facility_id in facilities else m.facility_id,
                                    volume_tons=m.volume_tons,
                                    share_pct=round_to(m.volume_tons / volume * 100, 1),
                                    freight_share_inr=freight_share,
                                    net_payout_inr=gross - freight_share,
                                )
                            )
                        deal["pooled_members"] = [p.model_dump() for p in pooled_members]

                    passport = mint(new_chain, deal)
                    new_chain.append(passport)
                    minted.append(passport)
                    log(
                        "passport_minter",
                        "mint",
                        pair,
                        output={"block_index": passport.block_index, "record_hash": passport.record_hash},
                    )
                    allocated[seller.id] = allocated.get(seller.id, 0) + volume
                    allocated[buyer.id] = allocated.get(buyer.id, 0) + volume
                    if carrier:
                        carrier_trips[carrier.id] = carrier_trips.get(carrier.id, 0) + 1

        items.append(
            PipelineItemResult(
                match=match,
                seller=seller,
                buyer=buyer,
                negotiation=neg,
                logistics_deal=freight,
                regulatory=regulatory,
                passport=passport,
                pooled_members=pooled_members,
                is_pooled_consignment=seller.id in membership,
            )
        )

    return RunResult(items=items, passports=minted, decisions=decisions)
