-- ═══════════════════════════════════════════════════════════════════════════
-- Verifi — locating a student nobody can find.
--
-- Run this once in the SQL editor, on top of schema.sql. It is additive and
-- safe to run twice. (schema.sql already contains all of this, so a full
-- rebuild does not need it.)
--
-- The rules this schema exists to enforce, rather than merely describe:
--
--   · tracking can only be asked for while a student is unaccounted for
--   · a request is a request — 'asked' never becomes 'sharing' on its own
--   · silence is not consent, so there is no timer that flips the state
--   · an override is a named person's decision with a written reason, and it
--     is stored as a different state so nobody can later mistake it for
--     agreement
--   · every track expires, and the expiry is written down at the moment the
--     tracking starts rather than hoped for afterwards
-- ═══════════════════════════════════════════════════════════════════════════

drop table if exists public.track_points cascade;
drop table if exists public.tracking     cascade;

create table public.tracking (
  student_id      text primary key references public.students(id) on delete cascade,
  -- asked      the student has been asked and has not answered
  -- sharing    the student said yes
  -- refused    the student said no. A final answer, not a retry prompt.
  -- overridden a named administrator turned it on without agreement
  -- ended      finished: found, revoked, event over, or expired
  state           text not null check (state in ('asked', 'sharing', 'refused', 'overridden', 'ended')),
  asked_by        text,
  asked_at        timestamptz not null default now(),
  answered_at     timestamptz,
  -- Only ever set for 'overridden'. Both columns, or neither.
  overridden_by   text,
  override_reason text,
  ended_reason    text,
  -- Written when tracking begins, not when somebody remembers to stop it.
  expires_at      timestamptz,
  updated_at      timestamptz not null default now(),
  constraint override_needs_a_name_and_a_reason check (
    state <> 'overridden' or (overridden_by is not null and override_reason is not null)
  )
);

-- The track itself. One row per fix the student's own device reported.
create table public.track_points (
  id          bigserial primary key,
  student_id  text not null references public.students(id) on delete cascade,
  lat         double precision not null,
  lon         double precision not null,
  accuracy    double precision,
  place       text,
  created_at  timestamptz not null default now()
);

create index track_points_student_idx on public.track_points (student_id, created_at desc);

alter table public.tracking     enable row level security;
alter table public.track_points enable row level security;

create policy "read tracking"      on public.tracking     for select using (true);
create policy "write tracking"     on public.tracking     for insert with check (true);
create policy "update tracking"    on public.tracking     for update using (true) with check (true);
create policy "read track points"  on public.track_points for select using (true);
create policy "write track points" on public.track_points for insert with check (true);

alter publication supabase_realtime add table public.tracking;
alter publication supabase_realtime add table public.track_points;
