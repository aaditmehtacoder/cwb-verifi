-- ═══════════════════════════════════════════════════════════════════════════
-- Verifi — the whole board, from nothing.
--
-- This file is destructive on purpose. It drops every Verifi table and builds
-- them again, so running it puts the demo back to its opening position no
-- matter what the last run-through left behind. That is the point: a demo you
-- cannot reset is a demo you get one take at.
--
-- Supabase dashboard → SQL Editor → New query → paste → Run.
-- Or, from the repo:  npm run db:reset
--
-- Opening position after this runs:
--   106 students · 99 verified · 1 pending (Maya Reyes) · 6 absent
--   every student holds a fixed six-digit code they are expected to know
--   two guardians on Maya's pickup list, each with a pass code
--   one system line in the thread
-- ═══════════════════════════════════════════════════════════════════════════

-- ── Wipe ────────────────────────────────────────────────────────────────────
-- Children first, then parents. `cascade` covers policies, indexes and any
-- publication membership left over from an earlier schema.
drop table if exists public.track_points   cascade;
drop table if exists public.tracking       cascade;
drop table if exists public.reunifications cascade;
drop table if exists public.guardians      cascade;
drop table if exists public.scans          cascade;
drop table if exists public.messages       cascade;
drop table if exists public.students       cascade;

-- ── Tables ──────────────────────────────────────────────────────────────────

create table public.students (
  id            text primary key,
  name          text not null,
  initials      text not null,
  cluster       text not null,
  grade         text,
  -- The code the student knows by heart. Recited aloud when the phone is dead.
  -- Derived below by the same arithmetic as codeFor() in src/data.js, so the
  -- app and the board never disagree. A real deployment issues random codes
  -- and stores only a hash; this is the one line that must change first.
  code          text,
  -- The code on the guardian's pickup pass. Different multiplier, so knowing a
  -- student's own code never yields the code that releases them.
  guardian_code text,
  status        text not null default 'pending'
                check (status in ('verified', 'pending', 'absent', 'reunified')),
  confirmed_by  text,
  confirmed_at  timestamptz,
  -- How the confirmation was made. An audit of a real event has to be able to
  -- tell a scanned code from a recited one from a staff member's word alone.
  method        text check (method in ('qr', 'recited', 'roster', 'vouched', 'guardian')),
  place         text,
  lat           double precision,
  lon           double precision,
  accuracy      double precision,
  updated_at    timestamptz not null default now()
);

create index students_status_idx  on public.students (status);
create index students_cluster_idx on public.students (cluster);
-- The no-phone path searches by name while a person is standing in front of you.
create index students_name_idx    on public.students (lower(name));

create table public.guardians (
  id          bigserial primary key,
  student_id  text not null references public.students(id) on delete cascade,
  name        text not null,
  relation    text,
  phone       text,
  created_at  timestamptz not null default now()
);

create index guardians_student_idx on public.guardians (student_id);

create table public.scans (
  id           bigserial primary key,
  student_id   text references public.students(id) on delete set null,
  scanned_by   text,
  code         text,
  -- 'qr' | 'recited' | 'roster' | 'vouched' | 'guardian'
  method       text,
  lat          double precision,
  lon          double precision,
  created_at   timestamptz not null default now()
);

create table public.reunifications (
  id            bigserial primary key,
  student_id    text not null references public.students(id) on delete cascade,
  guardian_name text not null,
  released_by   text,
  pass_code     text,
  created_at    timestamptz not null default now()
);

create table public.messages (
  id          bigserial primary key,
  author      text not null,
  role        text not null default 'staff',   -- staff | assistant | system
  body        text not null,
  place       text,
  created_at  timestamptz not null default now()
);

-- ── Locating a student nobody can find ──────────────────────────────────────
-- The rules below are enforced here rather than merely described: a request
-- never becomes agreement on its own, there is no timer that flips the state,
-- and an override is a named person's decision with a written reason, stored
-- as a different state so it can never later be mistaken for consent.
-- See supabase/tracking.sql for the same tables as a standalone migration.

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

create index messages_created_idx on public.messages (created_at);

-- ── Access ──────────────────────────────────────────────────────────────────
-- This is a drill board, not a student record system. Every phone in the
-- building holds the same publishable key and every one of them needs to read
-- the board and confirm a student, which is exactly what these policies allow
-- and nothing more. Before this carries a real roster it wants auth-scoped
-- policies; that is a deployment decision, not a demo one.

alter table public.students       enable row level security;
alter table public.guardians      enable row level security;
alter table public.scans          enable row level security;
alter table public.reunifications enable row level security;
alter table public.messages       enable row level security;
alter table public.tracking       enable row level security;
alter table public.track_points   enable row level security;

create policy "read students"      on public.students       for select using (true);
create policy "confirm students"   on public.students       for update using (true) with check (true);
create policy "read guardians"     on public.guardians      for select using (true);
create policy "read scans"         on public.scans          for select using (true);
create policy "insert scans"       on public.scans          for insert with check (true);
create policy "read reunifications"  on public.reunifications for select using (true);
create policy "write reunifications" on public.reunifications for insert with check (true);
create policy "read messages"      on public.messages       for select using (true);
create policy "write messages"     on public.messages       for insert with check (true);
create policy "read tracking"      on public.tracking       for select using (true);
create policy "write tracking"     on public.tracking       for insert with check (true);
create policy "update tracking"    on public.tracking       for update using (true) with check (true);
create policy "read track points"  on public.track_points   for select using (true);
create policy "write track points" on public.track_points   for insert with check (true);

-- Push every status change to every phone watching the board.
alter publication supabase_realtime add table public.students;
alter publication supabase_realtime add table public.messages;
alter publication supabase_realtime add table public.tracking;
alter publication supabase_realtime add table public.track_points;

-- ── Roster ──────────────────────────────────────────────────────────────────
-- 106 students across 6 clusters. Grade 10 throughout; the absent six were
-- marked before the event and are not on campus.

insert into public.students (id, name, initials, cluster, grade, status) values
  ('S-1007','Maya Reyes','MR','Chemistry','10','pending'),
  ('S-1014','Aidan Whitfield','AW','Chemistry','10','verified'),
  ('S-1021','Priya Raghunathan','PR','Chemistry','10','verified'),
  ('S-1028','Marcus Bell','MB','Chemistry','10','verified'),
  ('S-1035','Sofia Delgado','SD','Chemistry','10','verified'),
  ('S-1042','Ethan Kowalczyk','EK','Chemistry','10','verified'),
  ('S-1049','Naomi Osei','NO','Chemistry','10','verified'),
  ('S-1056','Liam Brennan','LB','Chemistry','10','verified'),
  ('S-1063','Chloe Nakamura','CN','Chemistry','10','verified'),
  ('S-1070','Isaiah Ford','IF','Chemistry','10','verified'),
  ('S-1077','Amara Diallo','AD','Chemistry','10','verified'),
  ('S-1084','Gabriel Santos','GS','Chemistry','10','verified'),
  ('S-1091','Hannah Lindqvist','HL','Chemistry','10','verified'),
  ('S-1098','Omar Haddad','OH','Chemistry','10','verified'),
  ('S-1105','Ruby Castellanos','RC','Chemistry','10','verified'),
  ('S-1112','Trevor Malone','TM','Chemistry','10','verified'),
  ('S-1119','Yasmin Farooqi','YF','Chemistry','10','verified'),
  ('S-1126','Caleb Ostrowski','CO','Chemistry','10','verified'),
  ('S-1133','Nina Petrov','NP','Chemistry','10','verified'),
  ('S-1140','Andre Beaumont','AB','Chemistry','10','verified'),
  ('S-1147','Leila Mansour','LM','Chemistry','10','verified'),
  ('S-1154','Jonah Ashworth','JA','Chemistry','10','verified'),
  ('S-1161','Simone Duval','SD','Chemistry','10','verified'),
  ('S-1168','Kai Tupou','KT','Chemistry','10','verified'),
  ('S-1175','Jordan Pike','JP','Gym','10','verified'),
  ('S-1182','Bianca Moreau','BM','Gym','10','verified'),
  ('S-1189','Dmitri Volkov','DV','Gym','10','verified'),
  ('S-1196','Aisha Nkemelu','AN','Gym','10','verified'),
  ('S-1203','Colton Reyes','CR','Gym','10','verified'),
  ('S-1210','Freya Lindgren','FL','Gym','10','verified'),
  ('S-1217','Malik Johnson','MJ','Gym','10','verified'),
  ('S-1224','Esperanza Ruiz','ER','Gym','10','verified'),
  ('S-1231','Tobias Krause','TK','Gym','10','verified'),
  ('S-1238','Willa Hutchins','WH','Gym','10','verified'),
  ('S-1245','Rafael Ibarra','RI','Gym','10','verified'),
  ('S-1252','Genevieve Cho','GC','Gym','10','verified'),
  ('S-1259','Santiago Vela','SV','Gym','10','verified'),
  ('S-1266','Delilah Grant','DG','Gym','10','verified'),
  ('S-1273','Nikhil Sharma','NS','Gym','10','verified'),
  ('S-1280','Astrid Halvorsen','AH','Gym','10','verified'),
  ('S-1287','Quinn Docherty','QD','Gym','10','verified'),
  ('S-1294','Tamara Belfast','TB','Gym','10','verified'),
  ('S-1301','Emeka Nwosu','EN','Gym','10','verified'),
  ('S-1308','Rosalie Tran','RT','Gym','10','verified'),
  ('S-1315','Beatrice Okafor','BO','Library','10','verified'),
  ('S-1322','Hugo Berrigan','HB','Library','10','verified'),
  ('S-1329','Lena Vasquez','LV','Library','10','verified'),
  ('S-1336','Arjun Patel','AP','Library','10','verified'),
  ('S-1343','Margot Sinclair','MS','Library','10','verified'),
  ('S-1350','Desmond Blake','DB','Library','10','verified'),
  ('S-1357','Ingrid Solberg','IS','Library','10','verified'),
  ('S-1364','Farid Rahimi','FR','Library','10','verified'),
  ('S-1371','Talia Bergman','TB','Library','10','verified'),
  ('S-1378','Xavier Montrose','XM','Library','10','verified'),
  ('S-1385','Josephine Wu','JW','Library','10','verified'),
  ('S-1392','Rowan Fitzgerald','RF','Library','10','verified'),
  ('S-1399','Camille Ndiaye','CN','Library','10','verified'),
  ('S-1406','Silas Kaufman','SK','Library','10','verified'),
  ('S-1413','Adaeze Obi','AO','Room 204','10','verified'),
  ('S-1420','Mateo Guerrero','MG','Room 204','10','verified'),
  ('S-1427','Harriet Coombs','HC','Room 204','10','verified'),
  ('S-1434','Zaid Al-Amin','ZA','Room 204','10','verified'),
  ('S-1441','Poppy Radcliffe','PR','Room 204','10','verified'),
  ('S-1448','Owen Kavanagh','OK','Room 204','10','verified'),
  ('S-1455','Suki Yamamoto','SY','Room 204','10','verified'),
  ('S-1462','Bennett Crowley','BC','Room 204','10','verified'),
  ('S-1469','Ilana Rosenfeld','IR','Room 204','10','verified'),
  ('S-1476','Diego Marchetti','DM','Room 204','10','verified'),
  ('S-1483','Nadia Petrosyan','NP','Room 204','10','verified'),
  ('S-1490','Grayson Tull','GT','Room 204','10','verified'),
  ('S-1497','Fatima Bello','FB','Room 204','10','verified'),
  ('S-1504','Oscar Lindqvist','OL','Room 204','10','verified'),
  ('S-1511','Wren Salisbury','WS','Room 204','10','verified'),
  ('S-1518','Julius Ekwueme','JE','Room 204','10','verified'),
  ('S-1525','Marisol Cabrera','MC','Room 204','10','verified'),
  ('S-1532','Theodore Pham','TP','Room 204','10','verified'),
  ('S-1539','Clara Vandenberg','CV','Room 204','10','verified'),
  ('S-1546','Emmett Doyle','ED','Room 204','10','verified'),
  ('S-1553','Zuri Achebe','ZA','Room 204','10','verified'),
  ('S-1560','Roman Sokolov','RS','Room 204','10','verified'),
  ('S-1567','Bethany Oyelaran','BO','Room 204','10','verified'),
  ('S-1574','Anton Berger','AB','Room 204','10','verified'),
  ('S-1581','Imani Carter','IC','Cafeteria','10','verified'),
  ('S-1588','Lucas Ferreira','LF','Cafeteria','10','verified'),
  ('S-1595','Sadie Okonkwo','SO','Cafeteria','10','verified'),
  ('S-1602','Pierre Lamarche','PL','Cafeteria','10','verified'),
  ('S-1609','Anya Kuznetsova','AK','Cafeteria','10','verified'),
  ('S-1616','Kwame Boateng','KB','Cafeteria','10','verified'),
  ('S-1623','Elodie Marchand','EM','Cafeteria','10','verified'),
  ('S-1630','Braden Hollis','BH','Cafeteria','10','verified'),
  ('S-1637','Mira Chandrasekar','MC','Cafeteria','10','verified'),
  ('S-1644','Nolan Byrne','NB','Cafeteria','10','verified'),
  ('S-1651','Saoirse Kelleher','SK','Cafeteria','10','verified'),
  ('S-1658','Victor Ashcombe','VA','Cafeteria','10','verified'),
  ('S-1665','Layla Hakimi','LH','Cafeteria','10','verified'),
  ('S-1672','Grant Whitmore','GW','Cafeteria','10','verified'),
  ('S-1679','Odessa Klein','OK','Cafeteria','10','verified'),
  ('S-1686','Finnegan Rourke','FR','Cafeteria','10','verified'),
  ('S-1693','Amelie Dubois','AD','Cafeteria','10','verified'),
  ('S-1700','Terrence Adeyemi','TA','Cafeteria','10','verified'),
  ('S-1707','Nathaniel Orozco','NO','Absent','10','absent'),
  ('S-1714','Sylvie Rousseau','SR','Absent','10','absent'),
  ('S-1721','Damon Achterberg','DA','Absent','10','absent'),
  ('S-1728','Hala Suleiman','HS','Absent','10','absent'),
  ('S-1735','Peter Vandermeer','PV','Absent','10','absent'),
  ('S-1742','Ruth Alderman','RA','Absent','10','absent');

-- Devin Okoro (S-9042) is deliberately absent from this table. He is assigned
-- to the Gym and turns up in the Chemistry room, and a student standing in a
-- room that is not theirs is the case the board has to survive. The teacher
-- adds him during the run-through; seeding him here would give the ending away.

-- The 99 who were already confirmed were confirmed by the teacher holding that
-- room, from their roster. Saying so is the difference between a board that
-- reads as real and a board that reads as seeded.
update public.students set
  confirmed_by = case cluster
    when 'Chemistry' then 'T. Whitfield'
    when 'Gym'       then 'D. Okonjo'
    when 'Library'   then 'L. Marchetti'
    when 'Room 204'  then 'K. Ansel'
    when 'Cafeteria' then 'P. Whitcomb'
  end,
  confirmed_at = now(),
  method = 'roster',
  place = cluster
where status = 'verified';

-- The codes. Same arithmetic as codeFor() and guardianCodeFor() in src/data.js.
update public.students set
  code          = (100000 + (substring(id from 3)::bigint * 7919) % 900000)::text,
  guardian_code = (100000 + (substring(id from 3)::bigint * 6271) % 900000)::text;

-- ── Pickup list ─────────────────────────────────────────────────────────────
insert into public.guardians (student_id, name, relation, phone) values
  ('S-1007','Elena Reyes','Mother','(503) 555-0148'),
  ('S-1007','Victor Reyes','Father','(503) 555-0192');

-- ── The thread starts empty but for the line that opens an event ────────────
insert into public.messages (author, role, body) values
  ('Northgate High', 'system', 'Board reset. No event running. An administrator starts one with the start word.');

-- ── What you should see ─────────────────────────────────────────────────────
-- select status, count(*) from public.students group by status order by status;
--   absent 6 · pending 1 · verified 99
-- select name, code from public.students where name = 'Maya Reyes';
--   Maya Reyes · 874433
