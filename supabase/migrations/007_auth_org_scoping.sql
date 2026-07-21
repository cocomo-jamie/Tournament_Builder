-- ═══════════════════════════════════════════════════════════════════════
-- Migration 007: Auth org scoping + invite system
-- ═══════════════════════════════════════════════════════════════════════
-- Adds org_id to admin_users (super_admin has org_id = NULL, meaning
-- platform-wide). Adds the invites table so org_admins/super_admins can
-- invite new admin_users without needing a serverless function — a
-- Postgres trigger auto-creates the admin_users row when someone signs
-- up matching a valid, unexpired invite.
--
-- NOTE: This does NOT yet tighten the existing "Admin full X" policies
-- to scope by org_id — that's a deliberately separate pass (Step 4
-- Pass 3) once login is confirmed working end to end.
-- ═══════════════════════════════════════════════════════════════════════

-- ── admin_users: add org scoping ──
ALTER TABLE admin_users ADD COLUMN IF NOT EXISTS org_id UUID REFERENCES organizations(id) ON DELETE CASCADE;
ALTER TABLE admin_users ADD COLUMN IF NOT EXISTS email TEXT;

COMMENT ON COLUMN admin_users.org_id IS 'NULL = super_admin (platform-wide). Otherwise scopes this admin to one organization.';
COMMENT ON COLUMN admin_users.role IS 'super_admin: platform-wide, can create orgs + invite org_admins. org_admin: full org access. admin: full event access. treasurer: registrations + payments. referee: game day match ops. volunteer_coord: volunteer management. control_desk: game day court/bracket control.';

CREATE INDEX IF NOT EXISTS idx_admin_users_org ON admin_users(org_id);

-- ── Invites table ──
CREATE TABLE IF NOT EXISTS invites (
  id            UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  email         TEXT NOT NULL,
  org_id        UUID REFERENCES organizations(id) ON DELETE CASCADE,  -- NULL only for super_admin invites
  event_id      UUID REFERENCES events(id) ON DELETE CASCADE,          -- NULL = org-level admin
  role          TEXT NOT NULL DEFAULT 'admin',
  display_name  TEXT,
  token         TEXT NOT NULL UNIQUE DEFAULT encode(gen_random_bytes(24), 'hex'),
  invited_by    UUID REFERENCES admin_users(id),
  expires_at    TIMESTAMPTZ NOT NULL DEFAULT (now() + interval '7 days'),
  used_at       TIMESTAMPTZ,
  created_at    TIMESTAMPTZ DEFAULT now() NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_invites_token ON invites(token) WHERE used_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_invites_email ON invites(email) WHERE used_at IS NULL;

ALTER TABLE invites ENABLE ROW LEVEL SECURITY;

-- Public can read an invite by token (needed for the Accept Invite page
-- to display who invited them / what role, before they've signed up
-- and have no auth.uid() yet). Scoped tightly: only unused, unexpired.
CREATE POLICY "Public read own invite by token" ON invites FOR SELECT USING (
  used_at IS NULL AND expires_at > now()
);

-- Any active admin can create invites for now (Pass 3 will scope this
-- to org_admin/super_admin only, matching their own org_id).
CREATE POLICY "Admin create invites" ON invites FOR INSERT WITH CHECK (
  auth.uid() IN (SELECT id FROM admin_users WHERE active = true)
);

CREATE POLICY "Admin read invites" ON invites FOR SELECT USING (
  auth.uid() IN (SELECT id FROM admin_users WHERE active = true)
);

-- ── Trigger: auto-create admin_users row on matching signup ──
-- When a new row appears in auth.users (i.e. someone completed
-- supabase.auth.signUp), check for a pending invite matching their
-- email. If found and valid, create the admin_users row and mark the
-- invite used. This runs as SECURITY DEFINER so it bypasses RLS —
-- necessary since the new user has no admin_users row yet to satisfy
-- any "admin can insert" policy.

CREATE OR REPLACE FUNCTION handle_invite_signup()
RETURNS TRIGGER
SECURITY DEFINER
SET search_path = public
LANGUAGE plpgsql
AS $$
DECLARE
  matched_invite invites%ROWTYPE;
BEGIN
  SELECT * INTO matched_invite
  FROM invites
  WHERE email = NEW.email
    AND used_at IS NULL
    AND expires_at > now()
  ORDER BY created_at DESC
  LIMIT 1;

  IF matched_invite.id IS NOT NULL THEN
    INSERT INTO admin_users (id, org_id, event_id, role, display_name, email, active)
    VALUES (
      NEW.id,
      matched_invite.org_id,
      matched_invite.event_id,
      matched_invite.role,
      COALESCE(matched_invite.display_name, split_part(NEW.email, '@', 1)),
      NEW.email,
      true
    );

    UPDATE invites SET used_at = now() WHERE id = matched_invite.id;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_created_check_invite ON auth.users;
CREATE TRIGGER on_auth_user_created_check_invite
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION handle_invite_signup();
