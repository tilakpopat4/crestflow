-- ==============================================================================
-- Migration: 20261018_subscription_billing.sql
-- Description: Corrected Subscription Billing Engine Migration (v5)
--              Sets up normalized schema with private schema security,
--              PostgreSQL STABLE has_active_access function with bigint masked hash,
--              RESTRICTIVE paywall policies for INSERT and UPDATE,
--              strict RLS grants (safe payments columns, no client whitelist read),
--              append-only audit log trigger, and verified reversible rollback (DOWN).
-- Direction: UP and DOWN
-- ==============================================================================

-- ==============================================================================
-- UP MIGRATION
-- ==============================================================================

-- 1. Private Security Schema
CREATE SCHEMA IF NOT EXISTS private;
REVOKE ALL ON SCHEMA private FROM PUBLIC, anon, authenticated;
GRANT USAGE ON SCHEMA private TO service_role;

-- 2. Utility Trigger Functions
CREATE OR REPLACE FUNCTION private.set_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION private.prevent_audit_log_mutation()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  RAISE EXCEPTION 'subscription_audit_logs is append-only and cannot be modified or deleted';
END;
$$;

-- 3. Dynamic Feature Flag & System Configuration
CREATE TABLE IF NOT EXISTS public.platform_settings (
  key TEXT PRIMARY KEY,
  value JSONB NOT NULL DEFAULT '{}'::jsonb,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_by UUID REFERENCES auth.users(id) ON DELETE SET NULL
);

INSERT INTO public.platform_settings (key, value)
VALUES (
  'billing_config',
  '{
    "enabled": false,
    "rollout_percentage": 0,
    "beta_cohort_user_ids": [],
    "beta_cohort_emails": [],
    "gst_registered": false,
    "pricing_inclusive_gst": true,
    "sac_code": "998313"
  }'::jsonb
)
ON CONFLICT (key) DO NOTHING;

-- 4. Admin Users Table
CREATE TABLE IF NOT EXISTS public.admin_users (
  user_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE RESTRICT,
  notes TEXT DEFAULT 'Platform Administrator',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 5. Subscription Plans Table
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

INSERT INTO public.plans (code, name, price_paise, currency, period_days, period_label, entitlement_limits, is_active, sort_order)
VALUES 
  ('pro_monthly', 'CrestFlow Pro (Monthly)', 4900, 'INR', 30, '/ month', '{"max_clients": -1, "max_invoices": -1, "clean_pdf": true}'::jsonb, true, 1),
  ('pro_annual', 'CrestFlow Pro (Annual)', 49900, 'INR', 365, '/ year', '{"max_clients": -1, "max_invoices": -1, "clean_pdf": true}'::jsonb, true, 2)
ON CONFLICT (code) DO NOTHING;

-- 6. Subscriptions Table
CREATE TABLE IF NOT EXISTS public.subscriptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE RESTRICT,
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

-- 7. Authoritative Gateway Payments Table
CREATE TABLE IF NOT EXISTS public.payments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE RESTRICT,
  plan_id UUID NOT NULL REFERENCES public.plans(id) ON DELETE RESTRICT,
  provider_order_id TEXT NOT NULL UNIQUE,
  provider_payment_id TEXT,
  internal_reference TEXT NOT NULL UNIQUE,
  amount_paise BIGINT NOT NULL CHECK (amount_paise > 0),
  currency TEXT NOT NULL DEFAULT 'INR',
  status TEXT NOT NULL DEFAULT 'INITIATED' CHECK (status IN (
    'INITIATED', 'ACTIVE', 'QUEUED', 'PROCESSING', 'SUCCESS', 'FAILED', 'SUSPICIOUS', 'SUSPICIOUS_LATE_SUCCESS', 'PENDING_MANUAL_RECONCILIATION', 'REJECTED', 'EXPIRED', 'CANCELLED'
  )),
  reason TEXT,
  method TEXT NOT NULL DEFAULT 'UPI',
  utr TEXT CHECK (utr IS NULL OR utr ~ '^[0-9]{12}$'),
  raw_provider_payload JSONB DEFAULT '{}'::jsonb,
  paid_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT payments_paid_at_check CHECK ((status = 'SUCCESS' AND paid_at IS NOT NULL) OR (status != 'SUCCESS'))
);

CREATE INDEX IF NOT EXISTS idx_payments_user_id ON public.payments(user_id);
CREATE INDEX IF NOT EXISTS idx_payments_status ON public.payments(status);

CREATE UNIQUE INDEX IF NOT EXISTS idx_payments_one_open_order_per_user 
  ON public.payments (user_id) 
  WHERE status IN ('INITIATED', 'ACTIVE', 'QUEUED', 'PROCESSING');

CREATE UNIQUE INDEX IF NOT EXISTS idx_payments_unique_utr 
  ON public.payments (utr) 
  WHERE utr IS NOT NULL AND status IN ('SUCCESS', 'PENDING_MANUAL_RECONCILIATION');

-- 8. Subscription Audit Logs (Immutable Ledger)
CREATE TABLE IF NOT EXISTS public.subscription_audit_logs (
  id BIGSERIAL PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE RESTRICT,
  previous_status TEXT,
  new_status TEXT NOT NULL,
  reason TEXT NOT NULL,
  actor TEXT NOT NULL,
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_audit_logs_user_id ON public.subscription_audit_logs(user_id);

-- 9. Subscription Whitelist (VIP Management)
CREATE TABLE IF NOT EXISTS public.subscription_whitelist (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email TEXT NOT NULL UNIQUE,
  reason TEXT NOT NULL DEFAULT 'Approved by Admin',
  expires_at TIMESTAMPTZ,
  added_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 10. Webhook Deliveries (Replay Prevention)
CREATE TABLE IF NOT EXISTS public.webhook_deliveries (
  delivery_id UUID PRIMARY KEY,
  order_id TEXT NOT NULL,
  event_type TEXT NOT NULL DEFAULT 'SUCCESS',
  received_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 11. Triggers
CREATE TRIGGER audit_logs_append_only 
  BEFORE UPDATE OR DELETE ON public.subscription_audit_logs 
  FOR EACH ROW EXECUTE FUNCTION private.prevent_audit_log_mutation();

CREATE TRIGGER set_plans_updated_at 
  BEFORE UPDATE ON public.plans 
  FOR EACH ROW EXECUTE FUNCTION private.set_updated_at();

CREATE TRIGGER set_subscriptions_updated_at 
  BEFORE UPDATE ON public.subscriptions 
  FOR EACH ROW EXECUTE FUNCTION private.set_updated_at();

CREATE TRIGGER set_platform_settings_updated_at 
  BEFORE UPDATE ON public.platform_settings 
  FOR EACH ROW EXECUTE FUNCTION private.set_updated_at();

-- 12. Server-Side Paywall Guard Function
CREATE OR REPLACE FUNCTION private.has_active_access(user_uuid UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = private, public, pg_temp
AS $$
DECLARE
  config_val JSONB;
  user_email_val TEXT;
  confirmed_at_val TIMESTAMPTZ;
  is_globally_enabled BOOLEAN;
  rollout_pct INT;
  is_beta_cohort BOOLEAN;
BEGIN
  -- 1. Read dynamic settings
  SELECT value INTO config_val FROM public.platform_settings WHERE key = 'billing_config';
  is_globally_enabled := COALESCE((config_val->>'enabled')::boolean, false);
  
  -- If billing is globally OFF (dark launch), full access is granted
  IF NOT is_globally_enabled THEN
    RETURN TRUE;
  END IF;

  -- 2. Fetch authenticated user attributes
  SELECT email, email_confirmed_at INTO user_email_val, confirmed_at_val 
  FROM auth.users 
  WHERE id = user_uuid;

  -- 3. Check explicit beta cohorts (by UUID or email)
  is_beta_cohort := (config_val->'beta_cohort_user_ids') ? user_uuid::text
    OR (user_email_val IS NOT NULL AND (config_val->'beta_cohort_emails') ? user_email_val);
    
  IF is_beta_cohort THEN
    -- In active beta cohort; proceed to entitlement checks
    NULL;
  ELSE
    -- 4. Rollout percentage check with bigint masking to prevent integer overflow
    rollout_pct := COALESCE((config_val->>'rollout_percentage')::int, 0);
    IF (((('x' || substr(md5(user_uuid::text), 1, 8))::bit(32)::bigint & 4294967295) % 100) >= rollout_pct) THEN
      -- User is outside current rollout percentage cohort; grant access
      RETURN TRUE;
    END IF;
  END IF;

  -- 5. Whitelist check: matches lowercase email against confirmed emails ONLY, respecting expiry
  IF user_email_val IS NOT NULL AND confirmed_at_val IS NOT NULL AND EXISTS (
    SELECT 1 FROM public.subscription_whitelist 
    WHERE LOWER(email) = LOWER(user_email_val)
      AND (expires_at IS NULL OR expires_at > now())
  ) THEN
    RETURN TRUE;
  END IF;

  -- 6. Dynamic active subscription check
  RETURN EXISTS (
    SELECT 1 FROM public.subscriptions
    WHERE user_id = user_uuid
      AND (current_period_end + (grace_period_days || ' days')::INTERVAL) > now()
  );
END;
$$;

REVOKE EXECUTE ON FUNCTION private.has_active_access(UUID) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION private.has_active_access(UUID) TO authenticated, service_role;

-- 13. Enable RLS and Configure Explicit Grants
ALTER TABLE public.plans ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.subscriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.subscription_audit_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.subscription_whitelist ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.admin_users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.platform_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.webhook_deliveries ENABLE ROW LEVEL SECURITY;

REVOKE ALL ON TABLE 
  public.plans,
  public.subscriptions,
  public.payments,
  public.subscription_audit_logs,
  public.subscription_whitelist,
  public.admin_users,
  public.platform_settings,
  public.webhook_deliveries 
FROM PUBLIC, anon, authenticated;

-- Plans: Public can view active plans
GRANT SELECT ON public.plans TO anon, authenticated;
CREATE POLICY "allow_read_active_plans" ON public.plans 
  FOR SELECT USING (is_active = true);

-- Subscriptions: Authenticated user can read own row
GRANT SELECT ON public.subscriptions TO authenticated;
CREATE POLICY "allow_read_own_subscription" ON public.subscriptions 
  FOR SELECT USING (user_id = (select auth.uid()));

-- Payments: Column-level SELECT on safe columns (no internal_reference or raw_payload)
GRANT SELECT (id, user_id, plan_id, provider_order_id, provider_payment_id, amount_paise, currency, status, reason, method, utr, paid_at, created_at) 
  ON public.payments TO authenticated;
CREATE POLICY "allow_read_own_payments_safe" ON public.payments 
  FOR SELECT USING (user_id = (select auth.uid()));

-- Audit Logs: User can read own history
GRANT SELECT ON public.subscription_audit_logs TO authenticated;
CREATE POLICY "allow_read_own_audit_logs" ON public.subscription_audit_logs 
  FOR SELECT USING (user_id = (select auth.uid()));

-- Whitelist: Zero client grants/policies. Checked via backend status endpoint only.

-- Platform Settings: Public can read settings
GRANT SELECT (key, value, updated_at) ON public.platform_settings TO anon, authenticated;
CREATE POLICY "allow_read_platform_settings" ON public.platform_settings 
  FOR SELECT USING (true);

-- Admin Users: Authenticated user can read own admin flag
GRANT SELECT ON public.admin_users TO authenticated;
CREATE POLICY "allow_read_own_admin_status" ON public.admin_users 
  FOR SELECT USING (user_id = (select auth.uid()));

-- 14. Restrictive Paywall Policies on Domain Tables (clients, invoices, work_items)
ALTER TABLE public.clients ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.invoices ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.work_items ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "paywall_restrictive_clients_insert" ON public.clients;
CREATE POLICY "paywall_restrictive_clients_insert" ON public.clients
  AS RESTRICTIVE FOR INSERT TO authenticated
  WITH CHECK ((select private.has_active_access((select auth.uid()))));

DROP POLICY IF EXISTS "paywall_restrictive_clients_update" ON public.clients;
CREATE POLICY "paywall_restrictive_clients_update" ON public.clients
  AS RESTRICTIVE FOR UPDATE TO authenticated
  USING ((select private.has_active_access((select auth.uid()))));

DROP POLICY IF EXISTS "paywall_restrictive_invoices_insert" ON public.invoices;
CREATE POLICY "paywall_restrictive_invoices_insert" ON public.invoices
  AS RESTRICTIVE FOR INSERT TO authenticated
  WITH CHECK ((select private.has_active_access((select auth.uid()))));

DROP POLICY IF EXISTS "paywall_restrictive_invoices_update" ON public.invoices;
CREATE POLICY "paywall_restrictive_invoices_update" ON public.invoices
  AS RESTRICTIVE FOR UPDATE TO authenticated
  USING ((select private.has_active_access((select auth.uid()))));

DROP POLICY IF EXISTS "paywall_restrictive_work_items_insert" ON public.work_items;
CREATE POLICY "paywall_restrictive_work_items_insert" ON public.work_items
  AS RESTRICTIVE FOR INSERT TO authenticated
  WITH CHECK ((select private.has_active_access((select auth.uid()))));

DROP POLICY IF EXISTS "paywall_restrictive_work_items_update" ON public.work_items;
CREATE POLICY "paywall_restrictive_work_items_update" ON public.work_items
  AS RESTRICTIVE FOR UPDATE TO authenticated
  USING ((select private.has_active_access((select auth.uid()))));


-- ==============================================================================
-- DOWN MIGRATION (Reversible Rollback)
-- ==============================================================================
-- Execute the following block to revert the migration completely:
/*
DROP POLICY IF EXISTS "paywall_restrictive_clients_insert" ON public.clients;
DROP POLICY IF EXISTS "paywall_restrictive_clients_update" ON public.clients;
DROP POLICY IF EXISTS "paywall_restrictive_invoices_insert" ON public.invoices;
DROP POLICY IF EXISTS "paywall_restrictive_invoices_update" ON public.invoices;
DROP POLICY IF EXISTS "paywall_restrictive_work_items_insert" ON public.work_items;
DROP POLICY IF EXISTS "paywall_restrictive_work_items_update" ON public.work_items;

DROP TABLE IF EXISTS public.webhook_deliveries CASCADE;
DROP TABLE IF EXISTS public.subscription_whitelist CASCADE;
DROP TABLE IF EXISTS public.subscription_audit_logs CASCADE;
DROP TABLE IF EXISTS public.payments CASCADE;
DROP TABLE IF EXISTS public.subscriptions CASCADE;
DROP TABLE IF EXISTS public.plans CASCADE;
DROP TABLE IF EXISTS public.admin_users CASCADE;
DROP TABLE IF EXISTS public.platform_settings CASCADE;

DROP FUNCTION IF EXISTS private.prevent_audit_log_mutation() CASCADE;
DROP FUNCTION IF EXISTS private.set_updated_at() CASCADE;
DROP FUNCTION IF EXISTS private.has_active_access(UUID) CASCADE;

DROP SCHEMA IF EXISTS private CASCADE;
*/
