-- ============================================================
-- Ship2Aruba — Supabase Schema
-- Run this in your Supabase SQL Editor
-- ============================================================

-- Enable UUID extension
create extension if not exists "uuid-ossp";

-- ============================================================
-- PROFILES (extends auth.users)
-- ============================================================
create table public.profiles (
  id          uuid primary key references auth.users(id) on delete cascade,
  email       text not null,
  full_name   text not null,
  role        text not null check (role in ('admin', 'client')),
  suite_number text unique,
  created_at  timestamptz not null default now()
);

-- Auto-create profile on sign-up
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiles (id, email, full_name, role, suite_number)
  values (
    new.id,
    new.email,
    coalesce(new.raw_user_meta_data->>'full_name', 'User'),
    coalesce(new.raw_user_meta_data->>'role', 'client'),
    new.raw_user_meta_data->>'suite_number'
  );
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

-- ============================================================
-- PACKAGES
-- ============================================================
create table public.packages (
  id                   uuid primary key default uuid_generate_v4(),
  tracking_number      text not null unique,
  width_cm             numeric(8,2) not null check (width_cm > 0),
  height_cm            numeric(8,2) not null check (height_cm > 0),
  length_cm            numeric(8,2) not null check (length_cm > 0),
  weight_kg            numeric(8,3) not null check (weight_kg > 0),
  contents_description text not null,
  status               text not null default 'ready_to_send'
                         check (status in (
                           'ready_to_send',
                           'pending_invoice_review',
                           'invoice_approved',
                           'ship_requested',
                           'shipped',
                           'ready_for_pickup',
                           'delivered'
                         )),
  client_id            uuid not null references public.profiles(id) on delete restrict,
  invoice_file_path    text,
  created_at           timestamptz not null default now(),
  updated_at           timestamptz not null default now()
);

-- Auto-update updated_at
create or replace function public.set_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger packages_updated_at
  before update on public.packages
  for each row execute procedure public.set_updated_at();

-- Enforce valid status transitions at DB level
create or replace function public.validate_package_status_transition()
returns trigger language plpgsql as $$
begin
  -- Only enforce if status is actually changing
  if old.status = new.status then
    return new;
  end if;

  -- Define valid transitions
  if not (
    (old.status = 'ready_to_send'            and new.status = 'pending_invoice_review') or
    (old.status = 'pending_invoice_review'   and new.status = 'invoice_approved')       or
    (old.status = 'pending_invoice_review'   and new.status = 'pending_invoice_review') or -- re-upload
    (old.status = 'invoice_approved'         and new.status = 'ship_requested')         or
    (old.status = 'ship_requested'           and new.status = 'shipped')                or
    (old.status = 'shipped'                  and new.status = 'ready_for_pickup')       or
    (old.status = 'shipped'                  and new.status = 'delivered')              or
    (old.status = 'ready_for_pickup'         and new.status = 'delivered')
  ) then
    raise exception 'Invalid status transition: % → %', old.status, new.status
      using errcode = 'P0001';
  end if;

  return new;
end;
$$;

create trigger enforce_package_status_transition
  before update of status on public.packages
  for each row execute procedure public.validate_package_status_transition();

-- ============================================================
-- INVOICES
-- ============================================================
create table public.invoices (
  id             uuid primary key default uuid_generate_v4(),
  package_id     uuid not null unique references public.packages(id) on delete cascade,
  file_path      text not null,
  file_name      text not null,
  upload_date    timestamptz not null default now(),
  review_status  text not null default 'pending'
                   check (review_status in ('pending', 'approved', 'needs_review')),
  admin_notes    text,
  reviewed_at    timestamptz,
  reviewed_by    uuid references public.profiles(id) on delete set null
);

-- ============================================================
-- SHIP REQUESTS
-- ============================================================
create table public.ship_requests (
  id           uuid primary key default uuid_generate_v4(),
  client_id    uuid not null references public.profiles(id) on delete restrict,
  status       text not null default 'pending'
                 check (status in ('pending', 'processed')),
  submitted_at timestamptz not null default now(),
  processed_at timestamptz,
  processed_by uuid references public.profiles(id) on delete set null
);

-- Junction table: one ship request → many packages
create table public.ship_request_packages (
  ship_request_id uuid not null references public.ship_requests(id) on delete cascade,
  package_id      uuid not null references public.packages(id) on delete restrict,
  primary key (ship_request_id, package_id)
);

-- ============================================================
-- STATUS HISTORY (audit log)
-- ============================================================
create table public.status_history (
  id               uuid primary key default uuid_generate_v4(),
  package_id       uuid not null references public.packages(id) on delete cascade,
  old_status       text,
  new_status       text not null,
  changed_by_id    uuid not null references public.profiles(id) on delete restrict,
  changed_by_role  text not null check (changed_by_role in ('admin', 'client')),
  changed_at       timestamptz not null default now(),
  note             text
);

-- ============================================================
-- ROW LEVEL SECURITY
-- ============================================================
alter table public.profiles enable row level security;
alter table public.packages enable row level security;
alter table public.invoices enable row level security;
alter table public.ship_requests enable row level security;
alter table public.ship_request_packages enable row level security;
alter table public.status_history enable row level security;

-- Helper function
create or replace function public.get_my_role()
returns text language sql security definer as $$
  select role from public.profiles where id = auth.uid();
$$;

-- PROFILES policies
create policy "Users can view own profile"
  on public.profiles for select using (id = auth.uid());

create policy "Admins can view all profiles"
  on public.profiles for select using (public.get_my_role() = 'admin');

-- PACKAGES policies
create policy "Admins have full access to packages"
  on public.packages for all using (public.get_my_role() = 'admin');

create policy "Clients can view own packages"
  on public.packages for select using (client_id = auth.uid());

create policy "Clients can update own packages"
  on public.packages for update using (client_id = auth.uid());

-- INVOICES policies
create policy "Admins have full access to invoices"
  on public.invoices for all using (public.get_my_role() = 'admin');

create policy "Clients can manage own invoices"
  on public.invoices for all using (
    package_id in (
      select id from public.packages where client_id = auth.uid()
    )
  );

-- SHIP REQUESTS policies
create policy "Admins have full access to ship requests"
  on public.ship_requests for all using (public.get_my_role() = 'admin');

create policy "Clients can manage own ship requests"
  on public.ship_requests for all using (client_id = auth.uid());

-- SHIP REQUEST PACKAGES policies
create policy "Admins have full access to ship request packages"
  on public.ship_request_packages for all using (public.get_my_role() = 'admin');

create policy "Clients can manage own ship request packages"
  on public.ship_request_packages for all using (
    ship_request_id in (
      select id from public.ship_requests where client_id = auth.uid()
    )
  );

-- STATUS HISTORY policies
create policy "Admins can view all history"
  on public.status_history for all using (public.get_my_role() = 'admin');

create policy "Clients can view own package history"
  on public.status_history for select using (
    package_id in (
      select id from public.packages where client_id = auth.uid()
    )
  );

create policy "Clients can insert history for own packages"
  on public.status_history for insert with check (
    package_id in (
      select id from public.packages where client_id = auth.uid()
    )
  );

-- ============================================================
-- STORAGE: invoices bucket
-- ============================================================
-- Run this in SQL editor:
insert into storage.buckets (id, name, public)
values ('invoices', 'invoices', false)
on conflict (id) do nothing;

-- Storage policies
create policy "Authenticated users can upload invoices"
  on storage.objects for insert
  to authenticated
  with check (bucket_id = 'invoices');

create policy "Users can view own invoices"
  on storage.objects for select
  to authenticated
  using (
    bucket_id = 'invoices' and
    (public.get_my_role() = 'admin' or auth.uid()::text = split_part(name, '/', 1))
  );

create policy "Users can replace own invoices"
  on storage.objects for update
  to authenticated
  using (
    bucket_id = 'invoices' and
    (public.get_my_role() = 'admin' or auth.uid()::text = split_part(name, '/', 1))
  );
