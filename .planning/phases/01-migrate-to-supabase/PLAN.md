# Phase Plan: Complete Migration from Firebase to Supabase

## 1. Executive Summary
Migrate CrestFlow's data, authentication, and real-time infrastructure completely from **Firebase (Firestore + Firebase Auth)** to **Supabase (PostgreSQL + Supabase Auth + Supabase Realtime)** using an idiomatic relational database model with **Row Level Security (RLS)**.

---

## 2. PostgreSQL Relational Schema Design (`supabase/schema.sql`)

### Tables & Relationships
1. **`profiles`**
   - Linked to `auth.users(id)` via Foreign Key (`ON DELETE CASCADE`).
   - Fields: `id UUID PRIMARY KEY`, `name TEXT`, `phone TEXT`, `upi_id TEXT`, `professional_title TEXT`, `services_description TEXT`, `account_number TEXT`, `ifsc_code TEXT`, `bank_name TEXT`, `freelance_start_date DATE`, `work_experience_bio TEXT`, `created_at TIMESTAMPTZ DEFAULT now()`.

2. **`clients`**
   - Owner: `user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE`.
   - Fields: `id UUID PRIMARY KEY DEFAULT gen_random_uuid()`, `user_id UUID NOT NULL`, `name TEXT NOT NULL`, `phone TEXT`, `email TEXT`, `payment_basis TEXT DEFAULT 'per_reel'`, `monthly_retainer_amount NUMERIC DEFAULT 0`, `default_rate NUMERIC DEFAULT 0`, `on_site_shoot_rate NUMERIC`, `website_making_rate NUMERIC`, `last_payment_date TIMESTAMPTZ`, `payment_cycle_days INT DEFAULT 30`, `auto_invoice_enabled BOOLEAN DEFAULT false`, `auto_invoice_schedule_type TEXT`, `auto_invoice_cycle_day INT`, `auto_invoice_specific_date DATE`, `last_auto_invoiced_date DATE`, `is_closed BOOLEAN DEFAULT false`, `closed_at TIMESTAMPTZ`, `created_at TIMESTAMPTZ DEFAULT now()`.

3. **`sub_clients`**
   - Parent: `client_id UUID REFERENCES clients(id) ON DELETE CASCADE`.
   - Fields: `id UUID PRIMARY KEY DEFAULT gen_random_uuid()`, `client_id UUID NOT NULL`, `user_id UUID NOT NULL REFERENCES auth.users(id)`, `name TEXT NOT NULL`, `code TEXT`, `notes TEXT`, `created_at TIMESTAMPTZ DEFAULT now()`.

4. **`work_items`**
   - Linked to: `client_id UUID REFERENCES clients(id) ON DELETE CASCADE`, `sub_client_id UUID REFERENCES sub_clients(id) ON DELETE SET NULL`.
   - Fields: `id UUID PRIMARY KEY DEFAULT gen_random_uuid()`, `user_id UUID NOT NULL REFERENCES auth.users(id)`, `description TEXT NOT NULL`, `quantity INT DEFAULT 1`, `rate NUMERIC NOT NULL`, `date TIMESTAMPTZ NOT NULL`, `status TEXT CHECK (status IN ('Uninvoiced', 'Invoiced')) DEFAULT 'Uninvoiced'`, `invoice_id UUID`, `video_url TEXT`, `created_at TIMESTAMPTZ DEFAULT now()`.

5. **`invoices`**
   - Linked to: `client_id UUID REFERENCES clients(id) ON DELETE CASCADE`.
   - Fields: `id UUID PRIMARY KEY DEFAULT gen_random_uuid()`, `user_id UUID NOT NULL REFERENCES auth.users(id)`, `client_id UUID NOT NULL`, `client_name TEXT NOT NULL`, `date TIMESTAMPTZ NOT NULL`, `total_amount NUMERIC NOT NULL`, `status TEXT CHECK (status IN ('Pending', 'Paid')) DEFAULT 'Pending'`, `discount_amount NUMERIC DEFAULT 0`, `discount_description TEXT`, `extra_cost_amount NUMERIC DEFAULT 0`, `extra_cost_description TEXT`, `invoice_type TEXT DEFAULT 'per_item'`, `billing_month TEXT`, `is_auto_generated BOOLEAN DEFAULT false`, `created_at TIMESTAMPTZ DEFAULT now()`.

6. **`invoice_items` (Reels & Deliverables)**
   - Parent: `invoice_id UUID REFERENCES invoices(id) ON DELETE CASCADE`.
   - Fields: `id UUID PRIMARY KEY DEFAULT gen_random_uuid()`, `invoice_id UUID NOT NULL`, `title TEXT NOT NULL`, `quantity INT DEFAULT 1`, `rate NUMERIC DEFAULT 0`, `video_url TEXT`, `work_item_id UUID REFERENCES work_items(id) ON DELETE SET NULL`, `sub_client_name TEXT`.

7. **`sticky_notes`**
   - Fields: `id UUID PRIMARY KEY DEFAULT gen_random_uuid()`, `user_id UUID NOT NULL REFERENCES auth.users(id)`, `client_id TEXT DEFAULT 'general'`, `content TEXT NOT NULL`, `color TEXT DEFAULT 'yellow'`, `created_at TIMESTAMPTZ DEFAULT now()`.

8. **`client_reviews` & `service_requests`**
   - Public portal review collection and freelancer service requests with appropriate RLS.

### Row Level Security (RLS)
- Enabled on all tables.
- Policy: Users can only `SELECT`, `INSERT`, `UPDATE`, and `DELETE` rows where `user_id = auth.uid()`.
- Public portal exceptions: allow public read of specific client profile & reviews via secure tokens or public slugs.

---

## 3. Work Breakdown & Migration Steps

### Step 1: Dependencies & Configuration
- Install `@supabase/supabase-js`.
- Add environment variables to `.env` & `.env.example`:
  ```env
  VITE_SUPABASE_URL=https://your-project.supabase.co
  VITE_SUPABASE_ANON_KEY=your-anon-key
  ```
- Create `src/lib/supabase.ts` singleton client.

### Step 2: Supabase Auth Migration
- Replace `firebase/auth` in `App.tsx` and header with `supabase.auth`.
- Implement `signInWithOAuth({ provider: 'google', options: { scopes: 'https://www.googleapis.com/auth/gmail.send https://www.googleapis.com/auth/drive.file' } })`.
- Preserve Google API provider token for Gmail & Google Drive integrations.
- Maintain a compatible `User` interface `{ uid, id, email, user_metadata }` to avoid widespread refactoring in consumer components.

### Step 3: Replace `useFirestore` with `useSupabase` Data Layer
- Create `src/hooks/useSupabase.ts` implementing the same interface:
  `{ data, loading, error, addOrUpdateItem, removeItem, batchReplaceAll }`.
- Map table names seamlessly (`clients`, `work_items`, `invoices`, etc.).
- Enable Realtime via Supabase Channels (`supabase.channel('table-changes').on('postgres_changes', ...)`).
- Handle camelCase (frontend) ⇄ snake_case (Postgres) conversion smoothly in the data adapter.

### Step 4: Component Updates & Direct Firestore Call Replacements
- Replace direct Firestore calls in:
  - `PublicFreelancerProfile.tsx`
  - `ClientPortal.tsx`
  - `ClientFeedbackForm.tsx`
  - `CsvImportModal.tsx`
- Replace `fcmService.ts` with web notifications or Supabase Realtime broadcast alerts.

### Step 5: Data Migration Tool (Firestore → Supabase)
- Build a one-time migration utility in `src/lib/migrationService.ts`:
  - Fetches existing data from Firestore.
  - Automatically maps and bulk-inserts into Supabase Postgres tables.
  - Ensures zero data loss.

### Step 6: Testing & Cleanup
- Verify login, real-time sync, CRUD on clients/work logs/invoices, PDF generation, and public portal.
- Remove `firebase` package from `package.json`.
- Delete `firebase.ts`.

---

## 4. Deliverables
1. `supabase/schema.sql` (Ready-to-run DDL script with tables, indexes, triggers, and RLS policies).
2. `src/lib/supabase.ts` (Typed Supabase Client).
3. `src/hooks/useSupabase.ts` (Drop-in reactive data hook).
4. Refactored Auth & Data Access.
5. Migration Verification & Clean Build.
