-- ═══════════════════════════════════════════════════════════════════════
-- Migration 009: Registration approval audit trail + admin lock queue
-- ═══════════════════════════════════════════════════════════════════════

-- Registration approval didn't have an admin attribution column
-- (payment_confirmed_by existed, but nothing equivalent for status
-- approval). Mirrors the existing payment_confirmed_by pattern.
ALTER TABLE registrations ADD COLUMN IF NOT EXISTS approved_by UUID;

-- ── Admin lock queue (Registrations panel only, for now) ──
-- Every admin who opens the Registrations panel gets a row here.
-- The row with the earliest joined_at for a given (event_id, resource)
-- is the "active" holder with edit access; everyone else is queued
-- behind them in join order. Heartbeats keep a row alive; if
-- last_heartbeat_at goes stale, the row is treated as disconnected.
-- Rejoining after a drop always creates a NEW row (new joined_at),
-- which naturally sends the admin to the back of the queue.
CREATE TABLE IF NOT EXISTS admin_lock_queue (
  id                UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  event_id          UUID NOT NULL REFERENCES events(id) ON DELETE CASCADE,
  resource          TEXT NOT NULL,                    -- 'registrations' for now
  admin_id          UUID NOT NULL REFERENCES admin_users(id),
  admin_name        TEXT,                              -- denormalized for display without extra join
  joined_at         TIMESTAMPTZ DEFAULT now() NOT NULL,
  last_heartbeat_at TIMESTAMPTZ DEFAULT now() NOT NULL,
  last_activity_at  TIMESTAMPTZ DEFAULT now() NOT NULL, -- separate from heartbeat; tracks real interaction for idle timeout
  UNIQUE(event_id, resource, admin_id)
);

CREATE INDEX IF NOT EXISTS idx_admin_lock_queue_lookup ON admin_lock_queue(event_id, resource, joined_at);

ALTER TABLE admin_lock_queue ENABLE ROW LEVEL SECURITY;

-- Any active admin can read/write lock queue rows (Pass 3 will scope
-- this to admins with access to the specific event).
CREATE POLICY "Admin full admin_lock_queue" ON admin_lock_queue FOR ALL USING (
  auth.uid() IN (SELECT id FROM admin_users WHERE active = true)
);

ALTER PUBLICATION supabase_realtime ADD TABLE admin_lock_queue;
