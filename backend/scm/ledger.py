"""Digital Waste Passport ledger: an append-only SHA-256 hash chain.

Each block hashes the canonical JSON of {deal, issued_at, prev_hash}. Canonical
means keys sorted at every depth and no whitespace, so the same block hashes
to the same value in Python, in Postgres and in the browser verifier.

Fix carried over from the review of the hackathon code: it hashed
JSON.stringify(record, Object.keys(record).sort()). A replacer array applies
to every nesting level, so nested deal fields were silently dropped and the
hash only covered issued_at and prev_hash. Editing a passport's price or
tonnage went undetected. Here the whole deal is covered.
"""

from __future__ import annotations

import hashlib
import json
from datetime import datetime, timezone
from typing import Any

from .models import DigitalWastePassport, LedgerVerification

GENESIS_HASH = "0" * 64


def canonical_json(value: Any) -> str:
    return json.dumps(value, sort_keys=True, separators=(",", ":"), ensure_ascii=False, allow_nan=False)


def hash_block(deal: dict[str, Any], issued_at: str, prev_hash: str) -> str:
    payload = canonical_json({"deal": deal, "issued_at": issued_at, "prev_hash": prev_hash})
    return hashlib.sha256(payload.encode("utf-8")).hexdigest()


def mint(chain: list[DigitalWastePassport], deal: dict[str, Any], issued_at: str | None = None) -> DigitalWastePassport:
    # Round-trip through JSON so the stored deal is exactly what was hashed.
    deal = json.loads(canonical_json(deal))
    issued_at = issued_at or datetime.now(timezone.utc).isoformat(timespec="milliseconds").replace("+00:00", "Z")
    prev = chain[-1].record_hash if chain else GENESIS_HASH
    return DigitalWastePassport(
        block_index=len(chain) + 1,
        deal=deal,
        issued_at=issued_at,
        prev_hash=prev,
        record_hash=hash_block(deal, issued_at, prev),
    )


def verify(chain: list[DigitalWastePassport]) -> LedgerVerification:
    prev = GENESIS_HASH
    for i, block in enumerate(chain, start=1):
        if block.prev_hash != prev:
            return LedgerVerification(
                valid=False,
                message=f"Chain broken at block #{i} ({block.record_hash[:16]}...). Previous hash mismatch.",
                count=len(chain),
            )
        if hash_block(block.deal, block.issued_at, block.prev_hash) != block.record_hash:
            return LedgerVerification(
                valid=False,
                message=f"Tampering detected at block #{i} ({block.record_hash[:16]}...). SHA-256 payload integrity check failed.",
                count=len(chain),
            )
        prev = block.record_hash
    return LedgerVerification(
        valid=True, message=f"Chain valid: {len(chain)} Digital Waste Passports cryptographically verified.", count=len(chain)
    )
