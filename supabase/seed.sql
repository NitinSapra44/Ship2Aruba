-- ============================================================
-- Ship2Aruba — Seed Data
-- Run AFTER schema.sql
-- ============================================================
-- NOTE: Create users via Supabase Auth first (Dashboard > Auth > Users)
-- or use the seed script below with the service role.
--
-- Admin:  admin@ship2aruba.com  / admin123
-- Client: client@ship2aruba.com / client123
--
-- After creating users via dashboard, their profiles will auto-create.
-- Then run the UPDATE statements below to set roles and suite numbers.
-- ============================================================

-- After creating users via dashboard, update their profiles:
-- (Replace the UUIDs with the actual user IDs from auth.users)

-- Step 1: Create users via Supabase Dashboard > Authentication > Users
--   Email: admin@ship2aruba.com, Password: admin123
--   Email: client@ship2aruba.com, Password: client123

-- Step 2: Run this to set roles (replace UUIDs with actual IDs):
/*
update public.profiles
set role = 'admin', full_name = 'Admin User'
where email = 'admin@ship2aruba.com';

update public.profiles
set role = 'client', full_name = 'Maria Santos', suite_number = 'ARB-1042'
where email = 'client@ship2aruba.com';
*/

-- ============================================================
-- Seed packages (run after setting up users)
-- This uses a DO block to reference the client by email
-- ============================================================

do $$
declare
  client_id uuid;
  admin_id  uuid;
  pkg1_id   uuid;
  pkg2_id   uuid;
  pkg3_id   uuid;
  pkg4_id   uuid;
begin
  select id into client_id from public.profiles where email = 'client@ship2aruba.com';
  select id into admin_id  from public.profiles where email = 'admin@ship2aruba.com';

  if client_id is null then
    raise notice 'Client user not found. Create the users first.';
    return;
  end if;

  -- Package 1: Ready to send
  insert into public.packages (id, tracking_number, width_cm, height_cm, length_cm, weight_kg, contents_description, status, client_id)
  values (
    uuid_generate_v4(), '1Z999AA10123456784', 30, 20, 15, 1.8,
    'Electronics — Wireless Headphones', 'ready_to_send', client_id
  ) returning id into pkg1_id;

  insert into public.status_history (package_id, old_status, new_status, changed_by_id, changed_by_role)
  values (pkg1_id, null, 'ready_to_send', admin_id, 'admin');

  -- Package 2: Pending invoice review
  insert into public.packages (id, tracking_number, width_cm, height_cm, length_cm, weight_kg, contents_description, status, client_id)
  values (
    uuid_generate_v4(), '9400111899223397996028', 25, 15, 10, 0.9,
    'Clothing — 3x T-Shirts', 'pending_invoice_review', client_id
  ) returning id into pkg2_id;

  insert into public.status_history (package_id, old_status, new_status, changed_by_id, changed_by_role)
  values
    (pkg2_id, null, 'ready_to_send', admin_id, 'admin'),
    (pkg2_id, 'ready_to_send', 'pending_invoice_review', client_id, 'client');

  -- Fake invoice record for pkg2
  insert into public.invoices (package_id, file_path, file_name, review_status)
  values (pkg2_id, 'placeholder/invoice.pdf', 'invoice.pdf', 'pending');

  -- Package 3: Invoice approved (ready for ship request)
  insert into public.packages (id, tracking_number, width_cm, height_cm, length_cm, weight_kg, contents_description, status, client_id)
  values (
    uuid_generate_v4(), '92612901755477000000000', 40, 35, 30, 5.2,
    'Home Goods — Kitchen Appliance', 'invoice_approved', client_id
  ) returning id into pkg3_id;

  insert into public.status_history (package_id, old_status, new_status, changed_by_id, changed_by_role)
  values
    (pkg3_id, null, 'ready_to_send', admin_id, 'admin'),
    (pkg3_id, 'ready_to_send', 'pending_invoice_review', client_id, 'client'),
    (pkg3_id, 'pending_invoice_review', 'invoice_approved', admin_id, 'admin');

  insert into public.invoices (package_id, file_path, file_name, review_status, reviewed_at, reviewed_by)
  values (pkg3_id, 'placeholder/invoice3.pdf', 'invoice3.pdf', 'approved', now(), admin_id);

  -- Package 4: Shipped
  insert into public.packages (id, tracking_number, width_cm, height_cm, length_cm, weight_kg, contents_description, status, client_id)
  values (
    uuid_generate_v4(), '420902149400111899223397', 20, 15, 10, 0.5,
    'Books — 2x Hardcover', 'shipped', client_id
  ) returning id into pkg4_id;

  insert into public.status_history (package_id, old_status, new_status, changed_by_id, changed_by_role)
  values
    (pkg4_id, null, 'ready_to_send', admin_id, 'admin'),
    (pkg4_id, 'ready_to_send', 'pending_invoice_review', client_id, 'client'),
    (pkg4_id, 'pending_invoice_review', 'invoice_approved', admin_id, 'admin'),
    (pkg4_id, 'invoice_approved', 'ship_requested', client_id, 'client'),
    (pkg4_id, 'ship_requested', 'shipped', admin_id, 'admin');

  insert into public.invoices (package_id, file_path, file_name, review_status, reviewed_at, reviewed_by)
  values (pkg4_id, 'placeholder/invoice4.pdf', 'invoice4.pdf', 'approved', now() - interval '2 days', admin_id);

  raise notice 'Seed data inserted successfully!';
  raise notice 'pkg1 (ready_to_send): %', pkg1_id;
  raise notice 'pkg2 (pending_invoice_review): %', pkg2_id;
  raise notice 'pkg3 (invoice_approved): %', pkg3_id;
  raise notice 'pkg4 (shipped): %', pkg4_id;
end;
$$;
