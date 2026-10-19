-- ==============================================================================
-- Migration: 20261019000001_drop_open_portal_policy.sql
-- Description: Drop open anonymous read policy on public.invoices.
--              Removes unrestricted SELECT access from public/anon roles.
-- Schema Target: public.invoices
-- ==============================================================================

BEGIN;

DROP POLICY IF EXISTS "Portal read access for invoices" ON public.invoices;

COMMIT;
