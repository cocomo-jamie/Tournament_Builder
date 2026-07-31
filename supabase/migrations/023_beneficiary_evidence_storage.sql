-- ═══════════════════════════════════════════════════════════════════════
-- Migration 023: storage bucket for post-event fulfillment evidence
-- ═══════════════════════════════════════════════════════════════════════
-- Phase 5 of the CC work order for
-- FEATURE_SPEC_billing_and_beneficiary_commitments.md (§4).
--
-- FLAG: the work order says "reuse whatever file-upload pattern
-- field_layout_files already uses" — that pattern doesn't actually exist.
-- `events.field_layout_files` is a JSONB column in schema.sql with no
-- upload UI or Supabase Storage bucket backing it anywhere in this
-- codebase (grepped `storage.` and `field_layout` across src/ and
-- supabase/ — only a `field_layout_notes` *text* field is wired up, in
-- createTournament.js). So this migration creates the first real
-- Storage bucket + RLS policy pair in the project, scoped narrowly to
-- this feature. It's a reasonable precedent for field_layout_files to
-- adopt later, not a copy of an existing one.
--
-- Private by default (work order decision, 2026-07-30): evidence is
-- admin/super_admin-visible only, so this is a PRIVATE bucket, not a
-- public one — `evidence_files.url` stores a bucket-relative path, not a
-- public URL. The app must call createSignedUrl() to display a file;
-- there is no public read path here or anywhere else in this migration.
--
-- Path convention: `${event_id}/${filename}` — lets the RLS policies key
-- off the folder name without a second lookup table.
--
-- NOT APPLIED TO THE LIVE DB. Same manual-application pattern as every
-- other migration in this project — committed for the project owner to
-- run via the Supabase SQL Editor.
-- ═══════════════════════════════════════════════════════════════════════

INSERT INTO storage.buckets (id, name, public)
VALUES ('beneficiary-evidence', 'beneficiary-evidence', false)
ON CONFLICT (id) DO NOTHING;

-- Event admins (super_admin / org_admin / event-scoped admin — same
-- is_event_admin_for() used everywhere else) can upload and read files
-- under their own event's folder.
CREATE POLICY "Event admins upload beneficiary evidence" ON storage.objects FOR INSERT WITH CHECK (
  bucket_id = 'beneficiary-evidence'
  AND is_event_admin_for(((storage.foldername(name))[1])::uuid)
);

CREATE POLICY "Event admins read beneficiary evidence" ON storage.objects FOR SELECT USING (
  bucket_id = 'beneficiary-evidence'
  AND is_event_admin_for(((storage.foldername(name))[1])::uuid)
);

CREATE POLICY "Event admins delete beneficiary evidence" ON storage.objects FOR DELETE USING (
  bucket_id = 'beneficiary-evidence'
  AND is_event_admin_for(((storage.foldername(name))[1])::uuid)
);

-- super_admin already matches is_event_admin_for() for every event (its
-- first branch is is_super_admin()), so no separate reviewer policy is
-- needed — the three policies above already cover the reviewer.
