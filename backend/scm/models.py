"""Domain models shared by every agent.

Field names match the original TypeScript types (src/types.ts in the hackathon
repo) so the React frontend can keep reading the same JSON shapes.
"""

from __future__ import annotations

from typing import Any, Literal, Optional

from pydantic import BaseModel, ConfigDict, Field

Role = Literal["seller", "buyer"]
DealOutcome = Literal["DEAL", "NO_DEAL"]
FreightOutcome = Literal["DEAL", "NO_CARRIER"]
Decision = Literal["APPROVED", "VETOED", "NOT_APPLICABLE"]


class _Model(BaseModel):
    model_config = ConfigDict(extra="allow")


class LabAssayParameter(_Model):
    name: str
    unit: str
    value: float
    test_standard: str
    tolerance_min: Optional[float] = None
    tolerance_max: Optional[float] = None
    status: str = "COMPLIANT"


class LabAssayCertificate(_Model):
    certificate_id: str
    lab_name: str
    sample_date: str
    batch_id: str
    parameters: list[LabAssayParameter] = Field(default_factory=list)
    overall_grade: str
    usable_in_production: bool = True


class XgnConsentInfo(_Model):
    consent_id: str
    consent_type: str
    category: Optional[str] = None
    valid_till: str
    is_active: bool
    authorized_monthly_quota_tons: float
    current_month_consumed_tons: float
    cepi_score: Optional[float] = None


class SensorReading(_Model):
    moisture_pct: float
    contamination_flag: bool


class Facility(_Model):
    id: str
    name: str
    cluster: str
    lat: float
    lon: float
    role: Role
    material: str
    material_category: str = ""
    hazardous: bool = False
    volume_tons_per_month: float
    cost_floor_inr_per_ton: Optional[float] = None
    cost_ceiling_inr_per_ton: Optional[float] = None
    certified_hazard_handler: bool = False
    gstin: Optional[str] = None
    kspcb_consent_id: Optional[str] = None
    xgn_details: Optional[XgnConsentInfo] = None
    lab_assay: Optional[LabAssayCertificate] = None
    quality_requirements: Optional[dict[str, float]] = None
    sensor_adjustment: Optional[SensorReading] = None


class Carrier(_Model):
    id: str
    name: str
    cluster: str
    lat: float
    lon: float
    vehicle_type: str
    capacity_tons: float
    rate_floor_inr_per_ton_km: float
    hazmat_transport_license: bool


class TollPlaza(_Model):
    name: str
    fee_inr: float
    expressway: str


class PeakRestriction(_Model):
    restricted: bool
    window: str
    advisory: str


class LogisticsCorridor(_Model):
    corridor_name: str
    highway_number: str
    road_circuity_factor: float
    tolls: list[TollPlaza]
    total_toll_inr: float
    bbmp_peak_restriction: PeakRestriction
    recommended_dispatch_window: str
    est_transit_minutes: int


class RouteFeasibility(_Model):
    distance_km: float
    feasible: bool
    max_radius_km: float
    transport_cost_total_inr: float
    transport_cost_per_ton_inr: float
    co2_avoided_kg: float
    co2_transport_kg: float
    net_co2_impact_kg: float
    pm10_avoided_kg: float
    so2_avoided_kg: float
    reason: str
    corridor: LogisticsCorridor


class QualityToleranceCheck(_Model):
    compatible: bool
    assay_certificate: LabAssayCertificate
    penalty_discount_pct: float
    technical_note: str


class CandidateMatch(_Model):
    seller_id: str
    buyer_id: str
    material: str
    route: RouteFeasibility
    quality_check: QualityToleranceCheck
    justification: Optional[str] = None


class NegotiationRound(_Model):
    round: int
    seller_ask: float
    buyer_bid: float
    seller_note: str
    buyer_note: str


class NegotiationResult(_Model):
    seller_id: str
    buyer_id: str
    material: str
    volume_tons: float
    outcome: DealOutcome
    final_price_inr_per_ton: Optional[float]
    reason: Optional[str]
    rounds: list[NegotiationRound]
    logistics: RouteFeasibility
    quality_adjustment_applied: Optional[float] = None


class FreightNegotiationRound(_Model):
    round: int
    carrier_ask_inr_per_ton_km: float
    shipper_bid_inr_per_ton_km: float
    carrier_note: str
    shipper_note: str


class FreightNegotiationResult(_Model):
    carrier_id: Optional[str]
    carrier_name: Optional[str]
    vehicle_type: Optional[str]
    outcome: FreightOutcome
    final_rate_inr_per_ton_km: Optional[float]
    total_freight_cost_inr: Optional[float]
    reason: Optional[str]
    rounds: list[FreightNegotiationRound]


class MonthlyQuotaCheck(_Model):
    authorized_quota_tons: float
    consumed_tons: float
    requested_trade_tons: float
    remaining_headroom_tons: float
    quota_exceeded: bool
    warning: Optional[str] = None


class RegulatoryDecision(_Model):
    decision: Decision
    reason: Optional[str] = None
    rule_applied: Optional[str] = None
    explanation: Optional[str] = None
    xgn_quota_check: Optional[dict[str, MonthlyQuotaCheck]] = None
    xgn_consent_status: Optional[dict[str, Any]] = None


class PooledMember(_Model):
    facility_id: str
    facility_name: str
    volume_tons: float
    share_pct: float
    freight_share_inr: float
    net_payout_inr: float


class DigitalWastePassport(_Model):
    block_index: int
    deal: dict[str, Any]
    issued_at: str
    prev_hash: str
    record_hash: str


class LedgerVerification(_Model):
    valid: bool
    message: str
    count: int


class PipelineItemResult(_Model):
    match: CandidateMatch
    seller: Facility
    buyer: Facility
    negotiation: NegotiationResult
    logistics_deal: Optional[FreightNegotiationResult] = None
    regulatory: Optional[RegulatoryDecision] = None
    passport: Optional[DigitalWastePassport] = None
    pooled_members: Optional[list[PooledMember]] = None
    is_pooled_consignment: bool = False


class DecisionRecord(_Model):
    """One auditable agent action (Gartner's 'decision governance')."""

    agent: str
    action: str
    subject: dict[str, Any]
    inputs: dict[str, Any] = Field(default_factory=dict)
    output: dict[str, Any] = Field(default_factory=dict)
    rule: Optional[str] = None
    reason: Optional[str] = None
    model: Optional[str] = None
