"""Rounding helpers that match JavaScript's Math.round.

Python's round() uses banker's rounding (round(2.5) == 2), while the original
engine used Math.round (half rounds toward +infinity). Money and tonnage
figures must not drift between the two implementations, so every agent rounds
through these helpers.
"""

import math


def js_round(x: float) -> int:
    return math.floor(x + 0.5)


def round_to(x: float, places: int) -> float:
    factor = 10**places
    return js_round(x * factor) / factor
