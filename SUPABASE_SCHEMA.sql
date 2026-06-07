create extension if not exists pgcrypto;

create type public.profile_role as enum ('owner', 'staff');
create type public.reservation_status as enum ('confirmed', 'pending', 'cancelled');
create type public.reservation_type as enum ('occasional', 'fixed');

create table public.complexes (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  address text,
  phone text,
  created_at timestamptz not null default now()
);

create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  complex_id uuid not null references public.complexes(id) on delete cascade,
  full_name text not null,
  role public.profile_role not null,
  accepted_terms boolean not null default false,
  accepted_terms_at timestamptz,
  accepted_privacy boolean not null default false,
  accepted_privacy_at timestamptz,
  created_at timestamptz not null default now()
);

create table public.courts (
  id uuid primary key default gen_random_uuid(),
  complex_id uuid not null references public.complexes(id) on delete cascade,
  name text not null,
  type text not null default 'futbol5',
  active boolean not null default true,
  open_time time not null default '18:00',
  close_time time not null default '23:00',
  slot_step_minutes int not null default 60
);

create table public.price_rules (
  id uuid primary key default gen_random_uuid(),
  complex_id uuid not null references public.complexes(id) on delete cascade,
  court_id uuid references public.courts(id) on delete cascade,
  day_of_week int,
  start_time time,
  end_time time,
  price numeric(12, 2) not null
);

create table public.reservations (
  id uuid primary key default gen_random_uuid(),
  complex_id uuid not null references public.complexes(id) on delete cascade,
  court_id uuid not null references public.courts(id) on delete cascade,
  customer_name text not null,
  customer_phone text,
  starts_at timestamptz not null,
  ends_at timestamptz not null,
  status public.reservation_status not null default 'confirmed',
  type public.reservation_type not null default 'occasional',
  notes text,
  price numeric(12, 2) not null default 0,
  duration_minutes int not null default 60,
  created_by uuid references public.profiles(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.public_availability_slots (
  id uuid primary key default gen_random_uuid(),
  complex_id uuid not null references public.complexes(id) on delete cascade,
  court_id uuid not null references public.courts(id) on delete cascade,
  slot_date date not null,
  slot_time time not null,
  published boolean not null default true,
  created_at timestamptz not null default now(),
  unique (complex_id, court_id, slot_date, slot_time)
);

create table public.complex_settings (
  complex_id uuid primary key references public.complexes(id) on delete cascade,
  confirmation_lead_hours int not null default 24,
  base_price numeric(12, 2) not null default 0,
  valley_price numeric(12, 2) not null default 0,
  weekend_price numeric(12, 2) not null default 0
);

create table public.cancellations (
  id uuid primary key default gen_random_uuid(),
  complex_id uuid not null references public.complexes(id) on delete cascade,
  reservation_id uuid not null references public.reservations(id) on delete cascade,
  cancelled_at timestamptz not null default now(),
  reason text,
  last_minute boolean not null default false,
  recovered boolean not null default false,
  estimated_lost_revenue numeric(12, 2) not null default 0
);

create table public.fixed_costs (
  id uuid primary key default gen_random_uuid(),
  complex_id uuid not null references public.complexes(id) on delete cascade,
  month date not null,
  electricity numeric(12, 2) not null default 0,
  gas numeric(12, 2) not null default 0,
  water numeric(12, 2) not null default 0,
  salaries numeric(12, 2) not null default 0,
  rent numeric(12, 2) not null default 0,
  taxes numeric(12, 2) not null default 0,
  maintenance numeric(12, 2) not null default 0,
  other numeric(12, 2) not null default 0,
  unique (complex_id, month)
);

alter table public.complexes enable row level security;
alter table public.profiles enable row level security;
alter table public.courts enable row level security;
alter table public.price_rules enable row level security;
alter table public.reservations enable row level security;
alter table public.cancellations enable row level security;
alter table public.fixed_costs enable row level security;
alter table public.public_availability_slots enable row level security;
alter table public.complex_settings enable row level security;

create or replace function public.current_complex_id()
returns uuid
language sql
stable
security definer
set search_path = public
as $$
  select complex_id from public.profiles where id = auth.uid()
$$;

create or replace function public.current_role()
returns public.profile_role
language sql
stable
security definer
set search_path = public
as $$
  select role from public.profiles where id = auth.uid()
$$;

create policy "profiles read own complex" on public.profiles
for select using (complex_id = public.current_complex_id() or id = auth.uid());

create policy "complex members read complex" on public.complexes
for select using (id = public.current_complex_id());

create policy "owner updates complex" on public.complexes
for update using (id = public.current_complex_id() and public.current_role() = 'owner');

create policy "members read courts" on public.courts
for select using (complex_id = public.current_complex_id());

create policy "owner manages courts" on public.courts
for all using (complex_id = public.current_complex_id() and public.current_role() = 'owner')
with check (complex_id = public.current_complex_id() and public.current_role() = 'owner');

create policy "members read price rules" on public.price_rules
for select using (complex_id = public.current_complex_id());

create policy "owner manages price rules" on public.price_rules
for all using (complex_id = public.current_complex_id() and public.current_role() = 'owner')
with check (complex_id = public.current_complex_id() and public.current_role() = 'owner');

create policy "members manage reservations" on public.reservations
for all using (complex_id = public.current_complex_id())
with check (complex_id = public.current_complex_id());

create policy "members manage cancellations" on public.cancellations
for all using (complex_id = public.current_complex_id())
with check (complex_id = public.current_complex_id());

create policy "public reads published slots" on public.public_availability_slots
for select using (published = true);

create policy "members manage published slots" on public.public_availability_slots
for all using (complex_id = public.current_complex_id())
with check (complex_id = public.current_complex_id());

create policy "owner reads fixed costs" on public.fixed_costs
for select using (complex_id = public.current_complex_id() and public.current_role() = 'owner');

create policy "owner manages fixed costs" on public.fixed_costs
for all using (complex_id = public.current_complex_id() and public.current_role() = 'owner')
with check (complex_id = public.current_complex_id() and public.current_role() = 'owner');

create policy "members read settings" on public.complex_settings
for select using (complex_id = public.current_complex_id());

create policy "owner manages settings" on public.complex_settings
for all using (complex_id = public.current_complex_id() and public.current_role() = 'owner')
with check (complex_id = public.current_complex_id() and public.current_role() = 'owner');
