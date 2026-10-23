"""Buyer and seller negotiation agents.

The concession maths is deterministic, so a negotiation always ends within a
fixed number of rounds and never crosses either side's private limit. The LLM
only writes the per-round justification text.
"""

from __future__ import annotations

from dataclasses import dataclass

from . import constants as c
from .geo import validate_route
from .llm import Narrator
from .models import Facility, NegotiationResult, NegotiationRound
from .numbers import js_round
from .quality import check_assay


@dataclass
class ConcessionOutcome:
    outcome: str
    final_value: int | None
    rounds: list[tuple[int, int, int]]  # (round, ask, bid)


def run_concession(
    floor: float,
    ceiling: float,
    opening_ask_multiplier: float = c.OPENING_ASK_MULTIPLIER,
    opening_bid_multiplier: float = c.OPENING_BID_MULTIPLIER,
    max_rounds: int = c.NEGOTIATION_MAX_ROUNDS,
) -> ConcessionOutcome:
    """Monotonic concession: each side closes half the opening gap's step per round,
    clamped at its own private floor or ceiling."""
    ask = floor * opening_ask_multiplier
    bid = ceiling * opening_bid_multiplier
    step = max(ask - bid, 0) / max(max_rounds - 1, 1)

    rounds: list[tuple[int, int, int]] = []
    for r in range(1, max_rounds + 1):
        rounds.append((r, js_round(ask), js_round(bid)))
        if bid >= ask:
            return ConcessionOutcome("DEAL", js_round((ask + bid) / 2), rounds)
        ask = max(floor, ask - step / 2)
        bid = min(ceiling, bid + step / 2)
    return ConcessionOutcome("NO_DEAL", None, rounds)


async def negotiate(
    seller: Facility, buyer: Facility, material: str, volume_tons: float, narrator: Narrator
) -> NegotiationResult:
    floor = seller.cost_floor_inr_per_ton
    ceiling = buyer.cost_ceiling_inr_per_ton
    route = validate_route(seller, buyer, volume_tons)
    quality = check_assay(seller, buyer)

    if floor is None or ceiling is None:
        return NegotiationResult(
            seller_id=seller.id,
            buyer_id=buyer.id,
            material=material,
            volume_tons=volume_tons,
            outcome="NO_DEAL",
            final_price_inr_per_ton=None,
            reason="Missing private cost data for one party.",
            rounds=[],
            logistics=route,
        )

    adjustment = quality.penalty_discount_pct
    if adjustment > 0:
        floor = js_round(floor * (1 - adjustment / 100))
        ceiling = js_round(ceiling * (1 - adjustment / 100))

    concession = run_concession(floor, ceiling)
    last_round = concession.rounds[-1][0]
    rounds: list[NegotiationRound] = []
    for r, ask, bid in concession.rounds:
        seller_note = f"Round {r}: seller conceding to INR {ask}/ton towards buyer bid while protecting operating margins."
        buyer_note = f"Round {r}: buyer advancing bid to INR {bid}/ton to bridge spread against virgin material ceiling."
        settles = concession.outcome == "DEAL" and r == last_round
        if r == 1 or settles or r == c.NEGOTIATION_MAX_ROUNDS:
            penalty_note = f" Note: {adjustment:g}% quality deduction applied." if adjustment > 0 else ""
            seller_note = await narrator.say(
                "You are the Seller agent in a B2B waste-material negotiation. In ONE short sentence, justify your price offer. Be concise and factual.",
                f"Round {r}: offering INR {ask}/ton for {material}. Floor is INR {floor:g}/ton.{penalty_note}",
                seller_note,
                60,
            )
            buyer_note = await narrator.say(
                "You are the Buyer agent in a B2B waste-material negotiation. In ONE short sentence, justify your price offer. Be concise and factual.",
                f"Round {r}: bidding INR {bid}/ton for {material}. Ceiling is INR {ceiling:g}/ton.",
                buyer_note,
                60,
            )
        rounds.append(NegotiationRound(round=r, seller_ask=ask, buyer_bid=bid, seller_note=seller_note, buyer_note=buyer_note))

    reason = None
    if concession.outcome == "NO_DEAL":
        reason = (
            f"No overlap within {c.NEGOTIATION_MAX_ROUNDS} rounds (seller floor INR {floor:g}/ton vs buyer "
            f"ceiling INR {ceiling:g}/ton too far apart)."
        )

    return NegotiationResult(
        seller_id=seller.id,
        buyer_id=buyer.id,
        material=material,
        volume_tons=volume_tons,
        outcome=concession.outcome,
        final_price_inr_per_ton=concession.final_value,
        reason=reason,
        rounds=rounds,
        logistics=route,
        quality_adjustment_applied=adjustment if adjustment > 0 else None,
    )
