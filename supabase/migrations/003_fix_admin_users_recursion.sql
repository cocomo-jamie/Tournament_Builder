-- ═══════════════════════════════════════════════════════════════════════
-- Migration 003: Fix infinite recursion in admin_users RLS policy
-- ═══════════════════════════════════════════════════════════════════════
-- The original "Admin read admin_users" policy subqueried admin_users
-- from within a policy ON admin_users, causing Postgres to recurse
-- infinitely (error 42P17) whenever anything touched admin_users —
-- including indirectly, via other tables' admin policies that
-- subquery admin_users to check role/active status.
--
-- Fix: a user can always read their own admin_users row via a direct
-- auth.uid() = id check, with no self-referencing subquery. This is
-- sufficient for the app's current needs (no auth layer yet — this
-- just unblocks the recursion for public/anon reads on other tables).
-- ═══════════════════════════════════════════════════════════════════════

DROP POLICY IF EXISTS "Admin read admin_users" ON admin_users;

CREATE POLICY "Admin read own row" ON admin_users FOR SELECT USING (
  auth.uid() = id
);
