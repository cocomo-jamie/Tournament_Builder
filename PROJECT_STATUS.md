# Tournament Builder Platform — Project Status & Handoff

## Quick Context
We're building a **multi-sport charity tournament management platform**. Originally scoped for an Ebb Tide Rugby Club (ETRC) bocce tournament supporting Elder Fraud Prevention, it's been generalized to support any organization running any sport's charity tournament.

**GitHub Repo:** `cocomo-jamie/Tournament_Builder`
**Database:** Supabase (project created, schema deployed, migration applied)
**Stack:** React (Vite) + Tailwind CSS + Supabase (PostgreSQL + Realtime + RLS) + Lucide Icons + React Router

---

## Two Delivery Models (Both Planned)

### Model 1: SaaS (You Host)
Multi-tenant platform. One codebase, one Supabase project, many tournaments. Organizations sign up, run the wizard, get a URL like `tournamentbuilder.com/etrc-bocce`. We manage deployment and bill per event or subscription.

### Model 2: Self-Hosted Package
Wizard generates a complete deployment package. Organization sets up their own Vercel + Supabase accounts, deploys independently. We provide one-click deploy templates.

Both models use the identical tournament engine. The difference is infrastructure ownership.

---

## Repository Structure (Current)

```
Tournament_Builder/
├── .gitignore
├── .env.example                    # Supabase + Stripe + Twilio env template
├── WIRING_GUIDE.md                 # Integration instructions for all components
├── package.json                    # Vite + React + Supabase + Tailwind deps
├── vite.config.js                  # Vite with @/ path alias
├── tailwind.config.js              # Brand colors + font families
├── postcss.config.js
├── index.html                      # Entry HTML with Google Fonts
├── supabase/
│   ├── schema.sql                  # Full DDL — 22 tables, triggers, RLS, realtime
│   └── migrations/
│       └── 001_playing_areas.sql   # Renamed courts → playing_areas
├── src/
│   ├── main.jsx                    # React entry point
│   ├── index.css                   # Tailwind directives + global styles
│   ├── App.jsx                     # React Router with all routes
│   ├── supabaseClient.js           # Supabase SDK init from env vars
│   ├── services/
│   │   └── api.js                  # All CRUD operations by domain
│   ├── hooks/
│   │   └── useRealtime.js          # 7 real-time subscription hooks
│   ├── views/
│   │   ├── LandingPage.jsx         # Public site: registration + volunteers + cause
│   │   ├── AdminDashboard.jsx      # 3-context admin: Build / Publish / Game Day
│   │   ├── TVDisplay.jsx           # Auto-rotating projector with sponsor slots
│   │   ├── LivePage.jsx            # Mobile game day hub with fan engagement
│   │   └── PlayerPortal.jsx        # Captain OTP + score entry/verification
│   └── tools/
│       └── TournamentWizard.jsx    # 11-step event configuration wizard
```

---

## Route Map

| Route | View | Auth | Purpose |
|-------|------|------|---------|
| `/` | LandingPage | Public | Registration, cause, sponsors, volunteer signup |
| `/live` | LivePage | Public | Game day: scores, standings, bracket, fan zone |
| `/captain` | PlayerPortal | OTP (phone) | Captain score entry and verification |
| `/tv` | TVDisplay | Public | Clubhouse projector auto-rotating display |
| `/admin` | AdminDashboard | Admin (TBD) | Build, publish, and game day operations |
| `/wizard` | TournamentWizard | Admin (TBD) | Tournament configuration setup tool |

---

## Database Schema Summary

**22 tables** deployed to Supabase, organized by domain:

**Core:** `organizations`, `events` (big config table with JSONB checklists, feature flags, payment config, fundraising), `event_dates`

**Registration & Teams:** `registrations` (with auto-generated reconciliation codes via trigger), `teams`, `players`

**Tournament Structure:** `pools`, `playing_areas` (generalized from "courts"), `brackets`, `matches` (with full scoring flow: pending → scheduled → ready → live → score_entered → disputed → completed), `pool_standings` (auto-computed by trigger on match completion)

**Sponsors & Services:** `sponsor_tiers`, `sponsors`, `local_services`, `gift_basket_items`

**Volunteers & Staff:** `volunteer_roles`, `volunteer_applications`, `staff_contacts`

**Publishing:** `artifacts` (draft → review → approved → published workflow with versioning and audience targeting)

**Auth & Game Day:** `admin_users` (role-based: org_admin, admin, treasurer, referee, volunteer_coord, control_desk), `otp_sessions`, `playing_area_queue`, `announcements`, `activity_log`

**7 Triggers:** auto updated_at (×5), reconciliation code generation, total amount calculation, pool standings recomputation, fundraising total updates, volunteer role fill count

**Database Functions:** `assign_home_captain(match_uuid)` — randomizes which team's captain enters scores

**RLS:** Public read on game day data, public insert for registrations and volunteer applications, admin full CRUD

**Realtime:** Enabled on matches, pool_standings, playing_areas, teams, announcements, playing_area_queue

**Migration applied:** `001_playing_areas.sql` — renamed `courts`/`court_queue` to `playing_areas`/`playing_area_queue`, updated all FK columns, indexes, and renamed `events.court_count`/`court_label` to `area_count`/`area_label`

---

## Service Layer (src/services/api.js)

Complete CRUD operations covering:
- `events` — get, update, status transitions, fundraising, rules
- `registrations` — public create, admin list with filters/search, batch update, confirm payment, reject, lookup by recon code
- `teams` — create from registration, list, check-in/undo, pool assignment, elimination
- `players` — batch create, lookup by phone (OTP resolution)
- `matches` — list (with joins), get live, submit score, verify score (auto-calculates winner), dispute, resolve dispute, force verify, assign playing area, start match (calls DB function), award bye, reassign home captain
- `pools` — create batch, list with nested standings
- `playingAreas` — list, update status, batch create
- `brackets` — create, list with nested matches
- `volunteers` — public apply, admin list, batch approve/decline, list roles
- `sponsors` — list with tiers, CRUD
- `artifacts` — list, update status through pipeline
- `announcements` — list active, create with priority/TV flags, deactivate
- `otp` — request (calls serverless function), verify (checks code + expiry)
- `activityLog` — log actions, list for audit
- `giftBasket`, `localServices` — read lists

---

## Real-time Hooks (src/hooks/useRealtime.js)

- `useRealtimeMatches(eventId)` → `{ matches, live, completed, upcoming }`
- `useRealtimeStandings(eventId)` → `{ pools }` with nested standings
- `useRealtimeAreas(eventId)` → playing area status
- `useRealtimeTeams(eventId)` → `{ teams, checkedIn, eliminated }`
- `useRealtimeAnnouncements(eventId)` → active announcements
- `useRealtimeQueue(eventId)` → playing area allocation queue
- `useWatchMatch(matchId)` → single match watcher for captain portal
- `useRealtimeRegistrations(eventId)` → new registration notifications

All use a shared `useRealtimeTable` base handling initial fetch, WebSocket subscription, and INSERT/UPDATE/DELETE state updates.

---

## What Each View Does (Current State)

### TournamentWizard.jsx (11 steps)
Collects: org info + brand colors + logos/images, event details + multi-day dates, venue facilities + sport-specific equipment + signage + permits/licenses checklists, cause + fundraising goal + thermometer toggle, tournament format + team sizes + scoring rules, registration config (team logos/slogans/stories, image consent, waivers, shirt sizes, dietary), fees + payment methods (e-Transfer/Stripe/cash) + reconciliation, sponsor tiers + sponsors + local services + digital gift basket, volunteer roles (with headcounts) + staff contacts (with role dropdown), deliverable toggles (schedule, run sheet, site maps, resource directory, volunteer/staff/service packages, AI Q&A, gift basket page). Exports JSON.

### LandingPage.jsx
Hero with fundraising thermometer, cause section with 3 educational fact cards, event details grid, registration form (captain = Player 1 with dietary, additional players scale to playersPerTeam - 1, each with full contact fields, payment selector, donation, consent + waiver), volunteer section (clickable role cards open signup form with primary role pre-filled, multi-role checkboxes, experience, certifications), gift basket teaser, sponsor tiers, footer. Post-submit differentiates pending (e-Transfer/cash — "Registration Submitted" with next steps) from confirmed (Stripe — "You're In").

### AdminDashboard.jsx (3 contexts)
**Build:** Stats cards (teams, revenue, volunteers, fundraising %), tabbed panels — Registrations (search/filter table, expand rows for details, batch submit with queued changes + sticky submit bar + undo), Volunteers (cards with approve/decline + per-item undo + batch submit), Fundraising (thermometer + editable amount + submit), Rules (markdown editor + submit).

**Publish:** Artifact list with type icons, status badges (draft/review/approved/published), audience tags. Workflow buttons advance through pipeline. ID badge preview (69×104mm, 4-up A4, front/back with fold line). "Generate All Drafts" button.

**Game Day:** Master tournament clock (start/pause/resume/reset, real-time). Format simulator (inputs: teams/format/areas/time-per-match → outputs: total matches, rounds, concurrent games, estimated duration with over-8-hours warning). Team check-in panel with no-show/bye buttons. Playing area grid. Match engine controls (generate bracket, assign areas, reassign home captain, force verify, award bye, resolve dispute). Announcement composer.

### TVDisplay.jsx
8-slide auto-cycle with variable durations: Gold sponsor (15s) → Live courts grid (15s) → Silver sponsors (5s) → Pool standings (15s) → Bronze sponsors (5s) → Championship bracket (15s) → Community sponsors (5s) → Tournament stats (15s). Total cycle ~90s. Persistent header (branding, view label, tournament clock, real-time clock). Persistent announcement ticker. Progress dots distinguish sponsor/content slides. Score flash animations on updated matches. Pulsing live indicators.

### LivePage.jsx
Mobile-first with bottom tab bar (Courts, Standings, Bracket, Schedule, Fan Zone). Team picker overlay on first visit (pick or random assign). Personalized live banner (your team's score when playing). Full-screen search overlay. Tappable team names everywhere open team profile sheet (stats, next match with live score, complete match history). **Fan engagement:** Sponsor quiz (3 questions, all correct = gift basket discount upgrade 10→15%), fan photo contest with voting, fan base leaderboard (trophy for biggest following), donation challenge leaderboard (trophy for most fan donations post-event). Fundraising thermometer + announcements feed.

### PlayerPortal.jsx
Phone entry → OTP verification (6 individual digit inputs, auto-advance, shake on error, auto-submit on complete) → Captain dashboard. Dashboard: stats row, active match panel that adapts by role — Home Captain gets score entry (two large number inputs + submit), Away Captain waits then gets verify/dispute interface. Post-submit states: waiting for verification, verified (green), disputed (red, referee notified). Team roster. Full match history with W/L/Home/Away badges.

---

## CRITICAL: Known Gaps & Required Work

### 1. Data-Driven Refactor (BLOCKING — must do first)
**Problem:** Every view has hardcoded config constants and mock data. The wizard exports JSON but nothing consumes it. Views don't read from Supabase.

**Solution:** Replace every hardcoded `const C = {...}` / `const MOCK_X = [...]` with Supabase fetches keyed to an event ID. Pattern for every view:
```jsx
const [config, setConfig] = useState(null);
useEffect(() => { events.get(eventId).then(setConfig); }, [eventId]);
if (!config) return <LoadingSpinner />;
// Then use config.brand.primary instead of C.brand.primary, etc.
```

**Scope:** Touches all 6 view files. Same pattern each time. Components/layouts/interactions stay identical — only the data source changes.

### 2. Wizard-to-Database Flow
The wizard's Export button needs to become "Create Tournament" — writes to `organizations` + `events` tables, creates `volunteer_roles`, `sponsor_tiers`, `playing_areas`, `event_dates`, and returns the event ID.

### 3. Auth Layer
Admin login via Supabase Auth. Role-based route protection matching `admin_users` table roles. Protected routes for `/admin` and `/wizard`.

### 4. Serverless Functions
Templates exist in WIRING_GUIDE.md but not deployed:
- `/api/send-otp` — Twilio SMS for captain verification
- `/api/create-stripe` — Stripe Checkout session creation

### 5. Artifact Generation Engine
Publish context has the workflow UI but no actual content generation. Needs: event schedule builder, game run sheet from match data, volunteer packages from role assignments, staff packages, ID badge PDF generation (layout spec: 69×104mm portrait, 4-up on A4, front/back with fold), site maps, resource directory.

### 6. Platform Shell (SaaS model only)
Organizer sign-up/login, multi-tournament dashboard, subdomain or path routing to resolve event ID, Stripe Connect for billing.

### 7. Style Reference Extraction (enhancement)
Serverless function to fetch an organizer's website and extract brand colors/fonts/logos. Three approaches viable: CSS parsing, AI-assisted extraction via Anthropic API, or screenshot + vision analysis.

### 8. Schema Addition Needed
`events` table needs a `rules_content TEXT` column — the Rules tab in the admin dashboard references it but it wasn't in the original schema. Migration needed:
```sql
ALTER TABLE events ADD COLUMN rules_content TEXT;
```

---

## Environment Variables Required

### `.env` (local dev)
```
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key
VITE_STRIPE_PUBLIC_KEY=pk_test_xxx
VITE_EVENT_ID=your-event-uuid
```

### Deployment (Netlify/Vercel)
```
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_SERVICE_KEY=your-service-key
TWILIO_SID=your-twilio-sid
TWILIO_AUTH_TOKEN=your-twilio-auth
TWILIO_PHONE=+1234567890
STRIPE_SECRET_KEY=sk_test_xxx
SITE_URL=https://your-site.netlify.app
```

---

## Design Decisions Made

- **Playing areas, not courts:** Database and code use `playing_areas` as the universal term. The `events.area_label` field stores the display word (Courts, Pitches, Lanes, etc.) per sport.
- **Captain = Player 1:** Registration form collects captain as Player 1. Additional player slots = `playersPerTeam - 1`.
- **Batch submit pattern:** Admin dashboard queues changes locally with visual indicators. Nothing persists until explicit "Submit Updates" action. Enables undo before commit.
- **Home Captain Rule:** For each match, one captain is randomly designated to enter the score. The other captain verifies or disputes. Referee can override.
- **Post-registration status:** e-Transfer and cash payments are "submitted" (pending), not "registered." Confirmation happens only after admin matches the reconciliation code. Stripe auto-confirms.
- **Sponsor rotation on TV:** Gold gets 15s at the top of cycle, Silver/Bronze/Community get 5s each interleaved between content views. ~90s total cycle.
- **Fan engagement as participation driver:** Team following is required (or random assigned), sponsor quiz gates gift basket upgrades, photo contest + fan base trophy + donation challenge create competitive engagement.

---

## Recommended Next Steps (in order)

1. **Add `rules_content` column** — quick migration
2. **Data-driven refactor** — make all views read from Supabase by event ID
3. **Wizard → database flow** — Create Tournament writes to Supabase
4. **Auth layer** — admin login + protected routes
5. **Deploy serverless functions** — OTP + Stripe
6. **Artifact generation** — schedule, run sheet, badges, packages
7. **Platform shell or deployment packaging** — depending on which model ships first
8. **Style extraction** — scan organizer's website for branding

---

## Test Data

The ETRC Bocce Classic config (used throughout development) is available as a JSON export from the wizard. Key values: org "ETRC", sport "bocce", 20-36 teams, 2 players per team, double elimination, 6 courts, $100 entry fee, $15,000 fundraising goal, Aug 29 2026, ETRC Clubhouse. Gold sponsor: Tall Tree Health. 8 volunteer roles totaling 29 volunteers needed. Cause: Elder Fraud Prevention.
