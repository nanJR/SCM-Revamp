"""Supervisory KSPCB regulator agent with veto power over agreed deals."""

from __future__ import annotations

from datetime import date, datetime

from . import constants as c
from .llm import Narrator
from .models import Carrier, Facility, MonthlyQuotaCheck, NegotiationResult, RegulatoryDecision
from .numbers import round_to

_VETO_PROMPT = "You are the KSPCB Regulatory Agent. In one short sentence, explain why this trade is being vetoed on compliance grounds."
_UNLIMITED = MonthlyQuotaCheck(
    authorized_quota_tons=9999, consumed_tons=0, requested_trade_tons=0, remaining_headroom_tons=9999, quota_exceeded=False
)


def parse_consent_date(value: str) -> date | None:
    for fmt in ("%Y-%m-%d", "%d/%m/%Y"):
        try:
            return datetime.strptime(value, fmt).date()
        except ValueError:
            continue
    return None


def _quota(f: Facility, requested: float, warning: str) -> MonthlyQuotaCheck | None:
    if not f.xgn_details:
        return None
    authorized = f.xgn_details.authorized_monthly_quota_tons
    consumed = f.xgn_details.current_month_consumed_tons
    headroom = max(0, authorized - consumed)
    exceeded = requested > headroom
    return MonthlyQuotaCheck(
        authorized_quota_tons=authorized,
        consumed_tons=consumed,
        requested_trade_tons=requested,
        remaining_headroom_tons=headroom,
        quota_exceeded=exceeded,
        warning=warning.format(over=round_to(requested - headroom, 1)) if exceeded else None,
    )


async def review_deal(
    seller: Facility,
    buyer: Facility,
    negotiation: NegotiationResult,
    narrator: Narrator,
    carrier: Carrier | None = None,
    as_of: date | None = None,
) -> RegulatoryDecision:
    material = negotiation.material
    volume = negotiation.volume_tons
    as_of = as_of or date.today()

    if negotiation.outcome != "DEAL":
        return RegulatoryDecision(decision="NOT_APPLICABLE", reason="No price agreement was reached; nothing to review.")

    # 1. Hazardous waste may only go to a certified handler.
    if seller.hazardous and not buyer.certified_hazard_handler:
        rule = c.HAZARD_RULES.get(material, "Requires certified hazardous waste handler.")
        explanation = await narrator.say(
            _VETO_PROMPT,
            f"Material: {material}. Rule: {rule}. Buyer {buyer.name} is not certified.",
            f"Vetoed: {buyer.name} is not an authorised hazardous waste handler for {material.replace('_', ' ')}.",
        )
        return RegulatoryDecision(decision="VETOED", rule_applied=rule, explanation=explanation)

    # 1b. Defence in depth: carrier selection already filters for this.
    if seller.hazardous and carrier and not carrier.hazmat_transport_license:
        rule = "KSPCB Hazardous and Other Wastes (Management & Transboundary Movement) Rules 2016: Transporter must hold hazmat transport authorization."
        explanation = await narrator.say(
            _VETO_PROMPT,
            f"Material: {material}. Rule: {rule}. Carrier {carrier.name} lacks hazmat transport license.",
            f"Vetoed: {carrier.name} holds no hazardous waste transport authorisation.",
        )
        return RegulatoryDecision(decision="VETOED", rule_applied=rule, explanation=explanation)

    # 2. Seller's consent to operate must be active and unexpired.
    xgn = seller.xgn_details
    if xgn:
        expiry = parse_consent_date(xgn.valid_till)
        if not xgn.is_active or (expiry is not None and expiry < as_of):
            return RegulatoryDecision(
                decision="VETOED",
                rule_applied=f"KSPCB Water/Air Act Consent {xgn.consent_id} expired on {xgn.valid_till}.",
                explanation=(
                    f"Trade rejected: Seller consent expired on {xgn.valid_till}. Operating without active CFO "
                    "violates Section 25/26 of Water Act 1974."
                ),
                xgn_consent_status=dict(
                    seller_valid=False,
                    buyer_valid=True,
                    seller_expiry=xgn.valid_till,
                    buyer_expiry=buyer.xgn_details.valid_till if buyer.xgn_details else "Active",
                ),
            )

    # 3. Monthly permitted quotas on both sides.
    seller_q = _quota(seller, volume, "Dispatch volume exceeds monthly permitted quota headroom by {over:g} tons.")
    if seller_q and seller_q.quota_exceeded:
        return RegulatoryDecision(
            decision="VETOED",
            rule_applied="KSPCB Monthly Permitted Waste Generation Quota",
            explanation=f"Trade vetoed: Requested {volume:g} tons exceeds remaining monthly quota ({seller_q.remaining_headroom_tons:g} tons).",
            xgn_quota_check=dict(seller_check=seller_q, buyer_check=_UNLIMITED.model_copy(update={"requested_trade_tons": volume})),
        )

    buyer_q = _quota(buyer, volume, "Receipt volume exceeds authorized intake quota.")
    if buyer_q and buyer_q.quota_exceeded:
        return RegulatoryDecision(
            decision="VETOED",
            rule_applied="KSPCB Monthly Permitted Industrial Intake Quota",
            explanation=f"Trade vetoed: Buyer monthly capacity headroom ({buyer_q.remaining_headroom_tons:g} tons) exceeded.",
            xgn_quota_check=dict(
                seller_check=seller_q or _UNLIMITED.model_copy(update={"requested_trade_tons": volume}), buyer_check=buyer_q
            ),
        )

    rule = c.HAZARD_RULES.get(material, c.DEFAULT_RULE)
    explanation = await narrator.say(
        "You are the KSPCB Regulatory Agent. In one short sentence, confirm this trade is compliant and approved under Karnataka Environmental Rules.",
        f"Material: {material}, hazardous={str(seller.hazardous).lower()}, buyer certified={str(buyer.certified_hazard_handler).lower()}, XGN verified.",
        f"Approved: {material.replace('_', ' ')} trade complies with KSPCB consent, quota and handling rules.",
        60,
    )
    return RegulatoryDecision(
        decision="APPROVED",
        rule_applied=rule,
        explanation=explanation,
        xgn_quota_check=dict(seller_check=seller_q, buyer_check=buyer_q) if seller_q and buyer_q else None,
        xgn_consent_status=dict(
            seller_valid=True,
            buyer_valid=True,
            seller_expiry=seller.xgn_details.valid_till if seller.xgn_details else "2028-12-31",
            buyer_expiry=buyer.xgn_details.valid_till if buyer.xgn_details else "2028-12-31",
        ),
    )
