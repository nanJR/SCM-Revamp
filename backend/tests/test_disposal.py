from datetime import date

from scm.disposal import load_sites, plan_disposal, rank_sites
from scm.logistics import select_carrier
from scm.store import InMemoryStore

AS_OF = date(2026, 9, 12)


def _store():
    return InMemoryStore()


def test_full_harohalli_tsdf_is_vetoed_and_next_site_used():
    s = _store()
    chrome = s.facilities()["F01"]  # Peenya chrome sludge: Harohalli TSDF ranks cheapest
    carrier = select_carrier(s.carriers(), 6.5, hazardous=True)
    assert rank_sites(chrome, 6.5, load_sites(), carrier)[0][0].id == "TSDF-HAROHALLI"

    result = plan_disposal(chrome, 6.5, load_sites(), s.carriers(), AS_OF)
    assert result.decision == "APPROVED"
    assert result.site_id == "TSDF-DABASPET"
    assert [r.site_id for r in result.rejected_sites] == ["TSDF-HAROHALLI"]
    assert "full" in result.rejected_sites[0].reason


def test_generator_pays_gate_fee_plus_freight():
    s = _store()
    result = plan_disposal(s.facilities()["F01"], 6.5, load_sites(), s.carriers(), AS_OF)
    assert result.total_cost_inr == round(result.gate_fee_inr_per_ton * 6.5 + result.freight_inr)
    assert result.total_cost_inr > 0


def test_chrome_sludge_only_goes_to_a_tsdf():
    s = _store()
    carrier = select_carrier(s.carriers(), 6.5, hazardous=True)
    kinds = {site.kind for site, _, _ in rank_sites(s.facilities()["F01"], 6.5, load_sites(), carrier)}
    assert kinds == {"tsdf"}


def test_expired_consent_blocks_disposal():
    s = _store()
    result = plan_disposal(s.facilities()["F06"], 8, load_sites(), s.carriers(), AS_OF)
    assert result.decision == "VETOED"
    assert "expired" in result.explanation
    assert result.site_id is None


def test_no_operating_site_means_veto():
    s = _store()
    closed = [x.model_copy(update={"status": "full"}) for x in load_sites()]
    result = plan_disposal(s.facilities()["F01"], 6.5, closed, s.carriers(), AS_OF)
    assert result.decision == "VETOED"
    assert len(result.rejected_sites) == 3  # every TSDF tried and refused
