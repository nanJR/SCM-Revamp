-- Lets seed.sql run more than once without duplicating seed facilities.
create unique index seed_facility_docs_id_key on public.seed_facility_docs ((doc ->> 'id'));
