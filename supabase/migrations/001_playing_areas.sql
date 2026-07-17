-- ═══════════════════════════════════════════════════════════════════════
-- MIGRATION: Generalize courts → playing_areas
-- Run in Supabase SQL Editor after the initial schema
-- ═══════════════════════════════════════════════════════════════════════


-- ─────────────────────────────────────────────────────────────────────
-- 1. RENAME TABLES
-- ─────────────────────────────────────────────────────────────────────

ALTER TABLE courts RENAME TO playing_areas;
ALTER TABLE court_queue RENAME TO playing_area_queue;


-- ─────────────────────────────────────────────────────────────────────
-- 2. RENAME COLUMNS ON events TABLE
-- ─────────────────────────────────────────────────────────────────────

ALTER TABLE events RENAME COLUMN court_count TO area_count;
ALTER TABLE events RENAME COLUMN court_label TO area_label;


-- ─────────────────────────────────────────────────────────────────────
-- 3. RENAME FK COLUMNS ON matches
-- ─────────────────────────────────────────────────────────────────────

ALTER TABLE matches RENAME COLUMN court_id TO playing_area_id;


-- ─────────────────────────────────────────────────────────────────────
-- 4. RENAME FK COLUMNS ON playing_area_queue
-- ─────────────────────────────────────────────────────────────────────

ALTER TABLE playing_area_queue RENAME COLUMN court_id TO playing_area_id;


-- ─────────────────────────────────────────────────────────────────────
-- 5. RENAME INDEXES
-- ─────────────────────────────────────────────────────────────────────

ALTER INDEX idx_courts_event RENAME TO idx_playing_areas_event;
ALTER INDEX idx_court_queue_event RENAME TO idx_playing_area_queue_event;
ALTER INDEX idx_court_queue_waiting RENAME TO idx_playing_area_queue_waiting;
ALTER INDEX idx_matches_court RENAME TO idx_matches_playing_area;


-- ─────────────────────────────────────────────────────────────────────
-- 6. UPDATE REALTIME PUBLICATION
-- ─────────────────────────────────────────────────────────────────────

ALTER PUBLICATION supabase_realtime DROP TABLE courts;
ALTER PUBLICATION supabase_realtime DROP TABLE court_queue;
ALTER PUBLICATION supabase_realtime ADD TABLE playing_areas;
ALTER PUBLICATION supabase_realtime ADD TABLE playing_area_queue;


-- ═══════════════════════════════════════════════════════════════════════
-- DONE
-- ═══════════════════════════════════════════════════════════════════════
-- RLS policies, triggers, and FK constraints automatically follow
-- the renamed tables — Postgres handles this internally.
--
-- Frontend VENUE_LABELS in the wizard already maps sport → display
-- word. The events.area_label column stores whichever word applies
-- (Courts, Pitches, Lanes, etc.) and the UI reads it from there.
