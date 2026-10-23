# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

SCM ReVamp is a Python/Supabase rebuild of a TypeScript hackathon engine (nanJR/SCM-Bit-N-Build-26): an industrial-symbiosis marketplace for Karnataka where deterministic agents pool waste lots, match sellers to buyers, negotiate price and freight, apply KSPCB rules, and mint a hash-chained Digital Waste Passport per approved deal. README.md has the full env-var table, role/permission matrix and Supabase notes.

## Commands

Backend (from `backend/`, Python ≥3.11):

```bash
python -m venv .venv && source .venv/bin/activate
pip install -e ".[dev]"
pytest                                          # all tests (asyncio_mode=auto, testpaths=tests)
pytest tests/test_ledger.py                     # one file
pytest tests/test_parity.py::test_pipeline_matches_legacy   # one test
uvicorn scm.api:app --reload                    # http://localhost:8000/docs
```

Frontend (from `frontend/`):

```bash
npm install
npm run dev     # :5173, proxies /api to SCM_API_URL or http://localhost:8000
npm run lint    # tsc --noEmit (there is no ESLint)
npm run build   # tsc --noEmit && vite build
```

Regenerate `supabase/seed.sql` after changing seed data or `scm/constants.py`: `python scripts/gen_seed_sql.py` (from repo root).

Defaults need no keys: in-memory store (`SCM_STORE=memory`), no LLM (`SCM_LLM_PROVIDER=none`), and auth off (`SCM_AUTH=off`, every caller is treated as admin).

## Architecture

**Pipeline** (`scm/pipeline.py::run_pipeline`) is the core and runs agents in a fixed order: `matchmaker.pool_micro_lots` → `find_candidates`/`rank_candidates` → `negotiation.negotiate` → `logistics.select_carrier`/`negotiate_freight` → cross-deal allocation audit (inline in pipeline) → `regulator.review_deal` → `paperwork.build_documents` → `ledger.mint`. Afterwards, leftover hazardous waste from unpooled sellers is routed by `disposal.plan_disposal` to a KSPCB site (`scm/data/kspcb_disposal_sites.json`) and also minted. Every step appends a `DecisionRecord` via the local `log()` helper; these feed `decision_log` and the Audit tab. Agents that need to explain things are `async` and take a `Narrator`.

**LLM is narration only** (`scm/llm.py`). Prices, vetoes and routes must stay in deterministic code; the `Narrator` returns the caller's fallback text when no provider/key is set. Don't let model output influence a decision.

**Parity with the legacy engine is a hard constraint.** `tests/test_parity.py` compares every price, round, route, carrier and verdict against `tests/golden/legacy_pipeline.json` (run with `Narrator("none")` and `as_of=date(2026, 9, 12)`). The only allowed departures are the deliberate fixes listed in README ("Bugs fixed or found"), e.g. `MIN_BILLABLE_KM` freight. Consequences:
- All money/tonnage rounding goes through `scm/numbers.py` (`js_round`, `round_to`), which mimic JS `Math.round`. Never use Python's `round()` for these figures.
- Changing agent logic that alters decisions means updating the golden file deliberately and documenting it in README.

**Ledger** (`scm/ledger.py`): passports are hashed over `canonical_json` of the full deal (nested fields included) and chained by previous hash. The chain is append-only (DB trigger in Supabase); runs append, never rewrite. `verify()` always checks the whole chain even when the response is scoped.

**Store** (`scm/store.py`): a `Store` Protocol with `InMemoryStore` (seeded from `scm/data/legacy_seed.json`; used by tests) and `SupabaseStore` (PostgREST with the service-role key, which bypasses RLS). `make_store()` chooses based on `SCM_STORE`. New persistence needs go into both implementations. In Supabase mode `reset()` calls `reset_seed_facilities()` and keeps passports/decisions; in memory mode it wipes everything.

**Auth and scoping** live in separate layers. `scm/auth.py::get_caller` (FastAPI dependency) builds a `Caller` from a Supabase JWT, reading role and linked facility/carrier from `profiles` with the user's own token so RLS applies. `require(caller, *roles)` gates endpoints. `scm/scope.py` then filters responses per role (party-to-deal, pooled-lot membership, carrier hauls), and `hide_prices` nulls other facilities' floor/ceiling. A new endpoint returning deals, passports, disposals or facilities must go through the matching `scope_*`/`hide_prices` helper. The same rules are mirrored in Supabase RLS (`supabase/migrations/*_row_level_security.sql`, `facility_private` table).

**API** (`scm/api.py`): endpoint paths match the old Express server so the React screens keep working. The module-level `store` and `narrator` are singletons, and tests share them through `TestClient(app)` (call `POST /api/reset` to start clean).

**Frontend**: Vite + React 18 + Tailwind v4 + shadcn/radix (`src/components/ui`). Every backend call goes through `src/lib/api.ts`, which attaches the Supabase access token when signed in. `src/types.ts` mirrors the Pydantic models in `scm/models.py`, so keep the two in sync. `src/lib/session.tsx` provides sign-in/role state. Without `frontend/.env.local`, the app runs in demo mode with a view-as picker. The UI hides actions the API would refuse for the caller's role.

**Supabase**: migrations in `supabase/migrations/` are applied in timestamp order and are already live on the project. Add new changes as new migration files rather than editing old ones. Facility locations are PostGIS `geography`. Facility/carrier ownership goes through `claim_facility`/`claim_carrier` (one claim each), and only admins can grant regulator/admin roles via `profiles`.
