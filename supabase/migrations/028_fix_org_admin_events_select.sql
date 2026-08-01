-- Migration 028: fix missing org_admin SELECT policy on events
--
-- Root cause (diagnosed 2026-07-31/08-01, live SQL Editor investigation):
-- `events` has two SELECT policies — "Public read events" (status <> 'draft' only)
-- and "Event roles read events" (treasurer/volunteer_coord/referee/control_desk,
-- specific event only). Neither covers an org_admin reading their own org's DRAFT
-- events. Supabase's JS client always appends RETURNING to .insert() calls, and
-- Postgres checks RETURNING visibility against SELECT policies — so any org_admin
-- creating any new event (always starts as status='draft') gets a generic
-- "new row violates row-level security policy" error, even though the INSERT
-- itself is correctly permitted by the INSERT policy. Confirmed via: same insert
-- with RETURNING removed succeeds; with RETURNING present it fails identically
-- to the reported bug, in the exact same simulated session.
--
-- This likely regressed when migration 019 narrowed RLS across the board and an
-- existing "org_admin can read their own org's events" policy was dropped without
-- a replacement being added — not confirmed which specific migration removed it,
-- CC should check git history / migration 019 diff if that matters for the record.

create policy "Org admin read own events"
  on events
  for select
  to public
  using (
    is_super_admin()
    or is_org_admin_for(org_id)
    or is_event_admin_for(id)
  );
