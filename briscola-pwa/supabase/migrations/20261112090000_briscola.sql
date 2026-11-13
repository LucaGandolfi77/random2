-- Briscola 1v1 — public rooms and private game state.
-- Deploy with: supabase db push
-- The Edge Function uses the service role key; clients only read rooms they belong to
-- and only their own hand.

create extension if not exists pgcrypto;

create table if not exists public.rooms (
  id uuid primary key default gen_random_uuid(),
  code text not null unique,
  host_id uuid not null references auth.users(id) on delete cascade,
  guest_id uuid references auth.users(id) on delete set null,
  host_name text not null,
  guest_name text,
  status text not null default 'waiting' check (status in ('waiting', 'playing', 'finished')),
  public_state jsonb not null default '{}'::jsonb,
  version integer not null default 1,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.room_secrets (
  room_id uuid primary key references public.rooms(id) on delete cascade,
  state jsonb not null
);

create table if not exists public.room_hands (
  room_id uuid not null references public.rooms(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  cards jsonb not null default '[]'::jsonb,
  updated_at timestamptz not null default now(),
  primary key (room_id, user_id)
);

create index if not exists rooms_code_idx on public.rooms (upper(code));
create index if not exists rooms_host_idx on public.rooms (host_id);
create index if not exists rooms_guest_idx on public.rooms (guest_id);
create index if not exists room_hands_user_idx on public.room_hands (user_id);

alter table public.rooms enable row level security;
alter table public.room_secrets enable row level security;
alter table public.room_hands enable row level security;

drop policy if exists "rooms_read_members" on public.rooms;
create policy "rooms_read_members"
  on public.rooms for select
  to authenticated
  using (auth.uid() = host_id or auth.uid() = guest_id);

drop policy if exists "hands_read_own" on public.room_hands;
create policy "hands_read_own"
  on public.room_hands for select
  to authenticated
  using (auth.uid() = user_id);

-- Clients never write rooms/hands/secrets directly. Only the Edge Function does,
-- through the service role key. No insert/update/delete policies are declared.

grant select on public.rooms to authenticated;
grant select on public.room_hands to authenticated;
revoke all on public.room_secrets from anon, authenticated;

alter table public.rooms replica identity full;

do $$
begin
  alter publication supabase_realtime add table public.rooms;
exception
  when duplicate_object then null;
end $$;
