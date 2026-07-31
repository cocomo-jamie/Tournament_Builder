-- ═══════════════════════════════════════════════════════════════════════
-- Seed script: 30 teams (2 players each) + 10 volunteers + 6 referees
-- ═══════════════════════════════════════════════════════════════════════
-- Run this directly in the Supabase SQL Editor. Same manual-application
-- pattern as every migration in this project — this is NOT a migration,
-- it's one-time test data, meant to be run once against a test/dev event.
--
-- ⚠️  BEFORE RUNNING: paste your event's UUID into the line marked below.
-- ⚠️  This bypasses the registration/invite UI entirely, per your request
--     — it writes straight into registrations/teams/players/volunteer_
--     applications/admin_users/auth.users.
--
-- ASSUMPTIONS MADE (flagging rather than guessing silently):
--   - Team donations (registrations.donation_amount) range $0–$200,
--     spread across the 30 teams. "Fan donations" are a separate,
--     currently-unbuilt feature (no DB table exists yet — see the
--     accompanying feedback doc) so this script only seeds the team side.
--   - 25 of 30 teams are registration.status='confirmed' + paid +
--     approved (both players); the other 5 are left 'submitted' +
--     payment pending + player status 'pending' — so you have real data
--     to test the Registrations panel's approve/reject flow, not just a
--     fully-confirmed set.
--   - Volunteer emails use @volunteer.test (not specified in your
--     request) since only player and referee email formats were given.
--   - 6 of 10 volunteer applications are 'approved', 4 'pending'.
--   - Referee login password is 'Referee123!' for all 6 — change this
--     after testing if these accounts will stick around.
--   - Shirt sizes and dietary needs are cycled across a realistic set of
--     values per player so every combination shows up somewhere.
--   - This assumes volunteer_roles already exist for your event (the
--     Wizard creates some by default); if none exist, the script creates
--     3 generic ones first so the volunteer inserts have somewhere to go.
-- ═══════════════════════════════════════════════════════════════════════

BEGIN;

-- ── Paste your event UUID here ──
CREATE TEMP TABLE _seed_config AS
SELECT 'PASTE-YOUR-EVENT-UUID-HERE'::uuid AS event_id;

-- Sanity check: fail loudly if the event doesn't exist, rather than
-- silently inserting orphaned rows.
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM events WHERE id = (SELECT event_id FROM _seed_config)) THEN
    RAISE EXCEPTION 'No event found with that UUID — check _seed_config before proceeding.';
  END IF;
END $$;

-- ─────────────────────────────────────────────────────────────────────
-- 1. Team + player source data (30 teams, 2 players each)
-- ─────────────────────────────────────────────────────────────────────
CREATE TEMP TABLE _team_seed AS
SELECT
  t.rn,
  t.team_name,
  t.donation,
  t.c_first, t.c_last, t.p2_first, t.p2_last,
  (ARRAY['XS','S','M','L','XL','XXL'])[((t.rn - 1) % 6) + 1] AS c_shirt,
  (ARRAY['XS','S','M','L','XL','XXL'])[((t.rn - 1 + 3) % 6) + 1] AS p2_shirt,
  (ARRAY['None','Vegetarian','Vegan','Gluten-Free','Nut Allergy','Dairy-Free','Shellfish Allergy'])[((t.rn - 1) % 7) + 1] AS c_diet,
  (ARRAY['None','Vegetarian','Vegan','Gluten-Free','Nut Allergy','Dairy-Free','Shellfish Allergy'])[((t.rn - 1 + 4) % 7) + 1] AS p2_diet
FROM (
  SELECT row_number() OVER () AS rn, * FROM (VALUES
    ('Pallino Pushers',      0,   'John',   'Smith',    'Emma',     'Brown'),
    ('Court Jesters',        200, 'Michael','Johnson',  'Sarah',    'Williams'),
    ('Lawn & Order',         45,  'David',  'Garcia',   'Jessica',  'Miller'),
    ('Gutter Queens',        130, 'Chris',  'Davis',    'Amanda',   'Rodriguez'),
    ('The Underdogs',        15,  'Daniel', 'Martinez', 'Laura',    'Hernandez'),
    ('Roll Models',          175, 'Kevin',  'Lopez',    'Rachel',   'Wilson'),
    ('Ball Busters',         60,  'Brian',  'Anderson', 'Nicole',   'Taylor'),
    ('Pin Droppers',         90,  'Mark',   'Thomas',   'Ashley',   'Moore'),
    ('Alley Cats',           5,   'Steven', 'Jackson',  'Megan',    'Martin'),
    ('Spare Parts',          155, 'Paul',   'Lee',      'Stephanie','Perez'),
    ('The Bocce Bandits',    80,  'Eric',   'Thompson', 'Lauren',   'White'),
    ('Strike Force',         20,  'Jason',  'Harris',   'Kimberly', 'Sanchez'),
    ('Gutter Gang',          190, 'Ryan',   'Clark',    'Amy',      'Ramirez'),
    ('The Wobblers',         35,  'Brandon','Lewis',    'Heather',  'Robinson'),
    ('Pit Vipers',           110, 'Justin', 'Walker',   'Michelle', 'Young'),
    ('Bocce Brigade',        65,  'Andrew', 'Allen',    'Melissa',  'King'),
    ('Curve Ballers',        145, 'Tyler',  'Wright',   'Rebecca',  'Scott'),
    ('Hook Shots',           10,  'Nathan', 'Torres',   'Christina','Nguyen'),
    ('The Aimless',          200, 'Aaron',  'Hill',     'Samantha', 'Flores'),
    ('Bocce Bosses',         75,  'Adam',   'Green',    'Danielle', 'Adams'),
    ('Rolling Thunder',      50,  'Jordan', 'Nelson',   'Victoria', 'Baker'),
    ('The Precisionists',    160, 'Cody',   'Hall',     'Katherine','Rivera'),
    ('Wild Pitches',         25,  'Ian',    'Campbell', 'Olivia',   'Mitchell'),
    ('Bocce Buddies',        120, 'Marcus', 'Carter',   'Natalie',  'Roberts'),
    ('The Landing Zone',     195, 'Derek',  'Gomez',    'Julia',    'Phillips'),
    ('Kiss The Pallino',     40,  'Trevor', 'Evans',    'Sophia',   'Turner'),
    ('Bocce Royale',         100, 'Wesley', 'Diaz',     'Grace',    'Parker'),
    ('Green Machine',        170, 'Miguel', 'Cruz',     'Hannah',   'Edwards'),
    ('The Ringers',          55,  'Owen',   'Collins',  'Alexis',   'Reyes'),
    ('Last Ball Standing',   85,  'Blake',  'Morgan',   'Chloe',    'Bennett')
  ) AS v(team_name, donation, c_first, c_last, p2_first, p2_last)
) t;

-- ─────────────────────────────────────────────────────────────────────
-- 2. Registrations (rows 1–25 confirmed+paid, 26–30 submitted+pending)
-- ─────────────────────────────────────────────────────────────────────
CREATE TEMP TABLE _reg_map (
  rn INT, team_name TEXT, registration_id BIGINT, team_id UUID,
  row_status TEXT  -- 'approved' or 'pending' — drives team + player status below
);

WITH ins AS (
  INSERT INTO registrations (
    event_id, team_name, captain_name, captain_email, captain_phone,
    captain_shirt, captain_dietary, payment_method, payment_status,
    fee_amount, donation_amount, status, image_consent, waiver_accepted,
    payment_confirmed_at
  )
  SELECT
    (SELECT event_id FROM _seed_config),
    s.team_name,
    s.c_first || ' ' || s.c_last,
    lower(s.c_first) || lower(left(s.c_last, 1)) || '@' ||
      regexp_replace(lower(s.team_name), '[^a-z0-9]', '', 'g') || '.com',
    '250-555-' || lpad(s.rn::text, 4, '0'),
    s.c_shirt,
    s.c_diet,
    'e_transfer',
    CASE WHEN s.rn <= 25 THEN 'paid' ELSE 'pending' END,
    COALESCE((SELECT entry_fee FROM events WHERE id = (SELECT event_id FROM _seed_config)), 100),
    s.donation,
    CASE WHEN s.rn <= 25 THEN 'confirmed' ELSE 'submitted' END,
    true, true,
    CASE WHEN s.rn <= 25 THEN now() ELSE NULL END
  FROM _team_seed s
  RETURNING id, team_name
)
INSERT INTO _reg_map (rn, team_name, registration_id, row_status)
SELECT s.rn, ins.team_name, ins.id, CASE WHEN s.rn <= 25 THEN 'approved' ELSE 'pending' END
FROM ins JOIN _team_seed s ON s.team_name = ins.team_name;

-- ─────────────────────────────────────────────────────────────────────
-- 3. Teams (linked to registrations, status set directly)
-- ─────────────────────────────────────────────────────────────────────
WITH ins AS (
  INSERT INTO teams (event_id, registration_id, name, status)
  SELECT (SELECT event_id FROM _seed_config), m.registration_id, m.team_name, m.row_status
  FROM _reg_map m
  RETURNING id, registration_id
)
UPDATE _reg_map r SET team_id = ins.id
FROM ins WHERE ins.registration_id = r.registration_id;

-- ─────────────────────────────────────────────────────────────────────
-- 4. Players (captain + player 2 per team)
--    Email format: firstnamelastinitial@teamname.com, per spec.
-- ─────────────────────────────────────────────────────────────────────
INSERT INTO players (
  team_id, event_id, is_captain, is_coach, full_name, email,
  shirt_size, dietary_needs, sort_order, status, registration_id, self_registered
)
SELECT
  m.team_id, (SELECT event_id FROM _seed_config), true, false,
  s.c_first || ' ' || s.c_last,
  lower(s.c_first) || lower(left(s.c_last, 1)) || '@' ||
    regexp_replace(lower(s.team_name), '[^a-z0-9]', '', 'g') || '.com',
  s.c_shirt, s.c_diet, 0, m.row_status, m.registration_id, false
FROM _team_seed s JOIN _reg_map m ON m.team_name = s.team_name
UNION ALL
SELECT
  m.team_id, (SELECT event_id FROM _seed_config), false, false,
  s.p2_first || ' ' || s.p2_last,
  lower(s.p2_first) || lower(left(s.p2_last, 1)) || '@' ||
    regexp_replace(lower(s.team_name), '[^a-z0-9]', '', 'g') || '.com',
  s.p2_shirt, s.p2_diet, 1, m.row_status, m.registration_id, false
FROM _team_seed s JOIN _reg_map m ON m.team_name = s.team_name;

-- ─────────────────────────────────────────────────────────────────────
-- 5. Volunteer roles safety net — only inserts if the event has none yet
-- ─────────────────────────────────────────────────────────────────────
INSERT INTO volunteer_roles (event_id, title, description, count_needed)
SELECT (SELECT event_id FROM _seed_config), title, description, needed
FROM (VALUES
  ('Registration Desk', 'Check in teams, verify payment', 2),
  ('Court Marshal',     'Monitor courts, assist referees', 4),
  ('Setup / Teardown',  'Event setup and breakdown', 4)
) AS v(title, description, needed)
WHERE NOT EXISTS (
  SELECT 1 FROM volunteer_roles WHERE event_id = (SELECT event_id FROM _seed_config)
);

-- ─────────────────────────────────────────────────────────────────────
-- 6. Volunteers (10 applications: 6 approved, 4 pending)
-- ─────────────────────────────────────────────────────────────────────
WITH roles AS (
  SELECT id, row_number() OVER (ORDER BY created_at) AS rn, count(*) OVER () AS cnt
  FROM volunteer_roles WHERE event_id = (SELECT event_id FROM _seed_config)
),
vol_seed AS (
  SELECT * FROM (VALUES
    (1, 'Grace',   'Chen',      'grace.chen'),
    (2, 'Liam',    'Foster',    'liam.foster'),
    (3, 'Ava',     'Bennett',   'ava.bennett'),
    (4, 'Noah',    'Ortiz',     'noah.ortiz'),
    (5, 'Mia',     'Reyes',     'mia.reyes'),
    (6, 'Ethan',   'Coleman',   'ethan.coleman'),
    (7, 'Zoe',     'Price',     'zoe.price'),
    (8, 'Lucas',   'Fisher',    'lucas.fisher'),
    (9, 'Ella',    'Hayes',     'ella.hayes'),
    (10,'Jack',    'Bryant',    'jack.bryant')
  ) AS v(rn, first_name, last_name, handle)
)
INSERT INTO volunteer_applications (
  event_id, primary_role_id, first_name, last_name, email, phone,
  status, approved_at, checked_in
)
SELECT
  (SELECT event_id FROM _seed_config),
  r.id,
  vs.first_name, vs.last_name,
  vs.handle || '@volunteer.test',
  '250-555-2' || lpad(vs.rn::text, 3, '0'),
  CASE WHEN vs.rn <= 6 THEN 'approved' ELSE 'pending' END,
  CASE WHEN vs.rn <= 6 THEN now() ELSE NULL END,
  false
FROM vol_seed vs
JOIN roles r ON r.rn = ((vs.rn - 1) % r.cnt) + 1;

-- ─────────────────────────────────────────────────────────────────────
-- 7. Referees (6 real logins: ref1@training.com … ref6@training.com)
--    Password for all 6: Referee123!
-- ─────────────────────────────────────────────────────────────────────
WITH new_referees AS (
  INSERT INTO auth.users (
    instance_id, id, aud, role, email, encrypted_password,
    email_confirmed_at, raw_app_meta_data, raw_user_meta_data,
    created_at, updated_at, confirmation_token, email_change,
    email_change_token_new, recovery_token
  )
  SELECT
    '00000000-0000-0000-0000-000000000000',
    gen_random_uuid(), 'authenticated', 'authenticated',
    email,
    extensions.crypt('Referee123!', extensions.gen_salt('bf')),
    now(),
    '{"provider":"email","providers":["email"]}'::jsonb, '{}'::jsonb,
    now(), now(), '', '', '', ''
  FROM (VALUES
    ('ref1@training.com'), ('ref2@training.com'), ('ref3@training.com'),
    ('ref4@training.com'), ('ref5@training.com'), ('ref6@training.com')
  ) AS t(email)
  RETURNING id, email
)
INSERT INTO admin_users (id, org_id, event_id, role, email, display_name, active)
SELECT
  r.id,
  (SELECT org_id FROM events WHERE id = (SELECT event_id FROM _seed_config)),
  (SELECT event_id FROM _seed_config),
  'referee',
  r.email,
  'Referee ' || regexp_replace(split_part(r.email, '@', 1), '[^0-9]', '', 'g'),
  true
FROM new_referees r;

-- ─────────────────────────────────────────────────────────────────────
-- 8. Verification — check these counts before committing
-- ─────────────────────────────────────────────────────────────────────
SELECT 'teams' AS what, count(*) FROM teams WHERE event_id = (SELECT event_id FROM _seed_config)
UNION ALL
SELECT 'players', count(*) FROM players WHERE event_id = (SELECT event_id FROM _seed_config)
UNION ALL
SELECT 'registrations', count(*) FROM registrations WHERE event_id = (SELECT event_id FROM _seed_config)
UNION ALL
SELECT 'volunteer_applications', count(*) FROM volunteer_applications WHERE event_id = (SELECT event_id FROM _seed_config)
UNION ALL
SELECT 'referees (admin_users)', count(*) FROM admin_users WHERE event_id = (SELECT event_id FROM _seed_config) AND role = 'referee';

-- If the counts above look right (30/60/30/10/6), run COMMIT.
-- If anything looks wrong, run ROLLBACK instead and nothing will be saved.
COMMIT;
