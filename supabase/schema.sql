-- Verifi — run this once in the Supabase SQL editor.
-- Dashboard → SQL Editor → New query → paste → Run.

create table if not exists public.students (
  id            text primary key,
  name          text not null,
  initials      text not null,
  cluster       text not null,
  status        text not null default 'pending',
  confirmed_by  text,
  confirmed_at  timestamptz,
  place         text,
  lat           double precision,
  lon           double precision,
  accuracy      double precision,
  updated_at    timestamptz not null default now()
);

create table if not exists public.scans (
  id           bigserial primary key,
  student_id   text references public.students(id),
  scanned_by   text,
  code         text,
  lat          double precision,
  lon          double precision,
  created_at   timestamptz not null default now()
);

create table if not exists public.messages (
  id          bigserial primary key,
  author      text not null,
  role        text not null default 'staff',   -- staff | assistant | system
  body        text not null,
  place       text,
  created_at  timestamptz not null default now()
);

-- Demo access: this is a drill board, not private data. Anyone holding the
-- publishable key can read the board and confirm a student, which is exactly
-- what the phones in the room need to do.
alter table public.students enable row level security;
alter table public.scans    enable row level security;
alter table public.messages enable row level security;

drop policy if exists "read students"    on public.students;
drop policy if exists "confirm students" on public.students;
drop policy if exists "insert scans"     on public.scans;
drop policy if exists "read scans"       on public.scans;
drop policy if exists "read messages"    on public.messages;
drop policy if exists "write messages"   on public.messages;

create policy "read students"    on public.students for select using (true);
create policy "confirm students" on public.students for update using (true) with check (true);
create policy "read scans"       on public.scans    for select using (true);
create policy "insert scans"     on public.scans    for insert with check (true);
create policy "read messages"    on public.messages for select using (true);
create policy "write messages"   on public.messages for insert with check (true);

-- Push every status change to every phone watching the board.
alter publication supabase_realtime add table public.students;
alter publication supabase_realtime add table public.messages;

-- Roster: 106 students across 6 clusters.
insert into public.students (id, name, initials, cluster, status) values
  ('S-1007','Maya Reyes','MR','Chemistry','pending'),
  ('S-1014','Aidan Whitfield','AW','Chemistry','verified'),
  ('S-1021','Priya Raghunathan','PR','Chemistry','verified'),
  ('S-1028','Marcus Bell','MB','Chemistry','verified'),
  ('S-1035','Sofia Delgado','SD','Chemistry','verified'),
  ('S-1042','Ethan Kowalczyk','EK','Chemistry','verified'),
  ('S-1049','Naomi Osei','NO','Chemistry','verified'),
  ('S-1056','Liam Brennan','LB','Chemistry','verified'),
  ('S-1063','Chloe Nakamura','CN','Chemistry','verified'),
  ('S-1070','Isaiah Ford','IF','Chemistry','verified'),
  ('S-1077','Amara Diallo','AD','Chemistry','verified'),
  ('S-1084','Gabriel Santos','GS','Chemistry','verified'),
  ('S-1091','Hannah Lindqvist','HL','Chemistry','verified'),
  ('S-1098','Omar Haddad','OH','Chemistry','verified'),
  ('S-1105','Ruby Castellanos','RC','Chemistry','verified'),
  ('S-1112','Trevor Malone','TM','Chemistry','verified'),
  ('S-1119','Yasmin Farooqi','YF','Chemistry','verified'),
  ('S-1126','Caleb Ostrowski','CO','Chemistry','verified'),
  ('S-1133','Nina Petrov','NP','Chemistry','verified'),
  ('S-1140','Andre Beaumont','AB','Chemistry','verified'),
  ('S-1147','Leila Mansour','LM','Chemistry','verified'),
  ('S-1154','Jonah Ashworth','JA','Chemistry','verified'),
  ('S-1161','Simone Duval','SD','Chemistry','verified'),
  ('S-1168','Kai Tupou','KT','Chemistry','verified'),
  ('S-1175','Jordan Pike','JP','Gym','verified'),
  ('S-1182','Bianca Moreau','BM','Gym','verified'),
  ('S-1189','Dmitri Volkov','DV','Gym','verified'),
  ('S-1196','Aisha Nkemelu','AN','Gym','verified'),
  ('S-1203','Colton Reyes','CR','Gym','verified'),
  ('S-1210','Freya Lindgren','FL','Gym','verified'),
  ('S-1217','Malik Johnson','MJ','Gym','verified'),
  ('S-1224','Esperanza Ruiz','ER','Gym','verified'),
  ('S-1231','Tobias Krause','TK','Gym','verified'),
  ('S-1238','Willa Hutchins','WH','Gym','verified'),
  ('S-1245','Rafael Ibarra','RI','Gym','verified'),
  ('S-1252','Genevieve Cho','GC','Gym','verified'),
  ('S-1259','Santiago Vela','SV','Gym','verified'),
  ('S-1266','Delilah Grant','DG','Gym','verified'),
  ('S-1273','Nikhil Sharma','NS','Gym','verified'),
  ('S-1280','Astrid Halvorsen','AH','Gym','verified'),
  ('S-1287','Quinn Docherty','QD','Gym','verified'),
  ('S-1294','Tamara Belfast','TB','Gym','verified'),
  ('S-1301','Emeka Nwosu','EN','Gym','verified'),
  ('S-1308','Rosalie Tran','RT','Gym','verified'),
  ('S-1315','Beatrice Okafor','BO','Library','verified'),
  ('S-1322','Hugo Berrigan','HB','Library','verified'),
  ('S-1329','Lena Vasquez','LV','Library','verified'),
  ('S-1336','Arjun Patel','AP','Library','verified'),
  ('S-1343','Margot Sinclair','MS','Library','verified'),
  ('S-1350','Desmond Blake','DB','Library','verified'),
  ('S-1357','Ingrid Solberg','IS','Library','verified'),
  ('S-1364','Farid Rahimi','FR','Library','verified'),
  ('S-1371','Talia Bergman','TB','Library','verified'),
  ('S-1378','Xavier Montrose','XM','Library','verified'),
  ('S-1385','Josephine Wu','JW','Library','verified'),
  ('S-1392','Rowan Fitzgerald','RF','Library','verified'),
  ('S-1399','Camille Ndiaye','CN','Library','verified'),
  ('S-1406','Silas Kaufman','SK','Library','verified'),
  ('S-1413','Adaeze Obi','AO','Room 204','verified'),
  ('S-1420','Mateo Guerrero','MG','Room 204','verified'),
  ('S-1427','Harriet Coombs','HC','Room 204','verified'),
  ('S-1434','Zaid Al-Amin','ZA','Room 204','verified'),
  ('S-1441','Poppy Radcliffe','PR','Room 204','verified'),
  ('S-1448','Owen Kavanagh','OK','Room 204','verified'),
  ('S-1455','Suki Yamamoto','SY','Room 204','verified'),
  ('S-1462','Bennett Crowley','BC','Room 204','verified'),
  ('S-1469','Ilana Rosenfeld','IR','Room 204','verified'),
  ('S-1476','Diego Marchetti','DM','Room 204','verified'),
  ('S-1483','Nadia Petrosyan','NP','Room 204','verified'),
  ('S-1490','Grayson Tull','GT','Room 204','verified'),
  ('S-1497','Fatima Bello','FB','Room 204','verified'),
  ('S-1504','Oscar Lindqvist','OL','Room 204','verified'),
  ('S-1511','Wren Salisbury','WS','Room 204','verified'),
  ('S-1518','Julius Ekwueme','JE','Room 204','verified'),
  ('S-1525','Marisol Cabrera','MC','Room 204','verified'),
  ('S-1532','Theodore Pham','TP','Room 204','verified'),
  ('S-1539','Clara Vandenberg','CV','Room 204','verified'),
  ('S-1546','Emmett Doyle','ED','Room 204','verified'),
  ('S-1553','Zuri Achebe','ZA','Room 204','verified'),
  ('S-1560','Roman Sokolov','RS','Room 204','verified'),
  ('S-1567','Bethany Oyelaran','BO','Room 204','verified'),
  ('S-1574','Anton Berger','AB','Room 204','verified'),
  ('S-1581','Imani Carter','IC','Cafeteria','verified'),
  ('S-1588','Lucas Ferreira','LF','Cafeteria','verified'),
  ('S-1595','Sadie Okonkwo','SO','Cafeteria','verified'),
  ('S-1602','Pierre Lamarche','PL','Cafeteria','verified'),
  ('S-1609','Anya Kuznetsova','AK','Cafeteria','verified'),
  ('S-1616','Kwame Boateng','KB','Cafeteria','verified'),
  ('S-1623','Elodie Marchand','EM','Cafeteria','verified'),
  ('S-1630','Braden Hollis','BH','Cafeteria','verified'),
  ('S-1637','Mira Chandrasekar','MC','Cafeteria','verified'),
  ('S-1644','Nolan Byrne','NB','Cafeteria','verified'),
  ('S-1651','Saoirse Kelleher','SK','Cafeteria','verified'),
  ('S-1658','Victor Ashcombe','VA','Cafeteria','verified'),
  ('S-1665','Layla Hakimi','LH','Cafeteria','verified'),
  ('S-1672','Grant Whitmore','GW','Cafeteria','verified'),
  ('S-1679','Odessa Klein','OK','Cafeteria','verified'),
  ('S-1686','Finnegan Rourke','FR','Cafeteria','verified'),
  ('S-1693','Amelie Dubois','AD','Cafeteria','verified'),
  ('S-1700','Terrence Adeyemi','TA','Cafeteria','verified'),
  ('S-1707','Nathaniel Orozco','NO','Absent','absent'),
  ('S-1714','Sylvie Rousseau','SR','Absent','absent'),
  ('S-1721','Damon Achterberg','DA','Absent','absent'),
  ('S-1728','Hala Suleiman','HS','Absent','absent'),
  ('S-1735','Peter Vandermeer','PV','Absent','absent'),
  ('S-1742','Ruth Alderman','RA','Absent','absent')
on conflict (id) do update set
  name = excluded.name, initials = excluded.initials,
  cluster = excluded.cluster, status = excluded.status,
  confirmed_by = null, confirmed_at = null, place = null,
  lat = null, lon = null, accuracy = null, updated_at = now();

-- Reset the drill at any time:
--   update public.students set status = case when cluster = 'Absent' then 'absent'
--     when name = 'Maya Reyes' then 'pending' else 'verified' end,
--     confirmed_by = null, confirmed_at = null;
