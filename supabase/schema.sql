-- ═══════════════════════════════════════════════════════════════════════
-- TOURNAMENT PLATFORM — SUPABASE SCHEMA
-- ═══════════════════════════════════════════════════════════════════════
-- Covers: Builder Admin, Artifact Publisher, Game Day Ops,
--         Public Site, Player Portal, TV Display
--
-- Run this in Supabase SQL Editor in order (dependencies flow top-down)
-- ═══════════════════════════════════════════════════════════════════════


-- ─────────────────────────────────────────────────────────────────────
-- 0. EXTENSIONS
-- ─────────────────────────────────────────────────────────────────────
CREATE EXTENSION IF NOT EXISTS "pgcrypto";      -- gen_random_uuid()
CREATE EXTENSION IF NOT EXISTS "moddatetime";   -- auto-update updated_at


-- ═══════════════════════════════════════════════════════════════════════
-- 1. ORGANIZATIONS & EVENTS
-- ═══════════════════════════════════════════════════════════════════════

CREATE TABLE organizations (
  id            UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name          TEXT NOT NULL,
  email         TEXT NOT NULL,
  phone         TEXT,
  website       TEXT,
  logo_url      TEXT,
  style_ref_url TEXT,                          -- reference site for branding
  brand         JSONB DEFAULT '{}'::jsonb,     -- {primary, secondary, accent, dark, light}
  images        JSONB DEFAULT '[]'::jsonb,     -- [{url, caption, usage}]
  created_at    TIMESTAMPTZ DEFAULT now() NOT NULL,
  updated_at    TIMESTAMPTZ DEFAULT now() NOT NULL
);

CREATE TABLE events (
  id              UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  org_id          UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  name            TEXT NOT NULL,
  sport           TEXT NOT NULL,                -- 'bocce', 'soccer', etc.
  sport_custom    TEXT,                         -- if sport = 'other'
  tagline         TEXT,
  description     TEXT,
  venue_name      TEXT NOT NULL,
  venue_address   TEXT,
  court_count     INT DEFAULT 4,
  court_label     TEXT DEFAULT 'Courts',        -- 'Courts', 'Pitches', 'Lanes'

  -- Schedule
  event_days      INT DEFAULT 1,
  end_time        TIME,

  -- Tournament format
  format          TEXT NOT NULL DEFAULT 'pool_playoff',  -- round_robin, single_elim, double_elim, pool_playoff, swiss
  min_teams       INT DEFAULT 8,
  max_teams       INT DEFAULT 24,
  players_per_team INT DEFAULT 4,
  players_min     INT DEFAULT 3,
  players_max     INT DEFAULT 6,
  require_captain BOOLEAN DEFAULT true,
  require_coach   BOOLEAN DEFAULT false,
  pool_count      INT DEFAULT 4,
  teams_per_pool  INT DEFAULT 4,
  points_to_win   INT DEFAULT 11,
  max_points      INT DEFAULT 15,
  time_limit_min  INT DEFAULT 0,               -- 0 = no limit
  allow_ties      BOOLEAN DEFAULT false,

  -- Registration config
  reg_deadline    DATE,
  entry_fee       NUMERIC(10,2) DEFAULT 0,
  allow_donations BOOLEAN DEFAULT true,
  collect_shirts  BOOLEAN DEFAULT false,
  collect_dietary BOOLEAN DEFAULT false,
  allow_team_logo BOOLEAN DEFAULT true,
  allow_team_slogan BOOLEAN DEFAULT true,
  slogan_max_words INT DEFAULT 10,
  allow_team_story BOOLEAN DEFAULT true,
  story_max_words INT DEFAULT 300,
  image_consent   BOOLEAN DEFAULT true,
  image_consent_text TEXT,
  waiver_required BOOLEAN DEFAULT false,
  waiver_text     TEXT,

  -- Payment config
  payment_etransfer    BOOLEAN DEFAULT true,
  etransfer_email      TEXT,
  payment_stripe       BOOLEAN DEFAULT false,
  stripe_price_id      TEXT,                    -- Stripe product/price for checkout
  payment_cash         BOOLEAN DEFAULT true,
  auto_reconciliation  BOOLEAN DEFAULT true,
  recon_prefix         TEXT DEFAULT 'EF',       -- generates EF-100, EF-101...
  recon_counter        INT DEFAULT 100,         -- increments per registration

  -- Fundraising
  is_charity           BOOLEAN DEFAULT false,
  cause_name           TEXT,
  cause_description    TEXT,
  cause_education      TEXT,                    -- educational content (markdown ok)
  charity_logo_url     TEXT,
  fundraising_goal     NUMERIC(10,2) DEFAULT 0,
  fundraising_current  NUMERIC(10,2) DEFAULT 0,
  show_thermometer     BOOLEAN DEFAULT true,

  -- Checklists (JSONB arrays of {label, checked, custom?, notes?})
  equipment_checklist  JSONB DEFAULT '[]'::jsonb,
  facilities_checklist JSONB DEFAULT '[]'::jsonb,
  signage_checklist    JSONB DEFAULT '[]'::jsonb,
  permits_checklist    JSONB DEFAULT '[]'::jsonb,

  -- Layout
  field_layout_notes   TEXT,
  field_layout_files   JSONB DEFAULT '[]'::jsonb,  -- [{url, filename, uploaded_at}]

  -- Feature flags (which deliverables to generate)
  gen_schedule       BOOLEAN DEFAULT true,
  gen_run_sheet      BOOLEAN DEFAULT true,
  gen_site_maps      BOOLEAN DEFAULT false,
  gen_resource_dir   BOOLEAN DEFAULT true,
  gen_volunteer_pkg  BOOLEAN DEFAULT false,
  gen_staff_pkg      BOOLEAN DEFAULT false,
  gen_service_pkg    BOOLEAN DEFAULT false,
  enable_ai_qa       BOOLEAN DEFAULT false,
  enable_gift_basket BOOLEAN DEFAULT false,

  -- Status
  status           TEXT DEFAULT 'draft' NOT NULL,  -- draft, registration_open, registration_closed, game_day, completed, archived
  published_at     TIMESTAMPTZ,

  created_at       TIMESTAMPTZ DEFAULT now() NOT NULL,
  updated_at       TIMESTAMPTZ DEFAULT now() NOT NULL
);

CREATE TABLE event_dates (
  id        UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  event_id  UUID NOT NULL REFERENCES events(id) ON DELETE CASCADE,
  day_date  DATE NOT NULL,
  label     TEXT,                              -- 'Day 1', 'Tournament Day', 'Finals Day'
  sort_order INT DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now() NOT NULL
);

CREATE INDEX idx_event_dates_event ON event_dates(event_id);


-- ═══════════════════════════════════════════════════════════════════════
-- 2. REGISTRATIONS, TEAMS & PLAYERS
-- ═══════════════════════════════════════════════════════════════════════

CREATE TABLE registrations (
  id                BIGSERIAL PRIMARY KEY,
  event_id          UUID NOT NULL REFERENCES events(id) ON DELETE CASCADE,
  created_at        TIMESTAMPTZ DEFAULT now() NOT NULL,

  -- Team info
  team_name         TEXT NOT NULL,
  team_slogan       TEXT,
  team_logo_url     TEXT,

  -- Captain (= Player 1)
  captain_name      TEXT NOT NULL,
  captain_email     TEXT NOT NULL,
  captain_phone     TEXT NOT NULL,
  captain_shirt     TEXT,
  captain_dietary   TEXT,

  -- Payment
  payment_method    TEXT NOT NULL DEFAULT 'e_transfer',  -- e_transfer, stripe, cash
  payment_status    TEXT DEFAULT 'pending' NOT NULL,      -- pending, paid, refunded, failed
  fee_amount        NUMERIC(10,2) NOT NULL,
  donation_amount   NUMERIC(10,2) DEFAULT 0,
  total_amount      NUMERIC(10,2) NOT NULL,
  reconciliation_code TEXT UNIQUE NOT NULL,               -- EF-104
  stripe_session_id   TEXT,                               -- Stripe Checkout session
  payment_confirmed_at TIMESTAMPTZ,
  payment_confirmed_by UUID,                              -- admin user who confirmed

  -- Consent
  image_consent     BOOLEAN DEFAULT false,
  waiver_accepted   BOOLEAN DEFAULT false,

  -- Story (bulletin board)
  team_story        TEXT,
  team_story_image  TEXT,                                 -- URL to uploaded image

  -- Status
  status            TEXT DEFAULT 'submitted' NOT NULL,    -- submitted, confirmed, rejected, withdrawn
  confirmed_at      TIMESTAMPTZ,

  updated_at        TIMESTAMPTZ DEFAULT now() NOT NULL
);

CREATE INDEX idx_registrations_event ON registrations(event_id);
CREATE INDEX idx_registrations_status ON registrations(event_id, status);
CREATE INDEX idx_registrations_payment ON registrations(event_id, payment_status);
CREATE INDEX idx_registrations_recon ON registrations(reconciliation_code);

-- Teams are created from confirmed registrations
CREATE TABLE teams (
  id               UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  event_id         UUID NOT NULL REFERENCES events(id) ON DELETE CASCADE,
  registration_id  BIGINT REFERENCES registrations(id),
  name             TEXT NOT NULL,
  slogan           TEXT,
  logo_url         TEXT,
  seed             INT,                          -- for bracket seeding
  pool_id          UUID,                         -- assigned during pool draw (FK added after pools table)
  checked_in       BOOLEAN DEFAULT false NOT NULL,
  checked_in_at    TIMESTAMPTZ,
  checked_in_by    UUID,                         -- admin/volunteer who checked them in
  eliminated       BOOLEAN DEFAULT false,
  final_rank       INT,                          -- final tournament position
  created_at       TIMESTAMPTZ DEFAULT now() NOT NULL,
  updated_at       TIMESTAMPTZ DEFAULT now() NOT NULL
);

CREATE INDEX idx_teams_event ON teams(event_id);
CREATE INDEX idx_teams_pool ON teams(pool_id);

CREATE TABLE players (
  id            UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  team_id       UUID NOT NULL REFERENCES teams(id) ON DELETE CASCADE,
  event_id      UUID NOT NULL REFERENCES events(id) ON DELETE CASCADE,
  is_captain    BOOLEAN DEFAULT false NOT NULL,
  is_coach      BOOLEAN DEFAULT false NOT NULL,
  full_name     TEXT NOT NULL,
  email         TEXT,
  phone         TEXT,
  shirt_size    TEXT,
  dietary_needs TEXT,
  sort_order    INT DEFAULT 0,                   -- 0 = captain, 1 = player 2, etc.
  created_at    TIMESTAMPTZ DEFAULT now() NOT NULL
);

CREATE INDEX idx_players_team ON players(team_id);
CREATE INDEX idx_players_event ON players(event_id);
CREATE INDEX idx_players_captain ON players(event_id, is_captain) WHERE is_captain = true;


-- ═══════════════════════════════════════════════════════════════════════
-- 3. TOURNAMENT STRUCTURE — POOLS, COURTS, BRACKETS, MATCHES
-- ═══════════════════════════════════════════════════════════════════════

CREATE TABLE pools (
  id         UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  event_id   UUID NOT NULL REFERENCES events(id) ON DELETE CASCADE,
  name       TEXT NOT NULL,                     -- 'Pool A', 'Pool B'
  sort_order INT DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now() NOT NULL
);

CREATE INDEX idx_pools_event ON pools(event_id);

-- Now add the FK from teams -> pools
ALTER TABLE teams
  ADD CONSTRAINT fk_teams_pool FOREIGN KEY (pool_id) REFERENCES pools(id) ON DELETE SET NULL;

CREATE TABLE courts (
  id         UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  event_id   UUID NOT NULL REFERENCES events(id) ON DELETE CASCADE,
  number     INT NOT NULL,                      -- Court 1, 2, 3...
  name       TEXT,                              -- optional friendly name
  status     TEXT DEFAULT 'available' NOT NULL,  -- available, in_use, maintenance, closed
  location_notes TEXT,                          -- 'North side of pavilion'
  created_at TIMESTAMPTZ DEFAULT now() NOT NULL
);

CREATE INDEX idx_courts_event ON courts(event_id);

CREATE TABLE brackets (
  id              UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  event_id        UUID NOT NULL REFERENCES events(id) ON DELETE CASCADE,
  name            TEXT NOT NULL,                 -- 'Championship', 'Plate', 'Consolation'
  bracket_type    TEXT NOT NULL DEFAULT 'championship',  -- championship, plate, consolation
  format          TEXT NOT NULL DEFAULT 'single_elim',   -- single_elim, double_elim
  total_rounds    INT,
  created_at      TIMESTAMPTZ DEFAULT now() NOT NULL
);

CREATE INDEX idx_brackets_event ON brackets(event_id);

CREATE TABLE matches (
  id                UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  event_id          UUID NOT NULL REFERENCES events(id) ON DELETE CASCADE,
  event_date_id     UUID REFERENCES event_dates(id),     -- which day this match is on

  -- Structure
  round             INT NOT NULL,                         -- round number (1, 2, 3...)
  match_number      INT,                                  -- for ordering within a round
  pool_id           UUID REFERENCES pools(id),            -- NULL for bracket matches
  bracket_id        UUID REFERENCES brackets(id),         -- NULL for pool matches
  bracket_position  INT,                                  -- position in bracket tree

  -- Court assignment
  court_id          UUID REFERENCES courts(id),
  scheduled_time    TIMESTAMPTZ,

  -- Teams
  team_a_id         UUID REFERENCES teams(id),
  team_b_id         UUID REFERENCES teams(id),
  team_a_seed       INT,                                  -- display seed (for bracket viz)
  team_b_seed       INT,

  -- Scoring
  team_a_score      INT,
  team_b_score      INT,
  winner_id         UUID REFERENCES teams(id),
  loser_id          UUID REFERENCES teams(id),

  -- Captain scoring flow
  home_captain_team_id  UUID REFERENCES teams(id),        -- which team's captain enters score
  away_captain_team_id  UUID REFERENCES teams(id),        -- which team's captain verifies
  score_entered_at      TIMESTAMPTZ,
  score_entered_by      TEXT,                              -- phone or user identifier

  -- Verification
  score_verified        BOOLEAN DEFAULT false,
  score_verified_at     TIMESTAMPTZ,
  score_disputed        BOOLEAN DEFAULT false,
  dispute_reason        TEXT,
  dispute_resolved_by   UUID,                              -- admin/referee user id
  dispute_resolved_at   TIMESTAMPTZ,

  -- Advancement (for brackets)
  winner_advances_to    UUID REFERENCES matches(id),       -- next match in bracket
  loser_drops_to        UUID REFERENCES matches(id),       -- plate/consolation match

  -- Status
  status            TEXT DEFAULT 'pending' NOT NULL,
    -- pending:    not yet ready (teams TBD)
    -- scheduled:  teams assigned, time set
    -- ready:      teams checked in, court assigned
    -- live:       match in progress
    -- score_entered: home captain submitted score
    -- disputed:   away captain disputed
    -- completed:  score verified, result final

  -- Timing
  started_at        TIMESTAMPTZ,
  completed_at      TIMESTAMPTZ,
  duration_seconds  INT,

  created_at        TIMESTAMPTZ DEFAULT now() NOT NULL,
  updated_at        TIMESTAMPTZ DEFAULT now() NOT NULL
);

CREATE INDEX idx_matches_event ON matches(event_id);
CREATE INDEX idx_matches_pool ON matches(pool_id);
CREATE INDEX idx_matches_bracket ON matches(bracket_id);
CREATE INDEX idx_matches_court ON matches(court_id);
CREATE INDEX idx_matches_status ON matches(event_id, status);
CREATE INDEX idx_matches_teams ON matches(team_a_id, team_b_id);
CREATE INDEX idx_matches_live ON matches(event_id, status) WHERE status IN ('live', 'score_entered', 'disputed');

-- Pool standings (materialized view or computed table, updated after each match)
CREATE TABLE pool_standings (
  id            UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  event_id      UUID NOT NULL REFERENCES events(id) ON DELETE CASCADE,
  pool_id       UUID NOT NULL REFERENCES pools(id) ON DELETE CASCADE,
  team_id       UUID NOT NULL REFERENCES teams(id) ON DELETE CASCADE,
  played        INT DEFAULT 0,
  won           INT DEFAULT 0,
  lost          INT DEFAULT 0,
  drawn         INT DEFAULT 0,
  points_for    INT DEFAULT 0,
  points_against INT DEFAULT 0,
  point_diff    INT DEFAULT 0,
  ranking_points INT DEFAULT 0,                  -- 3 for win, 1 for draw, 0 for loss
  pool_rank     INT,
  updated_at    TIMESTAMPTZ DEFAULT now() NOT NULL,

  UNIQUE(pool_id, team_id)
);

CREATE INDEX idx_pool_standings_pool ON pool_standings(pool_id);
CREATE INDEX idx_pool_standings_rank ON pool_standings(pool_id, pool_rank);


-- ═══════════════════════════════════════════════════════════════════════
-- 4. SPONSORS, SERVICES & GIFT BASKET
-- ═══════════════════════════════════════════════════════════════════════

CREATE TABLE sponsor_tiers (
  id          UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  event_id    UUID NOT NULL REFERENCES events(id) ON DELETE CASCADE,
  name        TEXT NOT NULL,                     -- 'Gold', 'Silver'
  amount      NUMERIC(10,2) DEFAULT 0,
  sort_order  INT DEFAULT 0,
  created_at  TIMESTAMPTZ DEFAULT now() NOT NULL
);

CREATE INDEX idx_sponsor_tiers_event ON sponsor_tiers(event_id);

CREATE TABLE sponsors (
  id            UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  event_id      UUID NOT NULL REFERENCES events(id) ON DELETE CASCADE,
  tier_id       UUID REFERENCES sponsor_tiers(id) ON DELETE SET NULL,
  name          TEXT NOT NULL,
  logo_url      TEXT,
  website       TEXT,
  contact_name  TEXT,
  contact_email TEXT,
  paid          BOOLEAN DEFAULT false,
  notes         TEXT,
  sort_order    INT DEFAULT 0,
  created_at    TIMESTAMPTZ DEFAULT now() NOT NULL
);

CREATE INDEX idx_sponsors_event ON sponsors(event_id);

CREATE TABLE local_services (
  id          UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  event_id    UUID NOT NULL REFERENCES events(id) ON DELETE CASCADE,
  name        TEXT NOT NULL,
  service_type TEXT,                             -- Hotel, Taxi, Restaurant, Parking, Medical, Other
  phone       TEXT,
  address     TEXT,
  website     TEXT,
  notes       TEXT,
  discount_code TEXT,
  sort_order  INT DEFAULT 0,
  created_at  TIMESTAMPTZ DEFAULT now() NOT NULL
);

CREATE INDEX idx_local_services_event ON local_services(event_id);

CREATE TABLE gift_basket_items (
  id            UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  event_id      UUID NOT NULL REFERENCES events(id) ON DELETE CASCADE,
  provider      TEXT NOT NULL,
  description   TEXT NOT NULL,
  discount_code TEXT,
  website       TEXT,
  logo_url      TEXT,
  sort_order    INT DEFAULT 0,
  active        BOOLEAN DEFAULT true,
  created_at    TIMESTAMPTZ DEFAULT now() NOT NULL
);

CREATE INDEX idx_gift_basket_event ON gift_basket_items(event_id);


-- ═══════════════════════════════════════════════════════════════════════
-- 5. VOLUNTEERS & STAFF
-- ═══════════════════════════════════════════════════════════════════════

CREATE TABLE volunteer_roles (
  id          UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  event_id    UUID NOT NULL REFERENCES events(id) ON DELETE CASCADE,
  title       TEXT NOT NULL,
  description TEXT,
  count_needed INT DEFAULT 1,
  count_filled INT DEFAULT 0,                    -- updated as applications approved
  sort_order  INT DEFAULT 0,
  created_at  TIMESTAMPTZ DEFAULT now() NOT NULL
);

CREATE INDEX idx_volunteer_roles_event ON volunteer_roles(event_id);

CREATE TABLE volunteer_applications (
  id              UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  event_id        UUID NOT NULL REFERENCES events(id) ON DELETE CASCADE,
  primary_role_id UUID NOT NULL REFERENCES volunteer_roles(id),
  other_role_ids  UUID[] DEFAULT '{}',           -- additional roles they'd accept

  first_name      TEXT NOT NULL,
  last_name       TEXT NOT NULL,
  email           TEXT NOT NULL,
  phone           TEXT,
  experience      TEXT,
  certifications  TEXT,

  -- Status
  status          TEXT DEFAULT 'pending' NOT NULL,  -- pending, approved, declined, withdrawn
  approved_by     UUID,
  approved_at     TIMESTAMPTZ,
  assigned_role_id UUID REFERENCES volunteer_roles(id),  -- final assigned role (may differ from primary)

  -- Game day
  checked_in      BOOLEAN DEFAULT false,
  checked_in_at   TIMESTAMPTZ,

  notes           TEXT,
  created_at      TIMESTAMPTZ DEFAULT now() NOT NULL,
  updated_at      TIMESTAMPTZ DEFAULT now() NOT NULL
);

CREATE INDEX idx_volunteer_apps_event ON volunteer_applications(event_id);
CREATE INDEX idx_volunteer_apps_status ON volunteer_applications(event_id, status);
CREATE INDEX idx_volunteer_apps_role ON volunteer_applications(primary_role_id);

CREATE TABLE staff_contacts (
  id          UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  event_id    UUID NOT NULL REFERENCES events(id) ON DELETE CASCADE,
  name        TEXT NOT NULL,
  role        TEXT NOT NULL,                     -- Event Director, Tournament Admin, etc.
  phone       TEXT,
  email       TEXT,
  is_emergency BOOLEAN DEFAULT false,            -- shown prominently in resource directory
  sort_order  INT DEFAULT 0,
  created_at  TIMESTAMPTZ DEFAULT now() NOT NULL
);

CREATE INDEX idx_staff_contacts_event ON staff_contacts(event_id);


-- ═══════════════════════════════════════════════════════════════════════
-- 6. ARTIFACTS & PUBLISHING
-- ═══════════════════════════════════════════════════════════════════════

CREATE TABLE artifacts (
  id              UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  event_id        UUID NOT NULL REFERENCES events(id) ON DELETE CASCADE,
  artifact_type   TEXT NOT NULL,
    -- schedule, run_sheet, site_map, resource_directory,
    -- volunteer_package, staff_package, service_package,
    -- gift_basket_page
  title           TEXT NOT NULL,
  description     TEXT,

  -- Content
  content         TEXT,                          -- markdown or HTML content
  file_url        TEXT,                          -- link to generated PDF/file
  file_format     TEXT,                          -- pdf, html, md

  -- Versioning
  version         INT DEFAULT 1,
  previous_version_id UUID REFERENCES artifacts(id),

  -- Publishing workflow
  status          TEXT DEFAULT 'draft' NOT NULL,  -- draft, review, approved, published, archived
  generated_at    TIMESTAMPTZ,
  reviewed_by     UUID,
  reviewed_at     TIMESTAMPTZ,
  approved_by     UUID,
  approved_at     TIMESTAMPTZ,
  published_at    TIMESTAMPTZ,
  published_by    UUID,

  -- Audience targeting
  audience        TEXT DEFAULT 'all',             -- all, teams, volunteers, staff, sponsors
  notify_on_publish BOOLEAN DEFAULT false,

  created_at      TIMESTAMPTZ DEFAULT now() NOT NULL,
  updated_at      TIMESTAMPTZ DEFAULT now() NOT NULL
);

CREATE INDEX idx_artifacts_event ON artifacts(event_id);
CREATE INDEX idx_artifacts_type ON artifacts(event_id, artifact_type);
CREATE INDEX idx_artifacts_status ON artifacts(event_id, status);


-- ═══════════════════════════════════════════════════════════════════════
-- 7. AUTHENTICATION & OTP
-- ═══════════════════════════════════════════════════════════════════════

-- Admin/staff users (extends Supabase auth.users)
CREATE TABLE admin_users (
  id            UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  event_id      UUID REFERENCES events(id),      -- NULL = org-level admin
  display_name  TEXT NOT NULL,
  role          TEXT NOT NULL DEFAULT 'admin',
    -- org_admin:     full org access, can create events
    -- admin:         full event access
    -- treasurer:     registrations + payments only
    -- referee:       game day match ops
    -- volunteer_coord: volunteer management
    -- control_desk:  game day court/bracket control
  phone         TEXT,
  active        BOOLEAN DEFAULT true,
  created_at    TIMESTAMPTZ DEFAULT now() NOT NULL
);

CREATE INDEX idx_admin_users_event ON admin_users(event_id);

-- Captain OTP sessions (phone-based auth for game day)
CREATE TABLE otp_sessions (
  id            UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  event_id      UUID NOT NULL REFERENCES events(id) ON DELETE CASCADE,
  phone         TEXT NOT NULL,
  otp_code      TEXT NOT NULL,                   -- 6-digit code
  player_id     UUID REFERENCES players(id),     -- resolved after verification
  team_id       UUID REFERENCES teams(id),       -- resolved after verification

  -- Status
  verified      BOOLEAN DEFAULT false,
  expires_at    TIMESTAMPTZ NOT NULL,            -- code validity window (5 min)
  verified_at   TIMESTAMPTZ,
  ip_address    TEXT,

  created_at    TIMESTAMPTZ DEFAULT now() NOT NULL
);

CREATE INDEX idx_otp_phone ON otp_sessions(phone, event_id);
CREATE INDEX idx_otp_active ON otp_sessions(event_id, verified) WHERE verified = false;


-- ═══════════════════════════════════════════════════════════════════════
-- 8. GAME DAY OPERATIONS
-- ═══════════════════════════════════════════════════════════════════════

-- Court queue: matches waiting for a free court
CREATE TABLE court_queue (
  id          UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  event_id    UUID NOT NULL REFERENCES events(id) ON DELETE CASCADE,
  match_id    UUID NOT NULL REFERENCES matches(id) ON DELETE CASCADE,
  priority    INT DEFAULT 0,                     -- higher = more urgent
  queued_at   TIMESTAMPTZ DEFAULT now() NOT NULL,
  assigned_at TIMESTAMPTZ,                       -- when court was allocated
  court_id    UUID REFERENCES courts(id),

  UNIQUE(match_id)
);

CREATE INDEX idx_court_queue_event ON court_queue(event_id);
CREATE INDEX idx_court_queue_waiting ON court_queue(event_id, assigned_at) WHERE assigned_at IS NULL;

-- Announcements (PA / TV ticker)
CREATE TABLE announcements (
  id          UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  event_id    UUID NOT NULL REFERENCES events(id) ON DELETE CASCADE,
  message     TEXT NOT NULL,
  priority    TEXT DEFAULT 'normal',              -- low, normal, high, urgent
  show_on_tv  BOOLEAN DEFAULT true,
  active      BOOLEAN DEFAULT true,
  expires_at  TIMESTAMPTZ,
  created_by  UUID,
  created_at  TIMESTAMPTZ DEFAULT now() NOT NULL
);

CREATE INDEX idx_announcements_active ON announcements(event_id, active) WHERE active = true;

-- Activity log (audit trail for admin actions)
CREATE TABLE activity_log (
  id          UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  event_id    UUID NOT NULL REFERENCES events(id) ON DELETE CASCADE,
  user_id     UUID,                              -- admin user, NULL for system actions
  action      TEXT NOT NULL,                     -- 'payment_confirmed', 'score_override', etc.
  entity_type TEXT,                              -- 'registration', 'match', 'team', etc.
  entity_id   TEXT,                              -- UUID or BIGINT as text
  details     JSONB DEFAULT '{}'::jsonb,         -- action-specific data
  ip_address  TEXT,
  created_at  TIMESTAMPTZ DEFAULT now() NOT NULL
);

CREATE INDEX idx_activity_event ON activity_log(event_id);
CREATE INDEX idx_activity_entity ON activity_log(entity_type, entity_id);
CREATE INDEX idx_activity_time ON activity_log(event_id, created_at DESC);


-- ═══════════════════════════════════════════════════════════════════════
-- 9. FUNCTIONS & TRIGGERS
-- ═══════════════════════════════════════════════════════════════════════

-- Auto-update updated_at on modified rows
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_organizations_updated BEFORE UPDATE ON organizations
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER trg_events_updated BEFORE UPDATE ON events
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER trg_registrations_updated BEFORE UPDATE ON registrations
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER trg_teams_updated BEFORE UPDATE ON teams
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER trg_matches_updated BEFORE UPDATE ON matches
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER trg_volunteer_apps_updated BEFORE UPDATE ON volunteer_applications
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER trg_artifacts_updated BEFORE UPDATE ON artifacts
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- Generate reconciliation code for new registrations
CREATE OR REPLACE FUNCTION generate_recon_code()
RETURNS TRIGGER AS $$
DECLARE
  prefix TEXT;
  counter INT;
BEGIN
  SELECT recon_prefix, recon_counter INTO prefix, counter
    FROM events WHERE id = NEW.event_id;
  
  -- Increment counter
  UPDATE events SET recon_counter = recon_counter + 1 WHERE id = NEW.event_id;
  
  NEW.reconciliation_code = prefix || '-' || (counter + 1)::TEXT;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_registration_recon BEFORE INSERT ON registrations
  FOR EACH ROW WHEN (NEW.reconciliation_code IS NULL OR NEW.reconciliation_code = '')
  EXECUTE FUNCTION generate_recon_code();

-- Auto-calculate total_amount
CREATE OR REPLACE FUNCTION calc_registration_total()
RETURNS TRIGGER AS $$
BEGIN
  NEW.total_amount = NEW.fee_amount + COALESCE(NEW.donation_amount, 0);
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_registration_total BEFORE INSERT OR UPDATE ON registrations
  FOR EACH ROW EXECUTE FUNCTION calc_registration_total();

-- Update pool standings after match completion
CREATE OR REPLACE FUNCTION update_pool_standings()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.status = 'completed' AND NEW.pool_id IS NOT NULL THEN
    -- Upsert team A standings
    INSERT INTO pool_standings (event_id, pool_id, team_id, played, won, lost, drawn, points_for, points_against, point_diff, ranking_points)
    VALUES (NEW.event_id, NEW.pool_id, NEW.team_a_id, 1,
      CASE WHEN NEW.winner_id = NEW.team_a_id THEN 1 ELSE 0 END,
      CASE WHEN NEW.loser_id = NEW.team_a_id THEN 1 ELSE 0 END,
      CASE WHEN NEW.winner_id IS NULL THEN 1 ELSE 0 END,
      COALESCE(NEW.team_a_score, 0),
      COALESCE(NEW.team_b_score, 0),
      COALESCE(NEW.team_a_score, 0) - COALESCE(NEW.team_b_score, 0),
      CASE WHEN NEW.winner_id = NEW.team_a_id THEN 3 WHEN NEW.winner_id IS NULL THEN 1 ELSE 0 END
    )
    ON CONFLICT (pool_id, team_id) DO UPDATE SET
      played = pool_standings.played + 1,
      won = pool_standings.won + CASE WHEN NEW.winner_id = NEW.team_a_id THEN 1 ELSE 0 END,
      lost = pool_standings.lost + CASE WHEN NEW.loser_id = NEW.team_a_id THEN 1 ELSE 0 END,
      drawn = pool_standings.drawn + CASE WHEN NEW.winner_id IS NULL THEN 1 ELSE 0 END,
      points_for = pool_standings.points_for + COALESCE(NEW.team_a_score, 0),
      points_against = pool_standings.points_against + COALESCE(NEW.team_b_score, 0),
      point_diff = pool_standings.point_diff + COALESCE(NEW.team_a_score, 0) - COALESCE(NEW.team_b_score, 0),
      ranking_points = pool_standings.ranking_points + CASE WHEN NEW.winner_id = NEW.team_a_id THEN 3 WHEN NEW.winner_id IS NULL THEN 1 ELSE 0 END,
      updated_at = now();

    -- Upsert team B standings
    INSERT INTO pool_standings (event_id, pool_id, team_id, played, won, lost, drawn, points_for, points_against, point_diff, ranking_points)
    VALUES (NEW.event_id, NEW.pool_id, NEW.team_b_id, 1,
      CASE WHEN NEW.winner_id = NEW.team_b_id THEN 1 ELSE 0 END,
      CASE WHEN NEW.loser_id = NEW.team_b_id THEN 1 ELSE 0 END,
      CASE WHEN NEW.winner_id IS NULL THEN 1 ELSE 0 END,
      COALESCE(NEW.team_b_score, 0),
      COALESCE(NEW.team_a_score, 0),
      COALESCE(NEW.team_b_score, 0) - COALESCE(NEW.team_a_score, 0),
      CASE WHEN NEW.winner_id = NEW.team_b_id THEN 3 WHEN NEW.winner_id IS NULL THEN 1 ELSE 0 END
    )
    ON CONFLICT (pool_id, team_id) DO UPDATE SET
      played = pool_standings.played + 1,
      won = pool_standings.won + CASE WHEN NEW.winner_id = NEW.team_b_id THEN 1 ELSE 0 END,
      lost = pool_standings.lost + CASE WHEN NEW.loser_id = NEW.team_b_id THEN 1 ELSE 0 END,
      drawn = pool_standings.drawn + CASE WHEN NEW.winner_id IS NULL THEN 1 ELSE 0 END,
      points_for = pool_standings.points_for + COALESCE(NEW.team_b_score, 0),
      points_against = pool_standings.points_against + COALESCE(NEW.team_a_score, 0),
      point_diff = pool_standings.point_diff + COALESCE(NEW.team_b_score, 0) - COALESCE(NEW.team_a_score, 0),
      ranking_points = pool_standings.ranking_points + CASE WHEN NEW.winner_id = NEW.team_b_id THEN 3 WHEN NEW.winner_id IS NULL THEN 1 ELSE 0 END,
      updated_at = now();

    -- Recompute pool ranks
    WITH ranked AS (
      SELECT id, ROW_NUMBER() OVER (
        PARTITION BY pool_id
        ORDER BY ranking_points DESC, point_diff DESC, points_for DESC
      ) as rank
      FROM pool_standings
      WHERE pool_id = NEW.pool_id
    )
    UPDATE pool_standings ps SET pool_rank = r.rank
    FROM ranked r WHERE ps.id = r.id;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_match_standings AFTER UPDATE ON matches
  FOR EACH ROW WHEN (NEW.status = 'completed' AND (OLD.status IS DISTINCT FROM 'completed'))
  EXECUTE FUNCTION update_pool_standings();

-- Update fundraising total when payments confirmed
CREATE OR REPLACE FUNCTION update_fundraising()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.payment_status = 'paid' AND OLD.payment_status != 'paid' THEN
    UPDATE events
    SET fundraising_current = fundraising_current + COALESCE(NEW.donation_amount, 0) + NEW.fee_amount
    WHERE id = NEW.event_id AND is_charity = true;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_fundraising_update AFTER UPDATE ON registrations
  FOR EACH ROW EXECUTE FUNCTION update_fundraising();

-- Update volunteer role filled count when application approved
CREATE OR REPLACE FUNCTION update_volunteer_count()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.status = 'approved' AND (OLD.status IS NULL OR OLD.status != 'approved') THEN
    UPDATE volunteer_roles SET count_filled = count_filled + 1
    WHERE id = COALESCE(NEW.assigned_role_id, NEW.primary_role_id);
  END IF;
  IF OLD.status = 'approved' AND NEW.status != 'approved' THEN
    UPDATE volunteer_roles SET count_filled = GREATEST(0, count_filled - 1)
    WHERE id = COALESCE(OLD.assigned_role_id, OLD.primary_role_id);
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_volunteer_count AFTER INSERT OR UPDATE ON volunteer_applications
  FOR EACH ROW EXECUTE FUNCTION update_volunteer_count();

-- Home captain randomizer function (called from app code)
CREATE OR REPLACE FUNCTION assign_home_captain(match_uuid UUID)
RETURNS void AS $$
DECLARE
  m RECORD;
BEGIN
  SELECT * INTO m FROM matches WHERE id = match_uuid;
  
  IF random() < 0.5 THEN
    UPDATE matches SET
      home_captain_team_id = m.team_a_id,
      away_captain_team_id = m.team_b_id
    WHERE id = match_uuid;
  ELSE
    UPDATE matches SET
      home_captain_team_id = m.team_b_id,
      away_captain_team_id = m.team_a_id
    WHERE id = match_uuid;
  END IF;
END;
$$ LANGUAGE plpgsql;


-- ═══════════════════════════════════════════════════════════════════════
-- 10. ROW LEVEL SECURITY (RLS)
-- ═══════════════════════════════════════════════════════════════════════

-- Enable RLS on all tables
ALTER TABLE organizations ENABLE ROW LEVEL SECURITY;
ALTER TABLE events ENABLE ROW LEVEL SECURITY;
ALTER TABLE event_dates ENABLE ROW LEVEL SECURITY;
ALTER TABLE registrations ENABLE ROW LEVEL SECURITY;
ALTER TABLE teams ENABLE ROW LEVEL SECURITY;
ALTER TABLE players ENABLE ROW LEVEL SECURITY;
ALTER TABLE pools ENABLE ROW LEVEL SECURITY;
ALTER TABLE courts ENABLE ROW LEVEL SECURITY;
ALTER TABLE brackets ENABLE ROW LEVEL SECURITY;
ALTER TABLE matches ENABLE ROW LEVEL SECURITY;
ALTER TABLE pool_standings ENABLE ROW LEVEL SECURITY;
ALTER TABLE sponsor_tiers ENABLE ROW LEVEL SECURITY;
ALTER TABLE sponsors ENABLE ROW LEVEL SECURITY;
ALTER TABLE local_services ENABLE ROW LEVEL SECURITY;
ALTER TABLE gift_basket_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE volunteer_roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE volunteer_applications ENABLE ROW LEVEL SECURITY;
ALTER TABLE staff_contacts ENABLE ROW LEVEL SECURITY;
ALTER TABLE artifacts ENABLE ROW LEVEL SECURITY;
ALTER TABLE admin_users ENABLE ROW LEVEL SECURITY;
ALTER TABLE otp_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE court_queue ENABLE ROW LEVEL SECURITY;
ALTER TABLE announcements ENABLE ROW LEVEL SECURITY;
ALTER TABLE activity_log ENABLE ROW LEVEL SECURITY;

-- ── PUBLIC READ: Game day and landing page data ──

CREATE POLICY "Public read events"          ON events          FOR SELECT USING (status != 'draft');
CREATE POLICY "Public read event_dates"     ON event_dates     FOR SELECT USING (true);
CREATE POLICY "Public read teams"           ON teams           FOR SELECT USING (true);
CREATE POLICY "Public read pools"           ON pools           FOR SELECT USING (true);
CREATE POLICY "Public read matches"         ON matches         FOR SELECT USING (true);
CREATE POLICY "Public read pool_standings"  ON pool_standings  FOR SELECT USING (true);
CREATE POLICY "Public read brackets"        ON brackets        FOR SELECT USING (true);
CREATE POLICY "Public read courts"          ON courts          FOR SELECT USING (true);
CREATE POLICY "Public read sponsor_tiers"   ON sponsor_tiers   FOR SELECT USING (true);
CREATE POLICY "Public read sponsors"        ON sponsors        FOR SELECT USING (true);
CREATE POLICY "Public read local_services"  ON local_services  FOR SELECT USING (true);
CREATE POLICY "Public read gift_basket"     ON gift_basket_items FOR SELECT USING (active = true);
CREATE POLICY "Public read volunteer_roles" ON volunteer_roles FOR SELECT USING (true);
CREATE POLICY "Public read staff_contacts"  ON staff_contacts  FOR SELECT USING (true);
CREATE POLICY "Public read announcements"   ON announcements   FOR SELECT USING (active = true);
CREATE POLICY "Public read artifacts"       ON artifacts       FOR SELECT USING (status = 'published');

-- ── PUBLIC INSERT: Registration and volunteer applications ──

CREATE POLICY "Public insert registrations" ON registrations FOR INSERT WITH CHECK (true);
CREATE POLICY "Public insert volunteer_apps" ON volunteer_applications FOR INSERT WITH CHECK (true);

-- ── AUTHENTICATED: Admin full access ──
-- (In production, refine these per admin role)

CREATE POLICY "Admin full organizations" ON organizations FOR ALL USING (
  auth.uid() IN (SELECT id FROM admin_users WHERE active = true)
);
CREATE POLICY "Admin full events" ON events FOR ALL USING (
  auth.uid() IN (SELECT id FROM admin_users WHERE active = true)
);
CREATE POLICY "Admin full registrations" ON registrations FOR ALL USING (
  auth.uid() IN (SELECT id FROM admin_users WHERE active = true)
);
CREATE POLICY "Admin full teams" ON teams FOR ALL USING (
  auth.uid() IN (SELECT id FROM admin_users WHERE active = true)
);
CREATE POLICY "Admin full players" ON players FOR ALL USING (
  auth.uid() IN (SELECT id FROM admin_users WHERE active = true)
);
CREATE POLICY "Admin full matches" ON matches FOR ALL USING (
  auth.uid() IN (SELECT id FROM admin_users WHERE active = true)
);
CREATE POLICY "Admin full courts" ON courts FOR ALL USING (
  auth.uid() IN (SELECT id FROM admin_users WHERE active = true)
);
CREATE POLICY "Admin full pools" ON pools FOR ALL USING (
  auth.uid() IN (SELECT id FROM admin_users WHERE active = true)
);
CREATE POLICY "Admin full brackets" ON brackets FOR ALL USING (
  auth.uid() IN (SELECT id FROM admin_users WHERE active = true)
);
CREATE POLICY "Admin full pool_standings" ON pool_standings FOR ALL USING (
  auth.uid() IN (SELECT id FROM admin_users WHERE active = true)
);
CREATE POLICY "Admin full volunteer_apps" ON volunteer_applications FOR ALL USING (
  auth.uid() IN (SELECT id FROM admin_users WHERE active = true)
);
CREATE POLICY "Admin full artifacts" ON artifacts FOR ALL USING (
  auth.uid() IN (SELECT id FROM admin_users WHERE active = true)
);
CREATE POLICY "Admin full activity_log" ON activity_log FOR ALL USING (
  auth.uid() IN (SELECT id FROM admin_users WHERE active = true)
);
CREATE POLICY "Admin full sponsors" ON sponsors FOR ALL USING (
  auth.uid() IN (SELECT id FROM admin_users WHERE active = true)
);
CREATE POLICY "Admin full sponsor_tiers" ON sponsor_tiers FOR ALL USING (
  auth.uid() IN (SELECT id FROM admin_users WHERE active = true)
);
CREATE POLICY "Admin full court_queue" ON court_queue FOR ALL USING (
  auth.uid() IN (SELECT id FROM admin_users WHERE active = true)
);
CREATE POLICY "Admin full announcements" ON announcements FOR ALL USING (
  auth.uid() IN (SELECT id FROM admin_users WHERE active = true)
);
CREATE POLICY "Admin full otp_sessions" ON otp_sessions FOR ALL USING (
  auth.uid() IN (SELECT id FROM admin_users WHERE active = true)
);
CREATE POLICY "Admin read admin_users" ON admin_users FOR SELECT USING (
  auth.uid() IN (SELECT id FROM admin_users WHERE role = 'org_admin' AND active = true)
);

-- Players: public read for team profiles, restrict PII
CREATE POLICY "Public read players basic" ON players FOR SELECT USING (true);
  -- Note: In production, create a VIEW that excludes email/phone for public access


-- ═══════════════════════════════════════════════════════════════════════
-- 11. REALTIME SUBSCRIPTIONS
-- ═══════════════════════════════════════════════════════════════════════
-- Enable Supabase Realtime on tables that need live updates

ALTER PUBLICATION supabase_realtime ADD TABLE matches;
ALTER PUBLICATION supabase_realtime ADD TABLE pool_standings;
ALTER PUBLICATION supabase_realtime ADD TABLE courts;
ALTER PUBLICATION supabase_realtime ADD TABLE teams;
ALTER PUBLICATION supabase_realtime ADD TABLE announcements;
ALTER PUBLICATION supabase_realtime ADD TABLE court_queue;


-- ═══════════════════════════════════════════════════════════════════════
-- SCHEMA COMPLETE
-- ═══════════════════════════════════════════════════════════════════════
-- Tables:  22 core + activity_log
-- Triggers: 7 (updated_at x5, recon code, total calc, standings, fundraising, volunteer count)
-- Functions: 3 (standings update, home captain randomizer, fundraising)
-- RLS:     Full public read for game day, insert for registration, admin CRUD
-- Realtime: matches, standings, courts, teams, announcements, court_queue
