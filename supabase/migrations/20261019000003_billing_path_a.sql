-- Migration: 20261019000003_billing_path_a.sql
-- Description: Path A billing schema keyed to firebase_uid TEXT.
-- Preserves all v6 constraints, indexes, triggers, and audit logging.
-- RLS enabled on all tables; restricted to service_role (Express backend).

-- 1. Plans Table
CREATE TABLE IF NOT EXISTS public.plans (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  slug TEXT UNIQUE NOT NULL,
  tier TEXT NOT NULL CHECK (tier IN ('free', 'pro', 'enterprise')),
  interval TEXT NOT NULL CHECK (interval IN ('monthly', 'yearly')),
  price_paise BIGINT NOT NULL CHECK (price_paise >= 0),
  currency TEXT NOT NULL DEFAULT 'INR',
  features JSONB NOT NULL DEFAULT '[]'::jsonb,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT clock_timestamp(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT clock_timestamp()
);

-- 2. Subscriptions Table
CREATE TABLE IF NOT EXISTS public.subscriptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  firebase_uid TEXT NOT NULL CHECK (char_length(trim(firebase_uid)) > 0 AND char_length(firebase_uid) <= 128),
  plan_id UUID NOT NULL REFERENCES public.plans(id) ON DELETE RESTRICT,
  tier TEXT NOT NULL CHECK (tier IN ('free', 'pro', 'enterprise')),
  status TEXT NOT NULL CHECK (status IN ('trialing', 'active', 'past_due', 'canceled', 'unpaid', 'incomplete')),
  current_period_start TIMESTAMPTZ NOT NULL,
  current_period_end TIMESTAMPTZ NOT NULL,
  cancel_at_period_end BOOLEAN NOT NULL DEFAULT false,
  canceled_at TIMESTAMPTZ,
  ended_at TIMESTAMPTZ,
  reason TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT clock_timestamp(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT clock_timestamp(),
  CONSTRAINT check_period_order CHECK (current_period_end >= current_period_start)
);

-- Index for fast lookup by firebase_uid
CREATE INDEX IF NOT EXISTS idx_subscriptions_firebase_uid ON public.subscriptions (firebase_uid);
-- Partial unique index ensuring at most one active/trialing subscription per Firebase user
CREATE UNIQUE INDEX IF NOT EXISTS uq_sub_single_active ON public.subscriptions (firebase_uid) WHERE (status IN ('active', 'trialing'));

-- 3. Payments Table
CREATE TABLE IF NOT EXISTS public.payments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  subscription_id UUID REFERENCES public.subscriptions(id) ON DELETE SET NULL,
  firebase_uid TEXT NOT NULL CHECK (char_length(trim(firebase_uid)) > 0 AND char_length(firebase_uid) <= 128),
  order_id TEXT UNIQUE NOT NULL,
  payment_id TEXT,
  utr_number TEXT,
  amount_paise BIGINT NOT NULL CHECK (amount_paise > 0),
  currency TEXT NOT NULL DEFAULT 'INR',
  status TEXT NOT NULL CHECK (status IN ('created', 'pending_verification', 'completed', 'failed', 'refunded')),
  provider TEXT NOT NULL DEFAULT 'upi_qr',
  paid_at TIMESTAMPTZ,
  raw_provider_payload JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT clock_timestamp(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT clock_timestamp(),
  CONSTRAINT check_paid_at_status CHECK (
    (status = 'completed' AND paid_at IS NOT NULL) OR
    (status <> 'completed')
  ),
  CONSTRAINT check_utr_format CHECK (
    utr_number IS NULL OR utr_number ~ '^[A-Za-z0-9]{8,22}$'
  )
);

CREATE INDEX IF NOT EXISTS idx_payments_firebase_uid ON public.payments (firebase_uid);
CREATE INDEX IF NOT EXISTS idx_payments_order_id ON public.payments (order_id);
CREATE INDEX IF NOT EXISTS idx_payments_utr ON public.payments (utr_number) WHERE utr_number IS NOT NULL;

-- 4. Subscription Audit Logs Table
CREATE TABLE IF NOT EXISTS public.subscription_audit_logs (
  id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  subscription_id UUID NOT NULL,
  firebase_uid TEXT NOT NULL,
  action TEXT NOT NULL,
  old_state JSONB,
  new_state JSONB,
  performed_by TEXT NOT NULL DEFAULT 'system',
  created_at TIMESTAMPTZ NOT NULL DEFAULT clock_timestamp()
);

CREATE INDEX IF NOT EXISTS idx_sub_audit_sub_id ON public.subscription_audit_logs (subscription_id);
CREATE INDEX IF NOT EXISTS idx_sub_audit_firebase_uid ON public.subscription_audit_logs (firebase_uid);

-- 5. Audit Trigger Function
CREATE OR REPLACE FUNCTION public.fn_audit_subscriptions()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    INSERT INTO public.subscription_audit_logs (subscription_id, firebase_uid, action, old_state, new_state, performed_by)
    VALUES (NEW.id, NEW.firebase_uid, 'INSERT', NULL, to_jsonb(NEW), 'system');
    RETURN NEW;
  ELSIF TG_OP = 'UPDATE' THEN
    INSERT INTO public.subscription_audit_logs (subscription_id, firebase_uid, action, old_state, new_state, performed_by)
    VALUES (NEW.id, NEW.firebase_uid, 'UPDATE', to_jsonb(OLD), to_jsonb(NEW), 'system');
    RETURN NEW;
  ELSIF TG_OP = 'DELETE' THEN
    INSERT INTO public.subscription_audit_logs (subscription_id, firebase_uid, action, old_state, new_state, performed_by)
    VALUES (OLD.id, OLD.firebase_uid, 'DELETE', to_jsonb(OLD), NULL, 'system');
    RETURN OLD;
  END IF;
  RETURN NULL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS trg_audit_subscriptions ON public.subscriptions;
CREATE TRIGGER trg_audit_subscriptions
AFTER INSERT OR UPDATE OR DELETE ON public.subscriptions
FOR EACH ROW EXECUTE FUNCTION public.fn_audit_subscriptions();

-- 6. Updated_at Trigger
CREATE OR REPLACE FUNCTION public.fn_set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = clock_timestamp();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_plans_updated_at ON public.plans;
CREATE TRIGGER trg_plans_updated_at
BEFORE UPDATE ON public.plans
FOR EACH ROW EXECUTE FUNCTION public.fn_set_updated_at();

DROP TRIGGER IF EXISTS trg_subscriptions_updated_at ON public.subscriptions;
CREATE TRIGGER trg_subscriptions_updated_at
BEFORE UPDATE ON public.subscriptions
FOR EACH ROW EXECUTE FUNCTION public.fn_set_updated_at();

DROP TRIGGER IF EXISTS trg_payments_updated_at ON public.payments;
CREATE TRIGGER trg_payments_updated_at
BEFORE UPDATE ON public.payments
FOR EACH ROW EXECUTE FUNCTION public.fn_set_updated_at();

-- 7. RLS & Permissions Hardening
ALTER TABLE public.plans ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.subscriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.subscription_audit_logs ENABLE ROW LEVEL SECURITY;

REVOKE ALL ON ALL TABLES IN SCHEMA public FROM anon, authenticated, public;

-- Grant access ONLY to service_role (Express server backend)
GRANT SELECT, INSERT, UPDATE, DELETE ON public.plans TO service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.subscriptions TO service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.payments TO service_role;
GRANT SELECT, INSERT ON public.subscription_audit_logs TO service_role;

-- 8. Seed Default Plans
INSERT INTO public.plans (slug, tier, interval, price_paise, currency, features, is_active)
VALUES
  ('free-tier', 'free', 'monthly', 0, 'INR', '["Up to 3 active clients", "Standard invoices", "Basic PDF export"]'::jsonb, true),
  ('pro-monthly', 'pro', 'monthly', 49900, 'INR', '["Unlimited clients", "Auto-invoice engine (6 AM)", "Direct Gmail sending", "Custom branding", "Client portal access"]'::jsonb, true),
  ('pro-yearly', 'pro', 'yearly', 499900, 'INR', '["All Pro features", "2 months free", "Priority support"]'::jsonb, true)
ON CONFLICT (slug) DO UPDATE SET
  price_paise = EXCLUDED.price_paise,
  features = EXCLUDED.features,
  is_active = EXCLUDED.is_active,
  updated_at = clock_timestamp();
