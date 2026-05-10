# Ship2Aruba — Package Forwarding MVP

A full-stack package forwarding management system with dual portals: Admin (warehouse staff) and Client (customers).

---

## Stack & Rationale

| Layer | Choice | Why |
|---|---|---|
| **Framework** | Next.js 14 (App Router) | Server Components for data fetching, file-based routing, built-in API routes |
| **Database + Auth** | Supabase (PostgreSQL) | Built-in auth, row-level security, real-time, storage — all in one |
| **ORM** | Supabase JS client | Direct SQL-first approach; RLS handles authorization at DB layer |
| **File Storage** | Supabase Storage | Integrated with auth; signed URLs for secure invoice access |
| **Styling** | Tailwind CSS + shadcn/ui | Production-grade components, fully customizable |
| **Deployment** | Vercel (recommended) | Zero-config Next.js deployment |

### Key architectural decisions

- **Status transitions enforced at DB level** via a PostgreSQL trigger (`enforce_package_status_transition`). A package cannot skip steps — e.g., `invoice_approved → ship_requested` works, but `ready_to_send → ship_requested` raises a DB exception.
- **Role-based access** enforced by middleware (redirect) AND Row Level Security policies (data layer). A client cannot access admin data by manipulating URLs or API calls.
- **Invoice files** stored in Supabase Storage (not in DB as base64). Signed URLs (5-minute expiry) used for secure file access.
- **Audit log** (`status_history` table) records every status change with timestamp, who changed it, and their role.

---

## Local Setup

### Prerequisites
- Node.js 18+
- A Supabase project (free tier works)

### 1. Clone and install

```bash
git clone <repo-url>
cd ship2aruba
npm install
```

### 2. Environment variables

```bash
cp .env.local.example .env.local
```

Fill in your Supabase project URL and keys (found in Supabase Dashboard > Settings > API):

```env
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
```

### 3. Set up the database

In Supabase Dashboard > SQL Editor, run:

1. **`supabase/schema.sql`** — Creates all tables, triggers, RLS policies, storage bucket
2. **Create auth users** via Dashboard > Authentication > Users:
   - `admin@ship2aruba.com` / `admin123`
   - `client@ship2aruba.com` / `client123`
3. **Update roles** — In SQL Editor:
   ```sql
   update public.profiles
   set role = 'admin', full_name = 'Admin User'
   where email = 'admin@ship2aruba.com';

   update public.profiles
   set role = 'client', full_name = 'Maria Santos', suite_number = 'ARB-1042'
   where email = 'client@ship2aruba.com';
   ```
4. **`supabase/seed.sql`** — Inserts 4 sample packages across different statuses

### 4. Run locally

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000)

---

## Credentials

| Role | Email | Password |
|---|---|---|
| **Admin** | admin@ship2aruba.com | admin123 |
| **Client** | client@ship2aruba.com | client123 |

---

## Features

### Admin Portal (`/admin`)

| Page | Route | Description |
|---|---|---|
| Dashboard | `/admin/dashboard` | Package counts by status, pending reviews, client count |
| Package Intake | `/admin/packages/new` | Log new incoming packages |
| All Packages | `/admin/packages` | Searchable list with status, links to detail view |
| Package Detail | `/admin/packages/[id]` | Full details + status history audit log |
| Invoice Review | `/admin/invoices` | Approve or flag uploaded invoices |
| Ship Requests | `/admin/ship-requests` | View and process client ship requests |
| Clients | `/admin/clients` | Client list with package counts |
| Client Detail | `/admin/clients/[id]` | Client profile + all their packages |

### Client Portal (`/client`)

| Page | Route | Description |
|---|---|---|
| Dashboard | `/client/dashboard` | Summary of packages by status |
| My Packages | `/client/packages` | All packages with status + detail view |
| Upload Invoice | `/client/upload-invoice` | Upload PDF/JPG/PNG invoices; see admin notes |
| Ship Request | `/client/ship-request` | Select approved packages and request shipping |
| Shipment Status | `/client/shipments` | Track shipped/delivered packages |

---

## Package Status Flow

```
Ready to Send
     ↓ (client uploads invoice)
Pending Invoice Review
     ↓ (admin approves)
Invoice Approved
     ↓ (client requests ship)
Ship Requested
     ↓ (admin processes)
Shipped
     ↓ (admin marks arrival)
Ready for Pickup / Delivered
```

All transitions enforced at the **database level** via PostgreSQL trigger.

---

## Known Limitations & What I'd Do With More Time

1. **Admin: mark packages as Ready for Pickup / Delivered** — The status transition after "Shipped" works at the DB level but there's no admin UI page for it yet. Easy to add as a button on the package detail page.

2. **Email notifications** — Not implemented per brief. Would use Resend or Supabase Edge Functions + SMTP.

3. **Pagination** — Package lists load all records. Would add cursor-based pagination for large datasets.

4. **Real-time updates** — Could use Supabase Realtime subscriptions so the invoice review queue updates without page refresh.

5. **Mobile responsiveness** — Desktop-only per brief spec. Would add responsive breakpoints for production.

6. **File type validation on server** — Currently validated client-side. Would add a Supabase Edge Function to validate MIME type server-side before storage write.

7. **Testing** — Would add Playwright e2e tests covering the full workflow and Vitest unit tests for status transition logic.

---

## Database Schema

See `supabase/schema.sql` for full schema with all constraints, triggers, and RLS policies.

```
profiles          — extends auth.users; role = admin|client
packages          — core entity; status enforced by DB trigger
invoices          — 1:1 with package; file in Supabase Storage
ship_requests     — 1 client → many packages
ship_request_packages — junction table
status_history    — append-only audit log for every status change
```
