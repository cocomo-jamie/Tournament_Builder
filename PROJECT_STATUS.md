# Tournament Builder Platform — Project Status & Handoff

**Last updated:** 2026-07-21 (end of session — auth complete, registrations overhauled)

## Quick Context
A multi-sport charity tournament management platform. Originally scoped for an Ebb Tide Rugby Club (ETRC) bocce tournament supporting Elder Fraud Prevention, generalized to support any organization running any sport's charity tournament.

**GitHub Repo:** `cocomo-jamie/Tournament_Builder`
**Database:** Supabase (schema deployed, 9 migrations applied)
**Stack:** React (Vite) + Tailwind CSS + Supabase (PostgreSQL + Realtime + RLS + Auth) + Lucide Icons + React Router

---

## Where We Are: Steps 1–4 Complete

| Step | Status | Notes |
|---|---|---|
| 1–2: Data-driven refactor (all 5 views) | ✅ Done | LandingPage, LivePage, PlayerPortal, TVDisplay, AdminDashboard all pull live Supabase data via `useEvent()` + realtime hooks |
| 3: Wizard → database flow | ✅ Done, tested end-to-end | "Create Tournament" writes across 10 tables, returns live event URL |
| 4: Auth layer | ✅ Functionally done | Login, invite-based signup, role-based route protection, Team management UI, super-admin org creation |
| Registrations panel overhaul | ✅ Done | Independent payment/approval checkboxes, audit trail, single-admin lock queue |
| **4b: Match overrun policy** | 📋 Spec written, not built | See `FEATURE_SPEC_match_overrun.md` — depends on Referee role (done) being exercised in Game Day UI (not built) |
| **Pass 3: RLS tightening** | ⚠️ **NOT DONE — see below** | Highest-priority remaining item |
| 5: Serverless functions (OTP + Stripe) | Not started | Player Portal OTP shows graceful error; no backend exists |
| 6: Artifact generation engine | Not started | Publish tab has hardcoded placeholder data |
| 7: Deployment / hosting | Not started | App only runs via local `npm run dev` |
| 8: Style extraction | Not started | Lower priority enhancement |

---

## ⚠️ Critical: RLS Is Still Wide Open (Pass 3 — next session priority)

During Step 3/4 testing, several tables got **temporary public RLS policies** to unblock development, since no auth layer existed yet at the time. Auth now exists (Step 4), but these were never tightened back down. **This is the top priority for the next session.**

Migrations that opened public access, and what needs to happen to each in Pass 3:

- **004** (`wizard_public_insert.sql`) — public INSERT on `organizations`, `events`, `event_dates`, `playing_areas`, `volunteer_roles`, `sponsor_tiers`, `sponsors`, `gift_basket_items`, `local_services`, `staff_contacts`. → Should scope to authenticated admins only (the Wizard now runs after login in practice, but the DB doesn't enforce it).
- **005** (`fix_returning_rls.sql`) — public SELECT on `organizations` and `events` (including draft events). → Needs scoping; likely fine to keep broad read on published events, but drafts and org details probably shouldn't be fully public.
- **006** (`fix_registrations_returning.sql`) — public SELECT on `registrations`. → **Highest urgency**: this table holds registrant PII (name, email, phone). Anyone with the anon key can currently read every registrant's contact info for any event. Should be replaced with a `SECURITY DEFINER` function (same pattern as the invite-signup trigger) that returns only the reconciliation code to the submitter, not the full row to anyone.

Also worth reviewing while in there: every existing `"Admin full X"` policy currently checks only `auth.uid() IN (SELECT id FROM admin_users WHERE active = true)` — **no org or event scoping at all**. Any admin_users row (any role, any org) currently grants full access to every organization's and every event's data. Migration 007 added `org_id`/`event_id` to `admin_users` specifically to support proper scoping, but the policies themselves were never rewritten to use it. This should be part of Pass 3 too.

---

## Repository Structure (Current)

```
Tournament_Builder/
├── .gitignore
├── .env.example
├── WIRING_GUIDE.md
├── PROJECT_STATUS.md                        # this file
├── FEATURE_SPEC_match_overrun.md            # policy spec, not yet built
├── package.json
├── vite.config.js
├── tailwind.config.js
├── postcss.config.js
├── index.html
├── supabase/
│   ├── schema.sql
│   └── migrations/
│       ├── 001_playing_areas.sql            # courts → playing_areas rename
│       ├── 002_rules_content.sql            # events.rules_content column
│       ├── 003_fix_admin_users_recursion.sql # infinite recursion in admin_users RLS
│       ├── 004_wizard_public_insert.sql     # ⚠️ temp public INSERT, 10 tables
│       ├── 005_fix_returning_rls.sql        # ⚠️ temp public SELECT, organizations/events
│       ├── 006_fix_registrations_returning.sql # ⚠️ temp public SELECT, registrations (PII)
│       ├── 007_auth_org_scoping.sql         # admin_users.org_id, invites table + trigger
│       ├── 008_fix_reconciliation_code.sql  # SECURITY DEFINER fix for recon code generation
│       └── 009_registration_approval_audit.sql # approved_by column, admin_lock_queue table
├── src/
│   ├── main.jsx
│   ├── index.css
│   ├── App.jsx                              # routing, AuthProvider, ProtectedRoute wiring
│   ├── supabaseClient.js
│   ├── services/
│   │   └── api.js                           # all CRUD by domain, + admin block (auth/invites)
│   ├── hooks/
│   │   ├── useRealtime.js                   # 7 realtime hooks + generic refetch()
│   │   ├── useEventConfig.js
│   │   └── useScreenLock.js                 # FIFO admin lock queue (Registrations panel)
│   ├── context/
│   │   ├── EventContext.jsx                 # useEvent() — event config
│   │   └── AuthContext.jsx                  # useAuth() — session/adminUser
│   ├── components/
│   │   ├── LoadingSpinner.jsx                # LoadingSpinner, ErrorDisplay, NoEventDisplay
│   │   └── ProtectedRoute.jsx                # admin route scope-checking
│   ├── utils/
│   │   └── configTransformer.js             # DB row → view config shape
│   ├── views/
│   │   ├── LandingPage.jsx                  # public site — data-driven ✅
│   │   ├── AdminDashboard.jsx               # Build/Publish/GameDay/Team — data-driven ✅
│   │   ├── TVDisplay.jsx                    # projector display — data-driven ✅
│   │   ├── LivePage.jsx                     # mobile game day hub — data-driven ✅
│   │   ├── PlayerPortal.jsx                 # OTP captain flow — data-driven ✅ (OTP send needs Step 5)
│   │   ├── Login.jsx                        # admin login
│   │   ├── AcceptInvite.jsx                 # invite → signup flow
│   │   └── SuperAdminDashboard.jsx          # org creation + org_admin invites
│   └── tools/
│       └── TournamentWizard.jsx             # 11-step wizard, "Create Tournament" writes to DB ✅
```

---

## Auth System — How It Works

**Roles** (`admin_users.role`): `super_admin`, `org_admin`, `admin`, `treasurer`, `referee`, `volunteer_coord`, `control_desk`.

- `org_id = NULL` → super_admin (platform-wide)
- `org_id` set, `event_id = NULL` → org_admin (all events under that org)
- Both set → event-scoped role (one event only)

**Invite flow:** An admin creates an `invites` row (email, role, org/event scope, token). The invitee visits `/accept-invite?token=...`, sets a password via `supabase.auth.signUp()`. A `SECURITY DEFINER` Postgres trigger (`handle_invite_signup`, migration 007) auto-creates the matching `admin_users` row the instant signup completes — no serverless function needed for this part.

**Route protection:** `/e/:eventId/admin` is wrapped in `ProtectedRoute` (checks session → adminUser exists → scope matches this event/org). Not-logged-in redirects to `/login?redirect=...` and bounces back after login. Wrong-event admins get redirected to their own event; wrong-org admins see "Access Denied" (no single valid redirect target).

**Role → tab visibility in AdminDashboard:**
- super_admin / org_admin / admin → Build, Publish, Game Day, Team
- treasurer / volunteer_coord → Build only
- referee / control_desk → Game Day only

**Known gap:** Confirm email is disabled in Supabase (intentional — invite-gating already proves email ownership, confirmation was redundant and added a 3-5 min delay).

---

## Registrations Panel — Current Behavior

- Payment status and registration approval are **independent** — a checkbox each, not one combined action. Reflects real workflow: an admin can approve a cash-at-door team before payment is confirmed.
- Deny/Reject remains a separate action, queued through the same batch-submit flow as the checkboxes (not immediate).
- `submitAll` writes `payment_confirmed_by`/`payment_confirmed_at` and `approved_by`/`confirmed_at`, plus an `activity_log` entry per change (`registration_approved` / `registration_rejected` / `registration_reverted` / `payment_confirmed` / `payment_reverted`) — full audit trail of which admin did what.
- **Single-admin lock queue**: only one admin can edit the Registrations panel at a time. Others see a queue position banner, read-only controls, and are promoted automatically (FIFO by join order) when the active admin finishes, disconnects (~75s no heartbeat), or goes idle (5 min no interaction — requeues at the back, doesn't hold their spot).
- **Not yet tested:** the actual multi-tab queue promotion behavior (single-admin flow is confirmed working; 2+ admin scenario needs a live test next session).
- Display-refresh bug (changes not appearing without manual reload) was traced to a `bigint`/string ID mismatch in the realtime merge logic (`registrations.id` is the only `BIGSERIAL` PK among realtime-subscribed tables) — fixed generically in `useRealtimeTable`. An explicit `refetch()` was also added as a belt-and-suspenders guarantee after submit, independent of realtime timing.

---

## Known Issues / Technical Debt

1. **RLS scoping** — see Critical section above. This is the main item.
2. **Match overrun / Referee authority** — spec written, not implemented. Needs Game Day UI work: per-area and tournament-wide deficit/surplus tracking, extend-time / pull-forward actions gated to admin+referee.
3. **Match engine stubs** — Generate Bracket, Assign Areas, and Reassign Captain in Game Day currently show "not yet implemented" messages; they need a match-selection UI that wasn't in scope for the data-driven refactor.
4. **Fan engagement data** (`FAN_COUNTS`, `SPONSOR_QUIZ`, `PHOTO_ENTRIES` in LivePage) — still hardcoded; no DB tables exist for these yet.
5. **BracketView round labels** — shows "Round 1/2/3" instead of "Quarterfinal/Semifinal/Final"; TODO comment left in code to derive proper labels from `bracket.total_rounds`.

---

## Proposed Schedule (Next Session)

1. **Pass 3 — RLS tightening** (priority): scope `admin_users`-based policies by `org_id`/`event_id`, replace public registrations SELECT with a `SECURITY DEFINER` function, narrow the Wizard's public INSERT policies to authenticated admins.
2. **Step 7 — Deployment**: get the app live on a real host (Vercel is the natural fit for Vite) with production env vars, so there's something real to test against instead of only local dev.
3. **Step 5 — Serverless functions**: Twilio (OTP SMS) and Stripe (payments) — needed for Player Portal captain login and real payment processing to actually function.
4. **Step 6 — Artifact generation engine**: real schedule/run-sheet/resource-directory generation for the Publish tab.

Steps 5–6 are bigger lifts; reserved Fable 5 credits ($140) may be worth spending there per earlier discussion, once Sonnet+CC has the foundation (Pass 3 + deployment) solid.

---

## Service Layer (src/services/api.js)

Domains: `events`, `registrations` (+ `setPaymentReceived`/`setApproved`), `teams`, `players`, `matches`, `pools`, `brackets`, `sponsors`, `volunteers`, `giftBasket`, `localServices`, `artifacts`, `announcements`, `activityLog`, `otp`, `admin` (auth/invites).

## Hooks (src/hooks/)

- `useRealtime.js` — `useRealtimeTable` (generic, now with `refetch()`), `useRealtimeMatches`, `useRealtimeStandings`, `useRealtimeTeams`, `useRealtimeAreas`, `useRealtimeAnnouncements`, `useRealtimeRegistrations`, `useWatchMatch` — all channel names now include a per-instance random suffix to prevent collision when the same table is subscribed to twice on one page.
- `useEventConfig.js` — fetches + transforms event config for `EventContext`
- `useScreenLock.js` — FIFO lock queue with heartbeat presence + idle timeout

## Database (supabase/schema.sql + 9 migrations)

22 core tables + `activity_log`, `invites`, `admin_lock_queue`. Full RLS (currently over-permissive in places — see Critical section), realtime enabled on `matches`, `pool_standings`, `playing_areas`, `teams`, `announcements`, `playing_area_queue`, `admin_lock_queue`. Key triggers: reconciliation code generation (now `SECURITY DEFINER`, atomic), invite-signup → admin_users auto-creation (`SECURITY DEFINER`), pool standings recomputation, fundraising totals, volunteer role fill counts.
