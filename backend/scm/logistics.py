"""Logistics agent: carrier selection and freight-rate negotiation."""

from __future__ import annotations

from . import constants as c
from .llm import Narrator
from .models import Carrier, FreightNegotiationResult, FreightNegotiationRound, RouteFeasibility
from .negotiation import run_concession
from .numbers import js_round, round_to


def select_carrier(carriers: dict[str, Carrier], volume_tons: float, hazardous: bool) -> Carrier | None:
    """Smallest vehicle that fits the load (and holds a hazmat licence if needed)."""
    eligible = [
        x for x in carriers.values() if x.capacity_tons >= volume_tons and (not hazardous or x.hazmat_transport_license)
    ]
    return min(eligible, key=lambda x: x.capacity_tons) if eligible else None


def _no_carrier(carrier: Carrier | None, reason: str, rounds=None) -> FreightNegotiationResult:
    return FreightNegotiationResult(
        carrier_id=carrier.id if carrier else None,
        carrier_name=carrier.name if carrier else None,
        vehicle_type=carrier.vehicle_type if carrier else None,
        outcome="NO_CARRIER",
        final_rate_inr_per_ton_km=None,
        total_freight_cost_inr=None,
        reason=reason,
        rounds=rounds or [],
    )


async def negotiate_freight(
    carrier: Carrier | None,
    route: RouteFeasibility,
    buyer_ceiling_inr_per_ton: float,
    agreed_price_inr_per_ton: float,
    volume_tons: float,
    material: str,
    narrator: Narrator,
    is_backhaul: bool = False,
) -> FreightNegotiationResult:
    if carrier is None:
        return _no_carrier(
            None,
            "No eligible carrier: no registered fleet operator has sufficient capacity (or hazmat transport license) for this consignment.",
        )

    distance = route.distance_km
    # A truck hired for a 100 m hop still costs a minimum trip. Without this the
    # per-km budget explodes as distance -> 0 (0.11 km gave INR 1147/ton-km).
    billable_km = max(distance, c.MIN_BILLABLE_KM)
    headroom_per_ton = buyer_ceiling_inr_per_ton - agreed_price_inr_per_ton
    headroom_per_ton_km = headroom_per_ton / billable_km
    floor = (
        round_to(carrier.rate_floor_inr_per_ton_km * c.BACKHAUL_DISCOUNT_FACTOR, 2)
        if is_backhaul
        else carrier.rate_floor_inr_per_ton_km
    )
    ceiling = headroom_per_ton_km

    if ceiling <= floor:
        return _no_carrier(
            carrier,
            f"Buyer's remaining budget headroom (INR {headroom_per_ton:.2f}/ton over {billable_km:g} billable km, approx. INR "
            f"{headroom_per_ton_km:.2f}/ton-km) cannot meet {carrier.name}'s minimum freight rate (INR {floor:g}/ton-km).",
        )

    concession = run_concession(floor, ceiling)
    last_round = concession.rounds[-1][0]
    rounds: list[FreightNegotiationRound] = []
    for r, ask, bid in concession.rounds:
        carrier_note = f"Round {r}: carrier holding at INR {ask}/ton-km to cover fuel and vehicle utilization costs."
        shipper_note = f"Round {r}: shipper bidding INR {bid}/ton-km, bounded by remaining material-price margin."
        settles = concession.outcome == "DEAL" and r == last_round
        if r == 1 or settles or r == c.NEGOTIATION_MAX_ROUNDS:
            carrier_note = await narrator.say(
                "You are the Carrier agent in a B2B freight-rate negotiation. In ONE short sentence, justify your freight rate offer. Be concise and factual.",
                f"Round {r}: quoting INR {ask}/ton-km to move {material} over {distance:g}km. Floor is INR {floor:g}/ton-km.",
                carrier_note,
                60,
            )
            shipper_note = await narrator.say(
                "You are the Shipper / Logistics Coordinator agent in a B2B freight-rate negotiation. In ONE short sentence, justify your freight bid. Be concise and factual.",
                f"Round {r}: bidding INR {bid}/ton-km for {material} over {distance:g}km. Ceiling is INR {ceiling:.2f}/ton-km.",
                shipper_note,
                60,
            )
        rounds.append(
            FreightNegotiationRound(
                round=r,
                carrier_ask_inr_per_ton_km=ask,
                shipper_bid_inr_per_ton_km=bid,
                carrier_note=carrier_note,
                shipper_note=shipper_note,
            )
        )

    if concession.outcome == "NO_DEAL":
        return _no_carrier(
            carrier,
            f"No freight rate overlap within {c.NEGOTIATION_MAX_ROUNDS} rounds (carrier floor INR {floor:g}/ton-km vs "
            f"shipper ceiling INR {ceiling:.2f}/ton-km).",
            rounds,
        )

    rate = concession.final_value
    return FreightNegotiationResult(
        carrier_id=carrier.id,
        carrier_name=carrier.name,
        vehicle_type=carrier.vehicle_type,
        outcome="DEAL",
        final_rate_inr_per_ton_km=rate,
        total_freight_cost_inr=js_round(rate * billable_km * volume_tons + c.FIXED_DISPATCH_FEE_INR),
        reason=None,
        rounds=rounds,
    )
