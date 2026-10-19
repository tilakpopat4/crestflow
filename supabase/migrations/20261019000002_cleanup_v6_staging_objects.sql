-- Migration: 20261019000002_cleanup_v6_staging_objects.sql
-- Description: Row-count safety checks before cleaning up v6 staging billing objects.
-- Safe: Will abort transaction if any staging table contains data.

DO $$
DECLARE
  v_count BIGINT;
BEGIN
  -- 1. Check subscriptions
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'subscriptions') THEN
    EXECUTE 'SELECT count(*) FROM public.subscriptions' INTO v_count;
    IF v_count > 0 THEN
      RAISE EXCEPTION 'Cannot drop table public.subscriptions: table contains % rows. Manual backup required.', v_count;
    END IF;
  END IF;

  -- 2. Check payments
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'payments') THEN
    EXECUTE 'SELECT count(*) FROM public.payments' INTO v_count;
    IF v_count > 0 THEN
      RAISE EXCEPTION 'Cannot drop table public.payments: table contains % rows. Manual backup required.', v_count;
    END IF;
  END IF;

  -- 3. Check subscription_audit_logs
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'subscription_audit_logs') THEN
    EXECUTE 'SELECT count(*) FROM public.subscription_audit_logs' INTO v_count;
    IF v_count > 0 THEN
      RAISE EXCEPTION 'Cannot drop table public.subscription_audit_logs: table contains % rows. Manual backup required.', v_count;
    END IF;
  END IF;

  -- 4. Check plans
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'plans') THEN
    EXECUTE 'SELECT count(*) FROM public.plans' INTO v_count;
    IF v_count > 0 THEN
      RAISE EXCEPTION 'Cannot drop table public.plans: table contains % rows. Manual backup required.', v_count;
    END IF;
  END IF;
END $$;

-- Drop dependent v6 staging triggers, functions, and views if any
DROP TRIGGER IF EXISTS trg_audit_subscriptions ON public.subscriptions;
DROP TRIGGER IF EXISTS trg_enforce_single_active_subscription ON public.subscriptions;
DROP TRIGGER IF EXISTS trg_restrict_invoice_insert ON public.invoices;
DROP TRIGGER IF EXISTS trg_restrict_client_insert ON public.clients;

DROP FUNCTION IF EXISTS public.fn_audit_subscription_changes();
DROP FUNCTION IF EXISTS public.fn_enforce_single_active_subscription();
DROP FUNCTION IF EXISTS private.has_active_access(UUID);
DROP SCHEMA IF EXISTS private CASCADE;

-- Drop empty v6 staging tables
DROP TABLE IF EXISTS public.subscription_audit_logs CASCADE;
DROP TABLE IF EXISTS public.payments CASCADE;
DROP TABLE IF EXISTS public.subscriptions CASCADE;
DROP TABLE IF EXISTS public.plans CASCADE;
