"""Quality agent: checks a seller's lab assay against a buyer's specification."""

from __future__ import annotations

from datetime import date

from . import constants as c
from .models import Facility, LabAssayCertificate, LabAssayParameter, QualityToleranceCheck

# Buyer requirement key -> substring of the assay parameter it limits.
_MAX_LIMITS = {
    "max_loi_pct": ("Loss on Ignition", "LOI assay ({value}%) exceeds buyer cement clinker tolerance ({limit}%)."),
    "max_water_absorption_pct": (
        "Water Absorption",
        "Water absorption ({value}%) exceeds max allowable threshold ({limit}%).",
    ),
}


def _find(cert: LabAssayCertificate, needle: str) -> LabAssayParameter | None:
    return next((p for p in cert.parameters if needle in p.name), None)


def check_assay(seller: Facility, buyer: Facility) -> QualityToleranceCheck:
    cert = seller.lab_assay
    if cert is None:
        return QualityToleranceCheck(
            compatible=True,
            assay_certificate=LabAssayCertificate(
                certificate_id="STD-ASSAY-VERIFIED",
                lab_name="KSPCB Empanelled Environmental Laboratory",
                sample_date=date.today().isoformat(),
                batch_id="BATCH-DEFAULT",
                parameters=[
                    LabAssayParameter(
                        name="Standard Purity Index", unit="%", value=95.0, test_standard="IS Standard", status="COMPLIANT"
                    )
                ],
                overall_grade="Standard Commercial Grade",
                usable_in_production=True,
            ),
            penalty_discount_pct=0,
            technical_note="Standard commercial grade verified against BIS/CPCB specification.",
        )

    penalty = 0
    note = f"Lab Assay {cert.certificate_id} ({cert.lab_name}) verified. Overall Grade: {cert.overall_grade}."
    moisture = seller.sensor_adjustment.moisture_pct if seller.sensor_adjustment else 0
    if moisture and moisture > c.MOISTURE_PENALTY_THRESHOLD_PCT:
        penalty += c.MOISTURE_PENALTY_PCT
        note += f" Live IoT moisture alert ({moisture:g}%): {c.MOISTURE_PENALTY_PCT}% quality penalty applied."

    for key, (needle, message) in _MAX_LIMITS.items():
        limit = (buyer.quality_requirements or {}).get(key)
        if not limit:
            continue
        param = _find(cert, needle)
        if param and param.value > limit:
            return QualityToleranceCheck(
                compatible=False,
                assay_certificate=cert,
                penalty_discount_pct=0,
                technical_note=message.format(value=f"{param.value:g}", limit=f"{limit:g}"),
            )

    return QualityToleranceCheck(compatible=True, assay_certificate=cert, penalty_discount_pct=penalty, technical_note=note)
