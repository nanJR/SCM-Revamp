"""Statutory paperwork: purchase order, GST e-way bill, Form 10 manifest, escrow."""

from __future__ import annotations

import random
from datetime import datetime, timedelta, timezone
from typing import Any

from . import constants as c
from .models import Facility
from .numbers import js_round

IST = timezone(timedelta(hours=5, minutes=30))
_VEHICLE_BY_CLUSTER = {"Peenya": "KA-04-AK-7192", "Bidadi": "KA-42-B-3109"}


def build_documents(
    deal: dict[str, Any],
    seller: Facility,
    buyer: Facility,
    taxonomy: dict[str, dict[str, Any]],
    rng: random.Random | None = None,
    now: datetime | None = None,
) -> dict[str, Any]:
    rng = rng or random.Random()
    now = now or datetime.now(IST)
    tax = taxonomy.get(deal["material"], {"hsnCode": "9988", "defaultGstRate": 18})

    unit_price = deal.get("agreed_price_per_ton") or 1000
    subtotal = js_round(unit_price * deal["volume_tons"])
    gst_rate = tax["defaultGstRate"]
    total_gst = js_round(subtotal * gst_rate / 100)
    cgst = js_round(total_gst / 2)
    total_invoice = subtotal + total_gst
    date_str = now.date().isoformat()

    contract: dict[str, Any] = dict(
        po_number=f"PO-SYM-{now.year}-{seller.id}-{buyer.id}-{rng.randint(1000, 9999)}",
        date_issued=date_str,
        seller_name=seller.name,
        seller_gstin=seller.gstin or "29AAECS4912L1ZF",
        buyer_name=buyer.name,
        buyer_gstin=buyer.gstin or "29AABCR8102B1Z8",
        material_description=f"{deal['material'].replace('_', ' ').upper()} (Secondary Industrial Byproduct)",
        hsn_sac_code=tax["hsnCode"],
        quantity_tons=deal["volume_tons"],
        unit_price_inr=unit_price,
        subtotal_inr=subtotal,
        gst_rate_pct=gst_rate,
        cgst_inr=cgst,
        sgst_inr=total_gst - cgst,
        total_invoice_inr=total_invoice,
        payment_terms="100% Escrow on delivery verification & weighbridge gross slip receipt.",
        quality_assay_ref=seller.lab_assay.certificate_id if seller.lab_assay else "CERT-STD-CPCB",
        demurrage_clause="Free detention time: 3 hours. Demurrage rate INR 500/hour for multi-axle carrier thereafter.",
    )

    freight = deal.get("logistics_deal")
    if freight:
        # GTA reverse-charge convention (CGST Notification 11/2017), simplified to a flat 5%.
        freight_subtotal = freight["total_freight_cost_inr"]
        freight_gst = js_round(freight_subtotal * 5 / 100)
        freight_cgst = js_round(freight_gst / 2)
        contract["freight_line_item"] = dict(
            carrier_name=freight["carrier_name"],
            vehicle_type=freight["vehicle_type"],
            rate_inr_per_ton_km=freight["agreed_rate_inr_per_ton_km"],
            distance_km=deal["logistics"]["distance_km"],
            freight_subtotal_inr=freight_subtotal,
            freight_gst_rate_pct=5,
            freight_cgst_inr=freight_cgst,
            freight_sgst_inr=freight_gst - freight_cgst,
            freight_total_inr=freight_subtotal + freight_gst,
        )

    ewb_number = f"5310-{rng.randint(1000, 9999)}-{rng.randint(1000, 9999)}"
    vehicle = _VEHICLE_BY_CLUSTER.get(seller.cluster, "KA-51-C-8821")
    corridor = deal["logistics"].get("corridor") or {}
    tolls = corridor.get("tolls") or []
    eway_bill = dict(
        eway_bill_number=ewb_number,
        generated_date=date_str,
        valid_until=(now + timedelta(days=1)).strftime("%Y-%m-%d %H:%M:%S IST"),
        transporter_name=freight["carrier_name"] if freight else "Karnataka Industrial Circular Logistics Consortium",
        transporter_id="29AAACK9901Z1ZT",
        vehicle_number=f"{vehicle} ({freight['vehicle_type']})" if freight else vehicle,
        origin_cluster=seller.cluster,
        destination_cluster=buyer.cluster,
        distance_km=deal["logistics"]["distance_km"],
        corridor_name=corridor.get("corridor_name", "Karnataka Highway Arterial"),
        dispatch_window=corridor.get("recommended_dispatch_window", "OFFPEAK_DAY_1100_1600"),
        hsn_code=tax["hsnCode"],
        toll_route=" -> ".join(t["name"] for t in tolls) if tolls else "Direct Non-Toll State Highway",
        digital_barcode_data=f"GST-EWB|{ewb_number}|{seller.gstin}|{buyer.gstin}|{deal['volume_tons']}T|{total_invoice}|{vehicle}",
    )

    manifest = None
    if seller.hazardous:
        manifest = dict(
            manifest_number=f"KSPCB/MAN/{now.year}/HW-{rng.randint(100000, 999999)}",
            kspcb_rule_ref="Rule 19, Hazardous and Other Wastes (Management & Transboundary Movement) Rules 2016",
            sender_authorization=seller.xgn_details.consent_id if seller.xgn_details else "KSPCB/RED-AUTH",
            receiver_authorization=buyer.xgn_details.consent_id if buyer.xgn_details else "KSPCB/RED-AUTH",
            transporter_vehicle=f"{vehicle} (GPS Telemetry Enabled Hazardous Carrier)",
            emergency_procedure_guide="Transport Emergency (TREM) Card attached with hazardous spill neutralization protocol.",
            color_code="Yellow Copy (Sender) / Pink Copy (KSPCB Regional Office) / Blue Copy (Receiver TSDF/CETP)",
        )

    return dict(contract=contract, eway_bill=eway_bill, hazard_manifest=manifest)


def settlement(total_payable_inr: float, rng: random.Random | None = None) -> dict[str, Any]:
    """Escrow voucher: T+0 advance to the seller, balance on weighbridge confirmation."""
    rng = rng or random.Random()
    advance = js_round(total_payable_inr * c.SETTLEMENT_ADVANCE_PCT / 100)
    return dict(
        escrow_voucher_id=f"ESC-{datetime.now(IST).year}-{rng.randint(100000, 999999)}",
        total_payable_inr=total_payable_inr,
        advance_pct=c.SETTLEMENT_ADVANCE_PCT,
        advance_inr=advance,
        advance_upi_ref=f"UPI-AUTOPAY-{rng.randint(1000000000, 9999999999)}",
        balance_inr=total_payable_inr - advance,
        balance_release_condition="Released on weighbridge gross-slip confirmation & buyer delivery acknowledgement.",
        katoti_cap_pct=c.KATOTI_DEDUCTION_CAP_PCT,
    )
