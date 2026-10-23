"""Disposal agent: routes hazardous waste that found no recycler to a KSPCB site.

The sites are the real TSDFs, common incinerators and cement co-processing
plants listed in the KSPCB Annual Report 2023-24 (data/kspcb_disposal_sites.json).
Unlike a recycling deal, the generator pays: a gate fee to the site plus freight.

Sites are ranked by total cost to the generator. The regulator then reviews
the cheapest one; a site that is full or not operating (Harohalli TSDF has been
full since 3 Feb 2021) is vetoed and the next one is tried.
"""

from __future__ import annotations

import json
from datetime import date
from importlib import resources

from . import constants as c
from .geo import haversine_km
from .logistics import select_carrier
from .models import Carrier, DisposalResult, DisposalSite, Facility, RejectedSite
from .numbers import js_round, round_to
from .regulator import parse_consent_date

# Indicative gate fees in INR per tonne, NOT quotes: Indian TSDFs charge a few
# thousand per tonne for stabilisation and landfill, common incinerators an
# order of magnitude more, and cement kilns little for high-calorific waste.
# Replace these with real site quotes before relying on the cost figures.
GATE_FEE_INR_PER_TON = {"tsdf": 6000, "incinerator": 25000, "co_processing": 4000}

# Which kinds of site may receive which hazardous categories (HOWM Rules 2016).
ACCEPTS = {
    "hazardous_metal_waste": {"tsdf"},
    "hazardous_chemical_waste": {"tsdf", "incinerator", "co_processing"},
    "hazardous_liquid_waste": {"incinerator", "co_processing"},
}

KIND_LABEL = {"tsdf": "TSDF", "incinerator": "common incinerator", "co_processing": "cement co-processing plant"}


def load_sites() -> list[DisposalSite]:
    raw = resources.files("scm.data").joinpath("kspcb_disposal_sites.json").read_text()
    return [DisposalSite(**s) for s in json.loads(raw)]


def road_km(f: Facility, site: DisposalSite) -> float:
    return round_to(haversine_km(f.lat, f.lon, site.lat, site.lon) * c.ROAD_CIRCUITY_FACTOR, 2)


def rank_sites(
    seller: Facility, volume_tons: float, sites: list[DisposalSite], carrier: Carrier
) -> list[tuple[DisposalSite, float, float]]:
    """Every site that may take this category, cheapest total cost first.

    Returns (site, road_km, freight_inr). Status is deliberately ignored here so
    the regulator, not the ranking, is what keeps waste out of a full site.
    """
    kinds = ACCEPTS.get(seller.material_category, set())
    out = []
    for site in sites:
        if site.kind not in kinds:
            continue
        km = road_km(seller, site)
        freight = js_round(carrier.rate_floor_inr_per_ton_km * km * volume_tons + c.FIXED_DISPATCH_FEE_INR)
        out.append((site, km, freight))
    return sorted(out, key=lambda t: GATE_FEE_INR_PER_TON[t[0].kind] * volume_tons + t[2])


def consent_problem(seller: Facility, as_of: date) -> str | None:
    xgn = seller.xgn_details
    if not xgn:
        return None
    expiry = parse_consent_date(xgn.valid_till)
    if not xgn.is_active or (expiry is not None and expiry < as_of):
        return f"KSPCB consent {xgn.consent_id} expired on {xgn.valid_till}"
    return None


def site_problem(site: DisposalSite) -> str | None:
    if site.status == "operating":
        return None
    label = "full" if site.status == "full" else "not operating"
    return f"{label}: {site.notes}" if site.notes else f"{label} per KSPCB"


def plan_disposal(
    seller: Facility,
    volume_tons: float,
    sites: list[DisposalSite],
    carriers: dict[str, Carrier],
    as_of: date,
) -> DisposalResult:
    base = dict(
        seller_id=seller.id,
        seller_name=seller.name,
        material=seller.material,
        volume_tons=volume_tons,
    )

    problem = consent_problem(seller, as_of)
    if problem:
        return DisposalResult(
            **base,
            decision="VETOED",
            rule_applied="Water Act 1974 s.25/26: generator must hold a valid consent to operate",
            explanation=f"Disposal blocked: {problem}. The unit must renew its consent before it can manifest waste out.",
        )

    carrier = select_carrier(carriers, volume_tons, hazardous=True)
    if carrier is None:
        return DisposalResult(
            **base,
            decision="VETOED",
            rule_applied="HOWM Rules 2016: transporter must hold hazardous waste transport authorisation",
            explanation=f"No authorised hazmat carrier can take {volume_tons:g} t in one trip.",
        )

    rejected: list[RejectedSite] = []
    for site, km, freight in rank_sites(seller, volume_tons, sites, carrier):
        problem = site_problem(site)
        if problem:
            rejected.append(RejectedSite(site_id=site.id, site_name=site.name, reason=problem))
            continue
        gate_fee = GATE_FEE_INR_PER_TON[site.kind]
        return DisposalResult(
            **base,
            site_id=site.id,
            site_name=site.name,
            site_kind=site.kind,
            road_km=km,
            carrier_id=carrier.id,
            carrier_name=carrier.name,
            gate_fee_inr_per_ton=gate_fee,
            freight_inr=freight,
            total_cost_inr=js_round(gate_fee * volume_tons + freight),
            decision="APPROVED",
            rule_applied=c.HAZARD_RULES.get(seller.material, c.DEFAULT_RULE),
            explanation=(
                f"No recycler took this lot, so it goes to the {KIND_LABEL[site.kind]} {site.name} "
                f"({km:g} km), the cheapest operating site for {seller.material.replace('_', ' ')}. "
                f"The generator pays the gate fee and freight under a Form 10 manifest."
            ),
            rejected_sites=rejected,
        )

    return DisposalResult(
        **base,
        decision="VETOED",
        rule_applied="HOWM Rules 2016: waste may only go to an operating authorised facility",
        explanation="No operating KSPCB-authorised site accepts this category.",
        rejected_sites=rejected,
    )
