from scm import constants as c
from scm.llm import Narrator
from scm.logistics import negotiate_freight
from scm.models import Carrier, RouteFeasibility


def _route(km: float) -> RouteFeasibility:
    # Only distance matters to freight negotiation.
    return RouteFeasibility.model_construct(distance_km=km)


CARRIER = Carrier(
    id="C", name="Test Haulage", cluster="Peenya", lat=0, lon=0, vehicle_type="10-Wheeler Truck",
    capacity_tons=300, rate_floor_inr_per_ton_km=1.8, hazmat_transport_license=False,
)


async def test_short_hops_are_billed_as_a_minimum_trip():
    tiny = await negotiate_freight(CARRIER, _route(0.11), 1200, 780, 120, "fly_ash", Narrator("none"))
    ten = await negotiate_freight(CARRIER, _route(c.MIN_BILLABLE_KM), 1200, 780, 120, "fly_ash", Narrator("none"))
    assert tiny.final_rate_inr_per_ton_km == ten.final_rate_inr_per_ton_km < 50
    assert tiny.total_freight_cost_inr == ten.total_freight_cost_inr


async def test_long_trips_are_unchanged_by_the_minimum():
    deal = await negotiate_freight(CARRIER, _route(30), 1200, 780, 120, "fly_ash", Narrator("none"))
    assert deal.total_freight_cost_inr == round(deal.final_rate_inr_per_ton_km * 30 * 120 + c.FIXED_DISPATCH_FEE_INR)
