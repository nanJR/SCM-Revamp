export type ClusterName = 'Peenya' | 'Bidadi' | 'Dobaspet' | 'Harohalli' | 'Tumkur' | 'Whitefield' | 'Yelahanka' | 'Chikkajala';

export type Role = 'seller' | 'buyer';

export type MaterialType =
  | 'chrome_sludge'
  | 'used_oil'
  | 'metal_scrap'
  | 'fly_ash'
  | 'steel_slag'
  | 'dye_sludge'
  | 'plastic_scrap'
  | 'rubber_waste'
  | 'recycled_concrete_aggregate'
  | 'demolition_rubble';

export interface LabAssayParameter {
  name: string;
  unit: string;
  value: number;
  test_standard: string; // e.g. IS:3812, IS:383:2016, ASTM D93
  tolerance_min?: number;
  tolerance_max?: number;
  status: 'COMPLIANT' | 'DEVIATION' | 'ACCEPTABLE_WITH_PENALTY';
}

export interface LabAssayCertificate {
  certificate_id: string;
  lab_name: string;
  sample_date: string;
  batch_id: string;
  parameters: LabAssayParameter[];
  overall_grade: string;
  usable_in_production: boolean;
}

export interface QualityToleranceCheck {
  compatible: boolean;
  assay_certificate: LabAssayCertificate;
  penalty_discount_pct: number;
  technical_note: string;
}

export interface TollPlaza {
  name: string;
  fee_inr: number;
  expressway: string;
}

export interface LogisticsCorridor {
  corridor_name: string;
  highway_number: string;
  road_circuity_factor: number; // 1.2 - 1.35 multiplier on straight line
  tolls: TollPlaza[];
  total_toll_inr: number;
  bbmp_peak_restriction: {
    restricted: boolean;
    window: string; // "08:00 - 11:00 & 16:00 - 20:00 IST"
    advisory: string;
  };
  recommended_dispatch_window: 'NIGHT_CORRIDOR_2200_0600' | 'OFFPEAK_DAY_1100_1600' | 'ANYTIME_OUTER_BYPASS';
  est_transit_minutes: number;
}

export interface XgnConsentInfo {
  consent_id: string;
  consent_type: 'Red-CFO' | 'Orange-CFO' | 'Green-CFO' | 'C&D-Auth';
  category?: string;
  valid_till: string;
  is_active: boolean;
  authorized_monthly_quota_tons: number;
  current_month_consumed_tons: number;
  cepi_score?: number;
}

export interface MonthlyQuotaCheck {
  authorized_quota_tons: number;
  consumed_tons: number;
  requested_trade_tons: number;
  remaining_headroom_tons: number;
  quota_exceeded: boolean;
  warning?: string;
}

export interface Facility {
  id: string;
  name: string;
  cluster: string;
  lat: number;
  lon: number;
  role: Role;
  material: string;
  material_category: string;
  hazardous: boolean;
  volume_tons_per_month: number;
  cost_floor_inr_per_ton: number | null;
  cost_ceiling_inr_per_ton: number | null;
  certified_hazard_handler: boolean;
  kspcb_consent_id?: string;
  consent_type?: 'Red-CFO' | 'Orange-CFO' | 'Green-CFO' | 'C&D-Auth';
  cepi_zone?: string;
  nearest_caaqms?: string;
  gstin?: string;
  xgn_details?: XgnConsentInfo;
  lab_assay?: LabAssayCertificate;
  quality_requirements?: {
    max_moisture_pct?: number;
    max_loi_pct?: number;
    min_acv_pct?: number;
    max_water_absorption_pct?: number;
    min_flash_point_c?: number;
    max_cr6_ppm?: number;
  };
  sensor_adjustment?: {
    moisture_pct: number;
    contamination_flag: boolean;
    caaqms_pm10_alert?: boolean;
  };
}

export interface PooledMember {
  facility_id: string;
  facility_name: string;
  volume_tons: number;
  share_pct: number;
  freight_share_inr: number;
  net_payout_inr: number;
}

export interface SettlementRecord {
  escrow_voucher_id: string;
  total_payable_inr: number;
  advance_pct: number;
  advance_inr: number;
  advance_upi_ref: string;
  balance_inr: number;
  balance_release_condition: string;
  katoti_cap_pct: number;
}

export type VehicleType = 'Mini Truck (Tata Ace)' | '10-Wheeler Truck' | 'Tipper Trailer' | 'Bulk Tanker';

export interface Carrier {
  id: string;
  name: string;
  cluster: string;
  lat: number;
  lon: number;
  vehicle_type: VehicleType;
  capacity_tons: number;
  rate_floor_inr_per_ton_km: number;
  hazmat_transport_license: boolean;
}

export interface RouteFeasibility {
  distance_km: number;
  feasible: boolean;
  max_radius_km: number;
  transport_cost_total_inr: number;
  transport_cost_per_ton_inr: number;
  co2_avoided_kg: number;
  co2_transport_kg: number;
  net_co2_impact_kg: number;
  pm10_avoided_kg?: number;
  so2_avoided_kg?: number;
  reason: string;
  corridor?: LogisticsCorridor;
}

export interface CandidateMatch {
  seller_id: string;
  buyer_id: string;
  material: string;
  route: RouteFeasibility;
  quality_check?: QualityToleranceCheck;
  justification?: string;
}

export interface NegotiationRound {
  round: number;
  seller_ask: number;
  buyer_bid: number;
  seller_note: string;
  buyer_note: string;
}

export interface NegotiationResult {
  seller_id: string;
  buyer_id: string;
  material: string;
  volume_tons: number;
  outcome: 'DEAL' | 'NO_DEAL';
  final_price_inr_per_ton: number | null;
  reason: string | null;
  rounds: NegotiationRound[];
  logistics: RouteFeasibility;
  quality_adjustment_applied?: number;
}

export interface FreightNegotiationRound {
  round: number;
  carrier_ask_inr_per_ton_km: number;
  shipper_bid_inr_per_ton_km: number;
  carrier_note: string;
  shipper_note: string;
}

export type LogisticsOutcome = 'DEAL' | 'NO_CARRIER';

export interface FreightNegotiationResult {
  carrier_id: string | null;
  carrier_name: string | null;
  vehicle_type: VehicleType | null;
  outcome: LogisticsOutcome;
  final_rate_inr_per_ton_km: number | null;
  total_freight_cost_inr: number | null;
  reason: string | null;
  rounds: FreightNegotiationRound[];
}

export interface LogisticsLineItem {
  carrier_id: string;
  carrier_name: string;
  vehicle_type: VehicleType;
  agreed_rate_inr_per_ton_km: number;
  total_freight_cost_inr: number;
  negotiation_rounds: FreightNegotiationRound[];
}

export interface RegulatoryDecision {
  decision: 'APPROVED' | 'VETOED' | 'NOT_APPLICABLE';
  rule_applied?: string;
  explanation?: string;
  reason?: string;
  xgn_quota_check?: {
    seller_check: MonthlyQuotaCheck;
    buyer_check: MonthlyQuotaCheck;
  };
  xgn_consent_status?: {
    seller_valid: boolean;
    buyer_valid: boolean;
    seller_expiry: string;
    buyer_expiry: string;
  };
}

export interface FreightLineItem {
  carrier_name: string;
  vehicle_type: VehicleType;
  rate_inr_per_ton_km: number;
  distance_km: number;
  freight_subtotal_inr: number;
  freight_gst_rate_pct: number;
  freight_cgst_inr: number;
  freight_sgst_inr: number;
  freight_total_inr: number;
}

export interface CircularPurchaseOrder {
  po_number: string;
  date_issued: string;
  seller_name: string;
  seller_gstin: string;
  buyer_name: string;
  buyer_gstin: string;
  material_description: string;
  hsn_sac_code: string;
  quantity_tons: number;
  unit_price_inr: number;
  subtotal_inr: number;
  gst_rate_pct: number;
  cgst_inr: number;
  sgst_inr: number;
  total_invoice_inr: number;
  payment_terms: string;
  quality_assay_ref: string;
  demurrage_clause: string;
  freight_line_item?: FreightLineItem;
}

export interface EWayBill {
  eway_bill_number: string;
  generated_date: string;
  valid_until: string;
  transporter_name: string;
  transporter_id: string;
  vehicle_number: string;
  origin_cluster: string;
  destination_cluster: string;
  distance_km: number;
  corridor_name: string;
  dispatch_window: string;
  hsn_code: string;
  toll_route: string;
  digital_barcode_data: string;
}

export interface HazardousManifestForm10 {
  manifest_number: string;
  kspcb_rule_ref: string;
  sender_authorization: string;
  receiver_authorization: string;
  transporter_vehicle: string;
  emergency_procedure_guide: string;
  color_code: string; // 'Yellow Copy (Sender) / Pink Copy (KSPCB) / Blue Copy (CETP)'
}

export interface PassportDealData {
  seller_id: string;
  buyer_id: string;
  material: string;
  volume_tons: number;
  agreed_price_per_ton: number | null;
  logistics: RouteFeasibility;
  regulatory_decision: RegulatoryDecision;
  contract?: CircularPurchaseOrder;
  eway_bill?: EWayBill;
  hazard_manifest?: HazardousManifestForm10;
  logistics_deal?: LogisticsLineItem;
  settlement?: SettlementRecord;
  pooled_members?: PooledMember[];
}

export interface DigitalWastePassport {
  issued_at: string;
  prev_hash: string;
  record_hash: string;
  deal: PassportDealData;
}

export interface PipelineItemResult {
  match: CandidateMatch;
  seller: Facility;
  buyer: Facility;
  negotiation: NegotiationResult;
  logistics_deal: FreightNegotiationResult | null;
  regulatory: RegulatoryDecision | null;
  passport: DigitalWastePassport | null;
  pooled_members?: PooledMember[] | null;
  is_pooled_consignment?: boolean;
}

export interface LedgerVerification {
  valid: boolean;
  message: string;
  count: number;
}
