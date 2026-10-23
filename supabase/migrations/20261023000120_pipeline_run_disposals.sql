-- Hazardous lots routed to (or blocked from) a KSPCB disposal site in each run.
alter table public.pipeline_runs add column disposals jsonb not null default '[]'::jsonb;
