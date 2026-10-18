-- ==============================================================================
-- CrestFlow PostgreSQL Database Schema for Supabase
-- Idiomatic Relational Schema with Row Level Security (RLS) and Realtime
-- ==============================================================================

-- 1. PROFILES TABLE (Linked to auth.users)
CREATE TABLE IF NOT EXISTS public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL DEFAULT '',
  phone TEXT DEFAULT '',
  upi_id TEXT DEFAULT '',
  professional_title TEXT DEFAULT '',
  services_description TEXT DEFAULT '',
  account_number TEXT,
  ifsc_code TEXT,
  bank_name TEXT,
  gemini_api_key TEXT,
  freelance_start_date DATE,
  work_experience_bio TEXT,
  -- SaaS Subscription (49/- per month)
  subscription_status TEXT NOT NULL DEFAULT 'inactive' CHECK (subscription_status IN ('inactive', 'active', 'expired', 'canceled')),
  subscription_plan TEXT NOT NULL DEFAULT 'monthly',
  current_period_start TIMESTAMPTZ,
  current_period_end TIMESTAMPTZ,
  last_payment_id TEXT,
  last_payment_amount NUMERIC(12, 2) DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 2. CLIENTS TABLE
CREATE TABLE IF NOT EXISTS public.clients (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  phone TEXT DEFAULT '',
  email TEXT DEFAULT '',
  logo_url TEXT,
  instagram TEXT,
  client_from TEXT,
  work_experience TEXT,
  payment_basis TEXT NOT NULL DEFAULT 'per_reel' CHECK (payment_basis IN ('per_reel', 'monthly_retainer')),
  monthly_retainer_amount NUMERIC(12, 2) DEFAULT 0,
  default_rate NUMERIC(12, 2) NOT NULL DEFAULT 0,
  on_site_shoot_rate NUMERIC(12, 2) DEFAULT 0,
  website_making_rate NUMERIC(12, 2) DEFAULT 0,
  last_payment_date TIMESTAMPTZ,
  payment_cycle_days INT NOT NULL DEFAULT 30,
  email_reminders_enabled BOOLEAN NOT NULL DEFAULT true,
  notes TEXT,
  is_closed BOOLEAN NOT NULL DEFAULT false,
  closed_at TIMESTAMPTZ,
  -- Auto-invoicing schedule
  auto_invoice_enabled BOOLEAN NOT NULL DEFAULT false,
  auto_invoice_schedule_type TEXT CHECK (auto_invoice_schedule_type IN ('cycle_date', 'day_of_month', 'specific_date')),
  auto_invoice_cycle_day INT CHECK (auto_invoice_cycle_day BETWEEN 1 AND 31),
  auto_invoice_specific_date DATE,
  last_auto_invoiced_date DATE,
  sub_clients JSONB DEFAULT '[]'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 3. SUB-CLIENTS TABLE
CREATE TABLE IF NOT EXISTS public.sub_clients (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id UUID NOT NULL REFERENCES public.clients(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  code TEXT,
  notes TEXT,
  logo_url TEXT,
  instagram TEXT,
  email TEXT,
  phone TEXT,
  client_from TEXT,
  work_experience TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 4. WORK ITEMS TABLE (Work Log)
CREATE TABLE IF NOT EXISTS public.work_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  client_id UUID NOT NULL REFERENCES public.clients(id) ON DELETE CASCADE,
  sub_client_id UUID REFERENCES public.sub_clients(id) ON DELETE SET NULL,
  sub_client_name TEXT,
  description TEXT NOT NULL,
  quantity INT NOT NULL DEFAULT 1,
  rate NUMERIC(12, 2) NOT NULL DEFAULT 0,
  date TIMESTAMPTZ NOT NULL,
  status TEXT NOT NULL DEFAULT 'Uninvoiced' CHECK (status IN ('Uninvoiced', 'Invoiced')),
  invoice_id UUID,
  video_url TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 5. INVOICES TABLE
CREATE TABLE IF NOT EXISTS public.invoices (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  client_id UUID NOT NULL REFERENCES public.clients(id) ON DELETE CASCADE,
  client_name TEXT NOT NULL,
  date TIMESTAMPTZ NOT NULL DEFAULT now(),
  total_amount NUMERIC(12, 2) NOT NULL DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'Pending' CHECK (status IN ('Pending', 'Paid')),
  discount_amount NUMERIC(12, 2) DEFAULT 0,
  discount_description TEXT,
  extra_cost_amount NUMERIC(12, 2) DEFAULT 0,
  extra_cost_description TEXT,
  last_payment_date TIMESTAMPTZ,
  is_auto_generated BOOLEAN NOT NULL DEFAULT false,
  invoice_type TEXT NOT NULL DEFAULT 'per_item' CHECK (invoice_type IN ('per_item', 'monthly_retainer')),
  billing_month TEXT,
  linked_work_item_ids JSONB DEFAULT '[]'::jsonb,
  reels JSONB DEFAULT '[]'::jsonb,
  deliverables JSONB DEFAULT '[]'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 6. INVOICE ITEMS (Reels & Deliverables snapshot)
CREATE TABLE IF NOT EXISTS public.invoice_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  invoice_id UUID NOT NULL REFERENCES public.invoices(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  quantity INT NOT NULL DEFAULT 1,
  rate NUMERIC(12, 2) NOT NULL DEFAULT 0,
  sub_client_id UUID REFERENCES public.sub_clients(id) ON DELETE SET NULL,
  sub_client_name TEXT,
  video_url TEXT,
  work_item_id UUID REFERENCES public.work_items(id) ON DELETE SET NULL,
  date TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 7. STICKY NOTES TABLE
CREATE TABLE IF NOT EXISTS public.sticky_notes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  client_id TEXT NOT NULL DEFAULT 'general',
  content TEXT NOT NULL,
  color TEXT NOT NULL DEFAULT 'yellow' CHECK (color IN ('yellow', 'blue', 'green', 'pink', 'purple')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 8. CLIENT REVIEWS TABLE (Public portal & portfolio feedback)
CREATE TABLE IF NOT EXISTS public.client_reviews (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  client_id UUID REFERENCES public.clients(id) ON DELETE SET NULL,
  client_name TEXT NOT NULL,
  rating INT NOT NULL CHECK (rating BETWEEN 1 AND 5),
  feedback_text TEXT NOT NULL,
  project_name TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 9. SERVICE REQUESTS TABLE (Public portfolio inquiry inbox)
CREATE TABLE IF NOT EXISTS public.service_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  client_name TEXT NOT NULL,
  contact_name TEXT NOT NULL,
  contact_phone TEXT NOT NULL,
  contact_email TEXT NOT NULL,
  project_details TEXT NOT NULL,
  instagram TEXT,
  proposed_rate NUMERIC(12, 2),
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'declined')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ==============================================================================
-- INDEXES FOR PERFORMANCE
-- ==============================================================================
CREATE INDEX IF NOT EXISTS idx_clients_user_id ON public.clients(user_id);
CREATE INDEX IF NOT EXISTS idx_sub_clients_client_id ON public.sub_clients(client_id);
CREATE INDEX IF NOT EXISTS idx_sub_clients_user_id ON public.sub_clients(user_id);
CREATE INDEX IF NOT EXISTS idx_work_items_user_id ON public.work_items(user_id);
CREATE INDEX IF NOT EXISTS idx_work_items_client_id ON public.work_items(client_id);
CREATE INDEX IF NOT EXISTS idx_work_items_status ON public.work_items(status);
CREATE INDEX IF NOT EXISTS idx_invoices_user_id ON public.invoices(user_id);
CREATE INDEX IF NOT EXISTS idx_invoices_client_id ON public.invoices(client_id);
CREATE INDEX IF NOT EXISTS idx_invoice_items_invoice_id ON public.invoice_items(invoice_id);
CREATE INDEX IF NOT EXISTS idx_sticky_notes_user_id ON public.sticky_notes(user_id);
CREATE INDEX IF NOT EXISTS idx_client_reviews_user_id ON public.client_reviews(user_id);
CREATE INDEX IF NOT EXISTS idx_service_requests_user_id ON public.service_requests(user_id);

-- ==============================================================================
-- ROW LEVEL SECURITY (RLS) POLICIES
-- ==============================================================================

-- Enable RLS on all tables
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.clients ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sub_clients ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.work_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.invoices ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.invoice_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sticky_notes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.client_reviews ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.service_requests ENABLE ROW LEVEL SECURITY;

-- 1. Profiles Policies
CREATE POLICY "Users can view own profile" ON public.profiles FOR SELECT USING (auth.uid() = id);
CREATE POLICY "Users can insert own profile" ON public.profiles FOR INSERT WITH CHECK (auth.uid() = id);
CREATE POLICY "Users can update own profile" ON public.profiles FOR UPDATE USING (auth.uid() = id);
-- Public profile view for portfolio
CREATE POLICY "Public profile read access" ON public.profiles FOR SELECT USING (true);

-- 2. Clients Policies (Read allowed; Write requires active subscription or whitelist)
DROP POLICY IF EXISTS "Users can manage own clients" ON public.clients;
DROP POLICY IF EXISTS "Users can read own clients" ON public.clients;
DROP POLICY IF EXISTS "Users with active subscription can insert clients" ON public.clients;
DROP POLICY IF EXISTS "Users with active subscription can update clients" ON public.clients;
DROP POLICY IF EXISTS "Users can delete own clients" ON public.clients;

CREATE POLICY "Users can read own clients" ON public.clients FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users with active subscription can insert clients" ON public.clients FOR INSERT WITH CHECK (auth.uid() = user_id AND public.has_active_access(auth.uid()));
CREATE POLICY "Users with active subscription can update clients" ON public.clients FOR UPDATE USING (auth.uid() = user_id AND public.has_active_access(auth.uid()));
CREATE POLICY "Users can delete own clients" ON public.clients FOR DELETE USING (auth.uid() = user_id);

-- 3. Sub-Clients Policies
CREATE POLICY "Users can manage own sub-clients" ON public.sub_clients FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- 4. Work Items Policies (Read allowed; Write requires active subscription or whitelist)
DROP POLICY IF EXISTS "Users can manage own work items" ON public.work_items;
DROP POLICY IF EXISTS "Users can read own work items" ON public.work_items;
DROP POLICY IF EXISTS "Portal read access for work items" ON public.work_items;
DROP POLICY IF EXISTS "Users with active subscription can insert work items" ON public.work_items;
DROP POLICY IF EXISTS "Users with active subscription can update work items" ON public.work_items;
DROP POLICY IF EXISTS "Users can delete own work items" ON public.work_items;

CREATE POLICY "Users can read own work items" ON public.work_items FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Portal read access for work items" ON public.work_items FOR SELECT USING (true);
CREATE POLICY "Users with active subscription can insert work items" ON public.work_items FOR INSERT WITH CHECK (auth.uid() = user_id AND public.has_active_access(auth.uid()));
CREATE POLICY "Users with active subscription can update work items" ON public.work_items FOR UPDATE USING (auth.uid() = user_id AND public.has_active_access(auth.uid()));
CREATE POLICY "Users can delete own work items" ON public.work_items FOR DELETE USING (auth.uid() = user_id);

-- 5. Invoices Policies (Read allowed; Write requires active subscription or whitelist)
DROP POLICY IF EXISTS "Users can manage own invoices" ON public.invoices;
DROP POLICY IF EXISTS "Users can read own invoices" ON public.invoices;
DROP POLICY IF EXISTS "Portal read access for invoices" ON public.invoices;
DROP POLICY IF EXISTS "Users with active subscription can insert invoices" ON public.invoices;
DROP POLICY IF EXISTS "Users with active subscription can update invoices" ON public.invoices;
DROP POLICY IF EXISTS "Users can delete own invoices" ON public.invoices;

CREATE POLICY "Users can read own invoices" ON public.invoices FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Portal read access for invoices" ON public.invoices FOR SELECT USING (true);
CREATE POLICY "Users with active subscription can insert invoices" ON public.invoices FOR INSERT WITH CHECK (auth.uid() = user_id AND public.has_active_access(auth.uid()));
CREATE POLICY "Users with active subscription can update invoices" ON public.invoices FOR UPDATE USING (auth.uid() = user_id AND public.has_active_access(auth.uid()));
CREATE POLICY "Users can delete own invoices" ON public.invoices FOR DELETE USING (auth.uid() = user_id);

-- 6. Invoice Items Policies
CREATE POLICY "Users can manage own invoice items" ON public.invoice_items FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Portal read access for invoice items" ON public.invoice_items FOR SELECT USING (true);

-- 7. Sticky Notes Policies
CREATE POLICY "Users can manage own sticky notes" ON public.sticky_notes FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- 8. Client Reviews Policies
CREATE POLICY "Users can manage own reviews" ON public.client_reviews FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
-- Allow public to submit reviews and view public reviews
CREATE POLICY "Public can view reviews" ON public.client_reviews FOR SELECT USING (true);
CREATE POLICY "Public can insert reviews" ON public.client_reviews FOR INSERT WITH CHECK (true);

-- 9. Service Requests Policies
CREATE POLICY "Users can manage own service requests" ON public.service_requests FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
-- Allow public visitors to submit service requests via freelancer portfolio
CREATE POLICY "Public can submit service requests" ON public.service_requests FOR INSERT WITH CHECK (true);

-- 10. Subscription Whitelist Table
CREATE TABLE IF NOT EXISTS public.subscription_whitelist (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email TEXT NOT NULL UNIQUE,
  reason TEXT DEFAULT 'Approved by Admin',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.subscription_whitelist ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow read access to whitelist" ON public.subscription_whitelist;
CREATE POLICY "Allow read access to whitelist" ON public.subscription_whitelist FOR SELECT USING (true);
DROP POLICY IF EXISTS "Allow admin to manage whitelist" ON public.subscription_whitelist;
CREATE POLICY "Allow admin to manage whitelist" ON public.subscription_whitelist FOR ALL USING (true) WITH CHECK (true);

-- 11. Subscription Payments Table
CREATE TABLE IF NOT EXISTS public.subscription_payments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id TEXT NOT NULL,
  order_id TEXT NOT NULL UNIQUE,
  payment_id TEXT,
  plan TEXT NOT NULL DEFAULT 'monthly',
  amount NUMERIC(12, 2) NOT NULL DEFAULT 49.00,
  currency TEXT NOT NULL DEFAULT 'INR',
  status TEXT NOT NULL DEFAULT 'INITIATED' CHECK (status IN ('INITIATED', 'PENDING_VERIFICATION', 'ACTIVE', 'QUEUED', 'PROCESSING', 'SUCCESS', 'FAILED', 'REJECTED', 'EXPIRED', 'CANCELLED')),
  utr TEXT,
  method TEXT DEFAULT 'UPI',
  payer_email TEXT,
  admin_notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_subscription_payments_unique_utr 
  ON public.subscription_payments(utr) 
  WHERE utr IS NOT NULL AND utr != '';

-- Subscription Payments Policies
ALTER TABLE public.subscription_payments ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Users can manage own subscription payments" ON public.subscription_payments;
DROP POLICY IF EXISTS "Allow admin read subscription payments" ON public.subscription_payments;
DROP POLICY IF EXISTS "Allow public all subscription payments" ON public.subscription_payments;
CREATE POLICY "Allow public all subscription payments" ON public.subscription_payments FOR ALL USING (true) WITH CHECK (true);


-- 12. PostgreSQL Function: has_active_access
CREATE OR REPLACE FUNCTION public.has_active_access(user_uuid UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  user_email TEXT;
  sub_status TEXT;
  period_end TIMESTAMPTZ;
BEGIN
  -- 1. Check if user's auth email is whitelisted
  SELECT email INTO user_email FROM auth.users WHERE id = user_uuid;
  IF user_email IS NOT NULL AND EXISTS (
    SELECT 1 FROM public.subscription_whitelist WHERE LOWER(email) = LOWER(user_email)
  ) THEN
    RETURN TRUE;
  END IF;

  -- 2. Check active subscription period in profiles
  SELECT subscription_status, current_period_end 
  INTO sub_status, period_end 
  FROM public.profiles 
  WHERE id = user_uuid;

  IF sub_status = 'active' AND (period_end IS NOT NULL AND now() < period_end) THEN
    RETURN TRUE;
  END IF;

-- 12. HARDENED SERVER-SIDE PAYWALL GUARD FUNCTION (has_active_access)
CREATE OR REPLACE FUNCTION public.has_active_access(user_uuid UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  config_val JSONB;
  user_email_val TEXT;
  confirmed_at_val TIMESTAMPTZ;
  is_globally_enabled BOOLEAN;
  rollout_pct INT;
  is_whitelisted_cohort BOOLEAN;
BEGIN
  -- 1. Read dynamic settings from platform_settings
  SELECT value INTO config_val FROM public.platform_settings WHERE key = 'billing_config';
  is_globally_enabled := COALESCE((config_val->>'enabled')::boolean, false);
  
  -- If billing is globally OFF (dark launch), full access is granted to all
  IF NOT is_globally_enabled THEN
    RETURN TRUE;
  END IF;

  -- 2. Check cohort rollout
  rollout_pct := COALESCE((config_val->>'rollout_percentage')::int, 0);
  SELECT email, email_confirmed_at INTO user_email_val, confirmed_at_val FROM auth.users WHERE id = user_uuid;
  
  -- Check explicit whitelisted user IDs or beta emails
  is_whitelisted_cohort := (config_val->'whitelisted_user_ids') ? user_uuid::text
    OR (user_email_val IS NOT NULL AND (config_val->'beta_cohort_emails') ? user_email_val);
    
  IF NOT is_whitelisted_cohort AND (abs(hashtext(user_uuid::text)) % 100) >= rollout_pct THEN
    -- User is not in active billing cohort; grant full access
    RETURN TRUE;
  END IF;

  -- 3. Whitelist check: matches lowercase email against confirmed emails ONLY
  IF user_email_val IS NOT NULL AND confirmed_at_val IS NOT NULL AND EXISTS (
    SELECT 1 FROM public.subscription_whitelist WHERE LOWER(email) = LOWER(user_email_val)
  ) THEN
    RETURN TRUE;
  END IF;

  -- 4. Dynamic period calculation: computes access from current_period_end + grace
  RETURN EXISTS (
    SELECT 1 FROM public.subscriptions
    WHERE user_id = user_uuid
      AND (current_period_end + (grace_period_days || ' days')::INTERVAL) > now()
  );
END;
$$;

-- 13. Platform Settings Table
CREATE TABLE IF NOT EXISTS public.platform_settings (
  key TEXT PRIMARY KEY,
  value JSONB NOT NULL DEFAULT '{}'::jsonb,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_by UUID REFERENCES auth.users(id) ON DELETE SET NULL
);

ALTER TABLE public.platform_settings ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Public can view platform settings" ON public.platform_settings;
CREATE POLICY "Public can view platform settings" ON public.platform_settings FOR SELECT USING (true);

-- 14. Admin Users Table
CREATE TABLE IF NOT EXISTS public.admin_users (
  user_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  notes TEXT DEFAULT 'Platform Administrator',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.admin_users ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Admins can view admin registry" ON public.admin_users;
CREATE POLICY "Admins can view admin registry" ON public.admin_users FOR SELECT USING (auth.uid() = user_id);

-- 15. Plans Table (Prepaid Duration Tiers & Entitlements)
CREATE TABLE IF NOT EXISTS public.plans (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  price_paise BIGINT NOT NULL CHECK (price_paise >= 0),
  currency TEXT NOT NULL DEFAULT 'INR',
  period_days INT NOT NULL DEFAULT 30 CHECK (period_days > 0),
  period_label TEXT NOT NULL DEFAULT '/ month',
  badge TEXT,
  description TEXT,
  entitlement_limits JSONB NOT NULL DEFAULT '{}'::jsonb,
  is_active BOOLEAN NOT NULL DEFAULT true,
  sort_order INT NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.plans ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Public can view active plans" ON public.plans;
CREATE POLICY "Public can view active plans" ON public.plans FOR SELECT USING (is_active = true);

-- 16. Subscriptions Table
CREATE TABLE IF NOT EXISTS public.subscriptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
  plan_id UUID NOT NULL REFERENCES public.plans(id) ON DELETE RESTRICT,
  status TEXT NOT NULL DEFAULT 'inactive' CHECK (status IN ('inactive', 'active', 'grace', 'expired', 'canceled')),
  current_period_start TIMESTAMPTZ,
  current_period_end TIMESTAMPTZ,
  grace_period_days INT NOT NULL DEFAULT 3 CHECK (grace_period_days >= 0),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.subscriptions ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Users can read own subscription" ON public.subscriptions;
CREATE POLICY "Users can read own subscription" ON public.subscriptions FOR SELECT USING (auth.uid() = user_id);

-- 17. Payments Table (Authoritative Gateway Ledger)
CREATE TABLE IF NOT EXISTS public.payments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  plan_id UUID NOT NULL REFERENCES public.plans(id) ON DELETE RESTRICT,
  provider_order_id TEXT NOT NULL UNIQUE,
  provider_payment_id TEXT,
  internal_reference TEXT NOT NULL UNIQUE,
  amount_paise BIGINT NOT NULL CHECK (amount_paise >= 0),
  currency TEXT NOT NULL DEFAULT 'INR',
  status TEXT NOT NULL DEFAULT 'INITIATED' CHECK (status IN (
    'INITIATED', 'ACTIVE', 'QUEUED', 'PROCESSING', 'SUCCESS', 'FAILED', 'SUSPICIOUS', 'SUSPICIOUS_LATE_SUCCESS', 'EXPIRED', 'CANCELLED'
  )),
  method TEXT NOT NULL DEFAULT 'UPI',
  utr TEXT,
  raw_provider_payload JSONB DEFAULT '{}'::jsonb,
  paid_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.payments ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Users can read own payments" ON public.payments;
CREATE POLICY "Users can read own payments" ON public.payments FOR SELECT USING (auth.uid() = user_id);

-- 18. Subscription Audit Logs Table
CREATE TABLE IF NOT EXISTS public.subscription_audit_logs (
  id BIGSERIAL PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  previous_status TEXT,
  new_status TEXT NOT NULL,
  reason TEXT NOT NULL,
  actor TEXT NOT NULL,
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.subscription_audit_logs ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Users can read own audit logs" ON public.subscription_audit_logs;
CREATE POLICY "Users can read own audit logs" ON public.subscription_audit_logs FOR SELECT USING (auth.uid() = user_id);

-- 19. Webhook Deliveries Table (Replay Protection)
CREATE TABLE IF NOT EXISTS public.webhook_deliveries (
  delivery_id UUID PRIMARY KEY,
  order_id TEXT NOT NULL,
  event_type TEXT NOT NULL DEFAULT 'SUCCESS',
  received_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.webhook_deliveries ENABLE ROW LEVEL SECURITY;

-- ==============================================================================
-- REALTIME PUBLICATION
-- ==============================================================================
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables 
    WHERE pubname = 'supabase_realtime' 
    AND schemaname = 'public' 
    AND tablename = 'subscriptions'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.subscriptions;
  END IF;
  
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables 
    WHERE pubname = 'supabase_realtime' 
    AND schemaname = 'public' 
    AND tablename = 'payments'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.payments;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables 
    WHERE pubname = 'supabase_realtime' 
    AND schemaname = 'public' 
    AND tablename = 'subscription_whitelist'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.subscription_whitelist;
  END IF;
END $$;

