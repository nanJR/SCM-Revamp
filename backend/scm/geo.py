"""Distance, corridor and route-feasibility calculations."""

from __future__ import annotations

import math

from . import constants as c
from .models import Facility, LogisticsCorridor, RouteFeasibility
from .numbers import js_round, round_to


def haversine_km(lat1: float, lon1: float, lat2: float, lon2: float) -> float:
    r = 6371.0
    phi1 = math.radians(lat1)
    phi2 = math.radians(lat2)
    dphi = math.radians(lat2 - lat1)
    dlambda = math.radians(lon2 - lon1)
    a = math.sin(dphi / 2) ** 2 + math.cos(phi1) * math.cos(phi2) * math.sin(dlambda / 2) ** 2
    return 2 * r * math.asin(math.sqrt(a))


# Named corridors between cluster pairs. Order of the pair does not matter.
_CORRIDORS = {
    frozenset({"Peenya", "Dobaspet"}): dict(
        corridor_name="NH-48 / Tumkur Road Industrial Corridor",
        highway_number="NH-48 (Bengaluru - Pune Highway)",
        road_circuity_factor=1.25,
        tolls=[dict(name="Nelamangala Expressway Toll Plaza (NHAI)", fee_inr=145, expressway="NH-48")],
        bbmp_peak_restriction=dict(
            restricted=True,
            window="08:00 - 11:00 & 16:00 - 20:00 IST",
            advisory="BBMP Traffic Police entry restriction for 3+ axle trucks at Goraguntepalya / 8th Mile Junction.",
        ),
        recommended_dispatch_window="OFFPEAK_DAY_1100_1600",
        minutes_per_km=2.2,
    ),
    frozenset({"Whitefield", "Chikkajala"}): dict(
        corridor_name="SH-104 / Budigere Cross Outer Airport Bypass Link",
        highway_number="SH-104 / STRR Radial Link",
        road_circuity_factor=1.22,
        tolls=[dict(name="Budigere Cross Infrastructure Toll", fee_inr=85, expressway="SH-104")],
        bbmp_peak_restriction=dict(
            restricted=False,
            window="None (Circumnavigates BBMP Bruhat limits)",
            advisory="Outer arterial bypass; free 24x7 heavy commercial vehicle transit permitted.",
        ),
        recommended_dispatch_window="ANYTIME_OUTER_BYPASS",
        minutes_per_km=1.8,
    ),
    frozenset({"Peenya", "Bidadi"}): dict(
        corridor_name="NICE Peripheral Ring Expressway Corridor",
        highway_number="NICE Expressway (NH-48 to Mysore Road NH-275)",
        road_circuity_factor=1.28,
        tolls=[
            dict(name="NICE Somapura Toll Plaza", fee_inr=140, expressway="NICE Expressway"),
            dict(name="NICE Cloverleaf Junction Toll", fee_inr=140, expressway="NICE Expressway"),
        ],
        bbmp_peak_restriction=dict(
            restricted=False,
            window="Exempt on Expressway Right-of-Way",
            advisory="Access-controlled private expressway bypass avoids Bengaluru city limits.",
        ),
        recommended_dispatch_window="ANYTIME_OUTER_BYPASS",
        minutes_per_km=1.9,
    ),
    frozenset({"Harohalli", "Peenya"}): dict(
        corridor_name="Kanakapura Road (NH-948) & NICE South Corridor",
        highway_number="NH-948 & NICE Link",
        road_circuity_factor=1.30,
        tolls=[dict(name="NICE South Kanakapura Road Toll", fee_inr=240, expressway="NICE Expressway")],
        bbmp_peak_restriction=dict(
            restricted=True,
            window="08:00 - 11:00 & 16:00 - 20:00 IST",
            advisory="City traffic bottleneck at Banashankari / Kanakapura Road junction.",
        ),
        recommended_dispatch_window="NIGHT_CORRIDOR_2200_0600",
        minutes_per_km=2.4,
    ),
}

_DEFAULT_CORRIDOR = dict(
    corridor_name="Karnataka State Highway & Industrial Feeder Network",
    highway_number="State Arterial Corridor",
    road_circuity_factor=1.25,
    tolls=[],
    bbmp_peak_restriction=dict(
        restricted=False,
        window="Standard Intra-Cluster Movement",
        advisory="Local industrial estate transit under Karnataka Motor Vehicles Rules.",
    ),
    recommended_dispatch_window="OFFPEAK_DAY_1100_1600",
    minutes_per_km=2.0,
)


def logistics_corridor(seller: Facility, buyer: Facility, straight_km: float) -> LogisticsCorridor:
    road_km = round_to(straight_km * c.ROAD_CIRCUITY_FACTOR, 1)
    spec = dict(_CORRIDORS.get(frozenset({seller.cluster, buyer.cluster}), _DEFAULT_CORRIDOR))
    minutes_per_km = spec.pop("minutes_per_km")
    return LogisticsCorridor(
        **spec,
        total_toll_inr=sum(t["fee_inr"] for t in spec["tolls"]),
        est_transit_minutes=js_round(road_km * minutes_per_km),
    )


def validate_route(seller: Facility, buyer: Facility, volume_tons: float) -> RouteFeasibility:
    dist_km = haversine_km(seller.lat, seller.lon, buyer.lat, buyer.lon)
    feasible = dist_km <= c.MAX_FEASIBLE_RADIUS_KM
    corridor = logistics_corridor(seller, buyer, dist_km)

    freight_base = dist_km * c.TRUCK_COST_PER_KM_PER_TON * volume_tons
    transport_total = round_to(freight_base + corridor.total_toll_inr, 2)
    transport_per_ton = round_to(transport_total / volume_tons, 2) if volume_tons > 0 else 0

    co2_transport = round_to(dist_km * c.CO2_EMISSION_KG_PER_TON_KM * volume_tons, 2)
    co2_avoided = round_to(c.CO2_VIRGIN_MATERIAL_KG_PER_TON.get(seller.material, 0) * volume_tons, 2)
    pm10_avoided = round_to(c.PM10_AVOIDED_KG_PER_TON.get(seller.material, 0) * volume_tons, 2)
    so2_avoided = round_to(c.SO2_AVOIDED_KG_PER_TON.get(seller.material, 0) * volume_tons, 2)

    if feasible:
        reason = f"Route within {c.MAX_FEASIBLE_RADIUS_KM:g}km cluster radius via {corridor.corridor_name}."
    else:
        reason = f"Distance {round_to(dist_km, 1):g}km exceeds {c.MAX_FEASIBLE_RADIUS_KM:g}km feasibility radius."

    return RouteFeasibility(
        distance_km=round_to(dist_km, 2),
        feasible=feasible,
        max_radius_km=c.MAX_FEASIBLE_RADIUS_KM,
        transport_cost_total_inr=transport_total,
        transport_cost_per_ton_inr=transport_per_ton,
        co2_avoided_kg=co2_avoided,
        co2_transport_kg=co2_transport,
        net_co2_impact_kg=round_to(co2_avoided - co2_transport, 2),
        pm10_avoided_kg=pm10_avoided,
        so2_avoided_kg=so2_avoided,
        reason=reason,
        corridor=corridor,
    )
