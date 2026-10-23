from scm.ledger import GENESIS_HASH, canonical_json, mint, verify


def _chain(n=3):
    chain = []
    for i in range(n):
        chain.append(mint(chain, {"seller_id": f"S{i}", "agreed_price_per_ton": 1000 + i, "nested": {"b": 1, "a": [i]}}))
    return chain


def test_valid_chain():
    chain = _chain()
    assert chain[0].prev_hash == GENESIS_HASH
    assert chain[2].prev_hash == chain[1].record_hash
    assert verify(chain).valid


def test_editing_a_nested_deal_field_is_detected():
    # The hackathon ledger hashed with a JSON.stringify replacer that dropped
    # nested keys, so this edit used to go unnoticed.
    chain = _chain()
    chain[1].deal["agreed_price_per_ton"] = 1
    result = verify(chain)
    assert not result.valid
    assert "block #2" in result.message


def test_reordered_block_breaks_the_chain():
    chain = _chain()
    chain[1], chain[2] = chain[2], chain[1]
    assert "Previous hash mismatch" in verify(chain).message


def test_canonical_json_is_key_order_independent():
    assert canonical_json({"b": 1, "a": {"d": 2, "c": 3}}) == canonical_json({"a": {"c": 3, "d": 2}, "b": 1})
