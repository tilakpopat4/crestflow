-- ==============================================================================
-- Migration Rollback: 20261019000001_drop_open_portal_policy_rollback.sql
-- Description: EMERGENCY ONLY - Restores the exact open portal read policy on
--              public.invoices as captured from pg_policies.
--
-- pg_policies snapshot:
--   schemaname : public
--   tablename  : invoices
--   policyname : Portal read access for invoices
--   permissive : PERMISSIVE
--   roles      : {public}
--   cmd        : SELECT
--   qual       : true
--   with_check : null
--
-- WARNING: This policy grants unrestricted read access to ALL invoice records
--          to any unauthenticated client with the Supabase anon key.
--          Apply ONLY in emergency situations where backward compatibility
--          must be restored instantly.
-- ==============================================================================

BEGIN;

DROP POLICY IF EXISTS "Portal read access for invoices" ON public.invoices;

CREATE POLICY "Portal read access for invoices"
  ON public.invoices
  AS PERMISSIVE
  FOR SELECT
  TO public
  USING (true);

COMMIT;
