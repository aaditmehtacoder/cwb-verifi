-- Verifi, messages thread. Run this in the Supabase SQL editor.
-- Safe to run on top of the schema you already applied.

create table if not exists public.messages (
  id          bigserial primary key,
  author      text not null,
  role        text not null default 'staff',   -- staff | assistant | system
  body        text not null,
  place       text,
  created_at  timestamptz not null default now()
);


alter table public.messages enable row level security;

drop policy if exists "read messages"  on public.messages;
drop policy if exists "write messages" on public.messages;
create policy "read messages"  on public.messages for select using (true);
create policy "write messages" on public.messages for insert with check (true);

alter publication supabase_realtime add table public.messages;

insert into public.messages (author, role, body) values
  ('Northgate High', 'system', 'Drill started. Confirm your room and report anything unusual here.');
