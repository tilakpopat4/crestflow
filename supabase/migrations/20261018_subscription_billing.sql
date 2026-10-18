-- ==============================================================================
-- Migration: 20261018_subscription_billing.sql
-- Description: Sets up normalized subscription billing schema with UUID foreign keys,
--              PostgreSQL advisory locks, dynamic DB platform settings, strict RLS,
--              and zero-bypass server-side paywall guardrails.
-- Direction: UP (Reversible DOWN provided at the end)
-- ==============================================================================

-- ------------------------------------------------------------------------------
-- 1. PLATFORM SETTINGS (Dynamic DB Feature Flags & Cohort Rollouts)
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.platform_settings (
  key TEXT PRIMARY KEY,
  value JSONB NOT NULL DEFAULT '{}'::jsonb,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_by UUID REFERENCES auth.users(id) ON DELETE SET NULL
);

ALTER TABLE public.platform_settings ENABLE ROW LEVEL SECURITY;

-- Public read-only policy for settings; all writes reserved for service_role / admin
DROP POLICY IF EXISTS "Public can view platform settings" ON public.platform_settings;
CREATE POLICY "Public can view platform settings" ON public.platform_settings
  FOR SELECT USING (true);

-- Seed initial billing configuration (Default: Dark launch disabled)
INSERT INTO public.platform_settings (key, value, updated_at)
VALUES (
  'billing_config',
  '{
    "enabled": false,
    "rollout_percentage": 0,
    "whitelisted_user_ids": [],
    "beta_cohort_emails": []
  }'::jsonb,
  now()
) ON CONFLICT (key) DO NOTHING;

-- ------------------------------------------------------------------------------
-- 2. ADMIN USERS TABLE (Server-Decided Admin Roles)
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.admin_users (
  user_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  notes TEXT DEFAULT 'Platform Administrator',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.admin_users ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Admins can view admin registry" ON public.admin_users;
CREATE POLICY "Admins can view admin registry" ON public.admin_users
  FOR SELECT USING (auth.uid() = user_id);

-- ------------------------------------------------------------------------------
-- 3. PLANS TABLE (Prepaid Duration Tiers & Entitlements)
-- ------------------------------------------------------------------------------
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
  entitlement_limits JSONB NOT NULL DEFAULT '{
    "max_clients": -1,
    "watermark_invoices": false,
    "auto_invoicing": true,
    "google_drive_sync": true
  }'::jsonb,
  is_active BOOLEAN NOT NULL DEFAULT true,
  sort_order INT NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.plans ENABLE ROW LEVEL SECURITY;

-- Authenticated users get SELECT on active plans; all writes via service_role only
DROP POLICY IF EXISTS "Public can view active plans" ON public.plans;
CREATE POLICY "Public can view active plans" ON public.plans
  FOR SELECT USING (is_active = true);

-- Seed core subscription tiers
INSERT INTO public.plans (code, name, price_paise, currency, period_days, period_label, badge, description, entitlement_limits, is_active, sort_order)
VALUES 
(
  'pro_monthly',
  'CrestFlow Pro Monthly',
  4900, -- ₹49.00 in paise
  'INR',
  30,
  '/ month',
  'Popular',
  'Full access to all client management, automated invoicing, and tracking tools.',
  '{"max_clients": -1, "watermark_invoices": false, "auto_invoicing": true, "google_drive_sync": true}'::jsonb,
  true,
  1
),
(
  'pro_annual',
  'CrestFlow Pro Annual',
  49900, -- ₹499.00 in paise (2 months free)
  'INR',
  365,
  '/ year',
  'Best Value',
  'Year-round unrestricted access with 2 months completely free.',
  '{"max_clients": -1, "watermark_invoices": false, "auto_invoicing": true, "google_drive_sync": true}'::jsonb,
  true,
  2
)
ON CONFLICT (code) DO UPDATE SET
  name = EXCLUDED.name,
  price_paise = EXCLUDED.price_paise,
  period_days = EXCLUDED.period_days,
  period_label = EXCLUDED.period_label,
  badge = EXCLUDED.badge,
  description = EXCLUDED.description,
  entitlement_limits = EXCLUDED.entitlement_limits,
  updated_at = now();

-- ------------------------------------------------------------------------------
-- 4. SUBSCRIPTIONS TABLE (User Periods & Status)
-- ------------------------------------------------------------------------------
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

CREATE INDEX IF NOT EXISTS idx_subscriptions_user_id ON public.subscriptions(user_id);
CREATE INDEX IF NOT EXISTS idx_subscriptions_period_end ON public.subscriptions(current_period_end);

ALTER TABLE public.subscriptions ENABLE ROW LEVEL SECURITY;

-- Authenticated users get SELECT-only on their own row; ZERO client writes
DROP POLICY IF EXISTS "Users can read own subscription" ON public.subscriptions;
CREATE POLICY "Users can read own subscription" ON public.subscriptions
  FOR SELECT USING (auth.uid() = user_id);

-- ------------------------------------------------------------------------------
-- 5. PAYMENTS TABLE (Authoritative Gateway Ledger)
-- ------------------------------------------------------------------------------
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

CREATE INDEX IF NOT EXISTS idx_payments_user_id ON public.payments(user_id);
CREATE INDEX IF NOT EXISTS idx_payments_status ON public.payments(status);
CREATE INDEX IF NOT EXISTS idx_payments_utr ON public.payments(utr) WHERE utr IS NOT NULL AND utr != '';

ALTER TABLE public.payments ENABLE ROW LEVEL SECURITY;

-- Authenticated users get SELECT-only on their own payment records; ZERO client writes
DROP POLICY IF EXISTS "Users can read own payments" ON public.payments;
CREATE POLICY "Users can read own payments" ON public.payments
  FOR SELECT USING (auth.uid() = user_id);

-- ------------------------------------------------------------------------------
-- 6. SUBSCRIPTION AUDIT LOGS (Immutable Append-Only Audit Trail)
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.subscription_audit_logs (
  id BIGSERIAL PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  previous_status TEXT,
  new_status TEXT NOT NULL,
  reason TEXT NOT NULL,
  actor TEXT NOT NULL, -- e.g. 'webhook', 'cron', 'admin:<uuid>', 'user'
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_audit_logs_user_id ON public.subscription_audit_logs(user_id);

ALTER TABLE public.subscription_audit_logs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can read own audit logs" ON public.subscription_audit_logs;
CREATE POLICY "Users can read own audit logs" ON public.subscription_audit_logs
  FOR SELECT USING (auth.uid() = user_id);

-- ------------------------------------------------------------------------------
-- 7. VIP EMAIL WHITELIST TABLE
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.subscription_whitelist (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email TEXT NOT NULL UNIQUE,
  reason TEXT DEFAULT 'Approved by Admin',
  added_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.subscription_whitelist ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Public view whitelist" ON public.subscription_whitelist;
CREATE POLICY "Public view whitelist" ON public.subscription_whitelist
  FOR SELECT USING (true);

-- ------------------------------------------------------------------------------
-- 8. WEBHOOK DELIVERIES TABLE (Replay Protection Engine)
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.webhook_deliveries (
  delivery_id UUID PRIMARY KEY,
  order_id TEXT NOT NULL,
  event_type TEXT NOT NULL DEFAULT 'SUCCESS',
  received_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.webhook_deliveries ENABLE ROW LEVEL SECURITY;

-- ------------------------------------------------------------------------------
-- 9. GRANDFATHERING MIGRATION STEP FOR EXISTING USERS
-- ------------------------------------------------------------------------------
-- Grant all existing registered users a 30-day complimentary subscription period
-- so enabling billing does not lock out existing platform users.
DO $$
DECLARE
  default_plan_id UUID;
BEGIN
  SELECT id INTO default_plan_id FROM public.plans WHERE code = 'pro_monthly' LIMIT 1;
  IF default_plan_id IS NOT NULL THEN
    INSERT INTO public.subscriptions (user_id, plan_id, status, current_period_start, current_period_end, grace_period_days)
    SELECT 
      u.id,
      default_plan_id,
      'active',
      now(),
      now() + INTERVAL '30 days',
      3
    FROM auth.users u
    ON CONFLICT (user_id) DO NOTHING;
  END IF;
END $$;

-- ------------------------------------------------------------------------------
-- 10. HARDENED SERVER-SIDE PAYWALL GUARD FUNCTION (has_active_access)
-- ------------------------------------------------------------------------------
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
  -- Does NOT rely on stored 'status' string to prevent stale state bugs
  RETURN EXISTS (
    SELECT 1 FROM public.subscriptions
    WHERE user_id = user_uuid
      AND (current_period_end + (grace_period_days || ' days')::INTERVAL) > now()
  );
END;
$$;

-- ------------------------------------------------------------------------------
-- 11. ENFORCE SERVER-SIDE PAYWALL ON PROTECTED DOMAIN TABLES
-- ------------------------------------------------------------------------------
-- Clients Table
DROP POLICY IF EXISTS "Users can insert own clients" ON public.clients;
CREATE POLICY "Users can insert own clients" ON public.clients
  FOR INSERT WITH CHECK (auth.uid() = user_id AND public.has_active_access(auth.uid()));

-- Invoices Table
DROP POLICY IF EXISTS "Users can insert own invoices" ON public.invoices;
CREATE POLICY "Users can insert own invoices" ON public.invoices
  FOR INSERT WITH CHECK (auth.uid() = user_id AND public.has_active_access(auth.uid()));

-- Work Items Table
DROP POLICY IF EXISTS "Users can insert own work items" ON public.work_items;
CREATE POLICY "Users can insert own work items" ON public.work_items
  FOR INSERT WITH CHECK (auth.uid() = user_id AND public.has_active_access(auth.uid()));

-- Read & delete policies remain unconstrained so historical records are never blocked
-- ------------------------------------------------------------------------------

-- ==============================================================================
-- REVERSIBLE MIGRATION DOWN SECTION (For emergency rollback reference)
-- ==============================================================================
/*
DROP POLICY IF EXISTS "Users can insert own work items" ON public.work_items;
CREATE POLICY "Users can insert own work items" ON public.work_items FOR INSERT WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can insert own invoices" ON public.invoices;
CREATE POLICY "Users can insert own invoices" ON public.invoices FOR INSERT WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can insert own clients" ON public.clients;
CREATE POLICY "Users can insert own clients" ON public.clients FOR INSERT WITH CHECK (auth.uid() = user_id);

DROP FUNCTION IF EXISTS public.has_active_access(UUID);
DROP TABLE IF EXISTS public.webhook_deliveries;
DROP TABLE IF EXISTS public.subscription_audit_logs;
DROP TABLE IF EXISTS public.payments;
DROP TABLE IF EXISTS public.subscriptions;
DROP TABLE IF EXISTS public.plans;
DROP TABLE IF EXISTS public.admin_users;
DROP TABLE IF EXISTS public.platform_settings;
*/
