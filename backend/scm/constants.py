"""Tunable constants and reference factors.

Values carried over from the hackathon engine keep their original numbers so
the parity tests stay meaningful; new factors cite their source.
"""

MAX_FEASIBLE_RADIUS_KM = 60.0
ROAD_CIRCUITY_FACTOR = 1.25
TRUCK_COST_PER_KM_PER_TON = 8.0
CO2_EMISSION_KG_PER_TON_KM = 0.1

# Micro-lot pooling: same-material, same-cluster sellers below this monthly
# volume are merged into one virtual consignment before matchmaking.
POOLING_VOLUME_THRESHOLD_TONS = 3.0

# Per-shipment overhead (loading, paperwork, minimum trip charge).
FIXED_DISPATCH_FEE_INR = 800

# A carrier already running a route this pipeline run quotes its next job at a
# backhaul discount instead of charging for an empty return leg.
BACKHAUL_DISCOUNT_FACTOR = 0.85

SETTLEMENT_ADVANCE_PCT = 60
KATOTI_DEDUCTION_CAP_PCT = 2

NEGOTIATION_MAX_ROUNDS = 5
OPENING_ASK_MULTIPLIER = 1.4
OPENING_BID_MULTIPLIER = 0.6

MOISTURE_PENALTY_THRESHOLD_PCT = 15
MOISTURE_PENALTY_PCT = 5

CO2_VIRGIN_MATERIAL_KG_PER_TON = {
    "steel_slag": 1800,
    "fly_ash": 900,
    "metal_scrap": 1500,
    "plastic_scrap": 2000,
    "rubber_waste": 1200,
    "recycled_concrete_aggregate": 850,
    "demolition_rubble": 450,
    "chrome_sludge": 0,
    "used_oil": 400,
    "dye_sludge": 0,
}

PM10_AVOIDED_KG_PER_TON = {
    "recycled_concrete_aggregate": 14.5,
    "demolition_rubble": 8.0,
    "fly_ash": 6.2,
    "steel_slag": 5.0,
    "metal_scrap": 3.5,
    "plastic_scrap": 2.1,
    "used_oil": 1.2,
}

SO2_AVOIDED_KG_PER_TON = {
    "fly_ash": 4.8,
    "steel_slag": 3.2,
    "metal_scrap": 2.5,
    "used_oil": 1.8,
    "recycled_concrete_aggregate": 0.9,
}

# CSTEP Emission Inventory for Bengaluru, Table 3.3 (source: SAFAR 2018),
# heavy commercial vehicle tailpipe factors in g/km for a 5-year-old diesel.
HCV_EMISSION_G_PER_KM = {"CO": 6.0, "NOx": 9.3, "PM": 0.42}

HAZARD_RULES = {
    "chrome_sludge": "KSPCB HW Rules 2016 (Sched. II): Requires KSPCB Authorized CETP (e.g. VIWA Eco-Club) or TSDF (KWMP Dabaspet) manifest Form-10.",
    "used_oil": "KSPCB HW Rules 2016 (Sched. IV): Requires KSPCB Authorized Rerefiner under CPCB Centralized EPR Portal.",
    "dye_sludge": "KSPCB Water & Air Act: Requires authorized effluent treatment/TSDF disposal clearance.",
    "recycled_concrete_aggregate": "CPCB 2017 & C&D Waste Rules 2016: Governed by BIS IS:383:2016 for Recycled Concrete Aggregate (max 20% in RCC M25; 100% in lean concrete).",
    "fly_ash": "MoEFCC SO 5481(E): Mandatory 100% ash utilization mandate for cement, RMC, and bricks within 300km.",
    "steel_slag": "IRC & National Building Code 2005 Part 11: Granular Sub-Base (GSB) replacement for road pavements.",
}

DEFAULT_RULE = "Standard non-hazardous material handling under KSPCB rules."
