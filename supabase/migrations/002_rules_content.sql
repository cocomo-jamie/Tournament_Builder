-- ═══════════════════════════════════════════════════════════════════════
-- Migration 002: Add rules_content to events
-- ═══════════════════════════════════════════════════════════════════════
-- The Rules tab in AdminDashboard references this column but it wasn't
-- in the original schema. The api.js service layer already has
-- events.updateRules(eventId, rulesContent) ready to use it.
-- ═══════════════════════════════════════════════════════════════════════

ALTER TABLE events ADD COLUMN IF NOT EXISTS rules_content TEXT;
