# Tournament Builder Platform — Project Status & Handoff

**Last updated:** 2026-07-22 (end of session — Pass 4 built + live-verified; migration 010 PII-exposure bug found & fixed)

## Quick Context
A multi-sport charity tournament management platform. Originally scoped for an Ebb Tide Rugby Club (ETRC) bocce tournament supporting Elder Fraud Prevention, generalized to support any organization running any sport's charity tournament.

**GitHub Repo:** `cocomo-jamie/Tournament_Builder`
**Database:** Supabase (schema deployed, 11 migrations — 010 corrected by 011; see below)
**Stack:** React (Vite) + Tailwind CSS + Supabase (PostgreSQL + Realtime + RLS + Auth) + Lucide Icons + React Router

---

## Where We Are: Steps 1–4 Complete

| Step | Status | Notes |
|---|---|---|
| 1–2: Data-driven refactor (all 5 views) | ✅ Done | LandingPage, LivePage, PlayerPortal, TVDisplay, AdminDashboard all pull live Supabase data via `useEvent()` + realtime hooks |
| 3: Wizard → database flow | ✅ Done, tested end-to-end | "Create Tournament" writes across 10 tables, returns live event URL |
| 4: Auth layer | ✅ Done, live-verified | Login, invite-based signup, role-based route protection, Team management UI, super-admin org creation — all now confirmed by live manual testing (2026-07-22). Team UI + super-admin org creation had been **falsely documented as done** before existing in the codebase; built in Pass 4 and click-through-verified this session |
| Registrations panel overhaul | ✅ Done | Independent payment/approval checkboxes, audit trail, single-admin lock queue |
| **4b: Match overrun policy** | 📋 Spec written, not built | See `FEATURE_SPEC_match_overrun.md` — depends on Referee role (done) being exercised in Game Day UI (not built) |
| **Pass 3: RLS tightening** | ✅ Done | Migration 010 — see below |
| **Pass 3b: Wizard org-scoping fast-follow** | ✅ Done | `createTournament.js`/`TournamentWizard.jsx`/`App.jsx` — see below |
| **Pass 3c: Real ProtectedRoute + admin dashboard gating** | ✅ Done | `ProtectedRoute.jsx` created; `/e/:eventId/admin` now actually gated — see below |
| **Pass 4: Admin UI gaps (super-admin, Team tab, identity, logout)** | ✅ Done, live-verified | `SuperAdminDashboard.jsx` + `/super-admin` route, Team tab + role→tab gating, header identity + logout — click-through-verified 2026-07-22, see below |
| **Migration 010 fix (registrations public-read PII exposure)** | ✅ Fixed live + migration 011 | 010's DROP POLICY used the wrong policy name; public PII was readable with the anon key until tonight's manual fix — see below |
| 5: Serverless functions (OTP + Stripe) | Not started | Player Portal OTP shows graceful error; no backend exists |
| 6: Artifact generation engine | Not started | Publish tab has hardcoded placeholder data |
| 7: Deployment / hosting | Not started | App only runs via local `npm run dev` |
| 8: Style extraction | Not started | Lower priority enhancement |

---

## ✅ Pass 3: RLS Org/Event Scoping — Done (Migration 010)

Migration 010 (`010_rls_org_event_scoping.sql`) replaced every blanket `"Admin full X"` policy (previously `auth.uid() IN (SELECT id FROM admin_users WHERE active = true)` — any active admin, any org, any event) with real scoping via three new `SECURITY DEFINER` helper functions: `is_super_admin()`, `is_org_admin_for(org_id)`, `is_event_admin_for(event_id)`.

It also retired the temporary public policies opened during Step 3/4 development:
- **004** public INSERT (10 wizard tables) → now requires an authenticated org_admin/super_admin (org-level) or event admin (event-scoped tables).
- **005** public SELECT on `organizations` → narrowed (not removed): public read now requires the org to own at least one non-draft event, since `configTransformer.js` reads `event.organizations.brand`/`.logo_url` for public-site branding via the `events.get()` embed. `events` reverted to its original `status != 'draft'` scoping.
- **006** public SELECT on `registrations` (the PII exposure — name/email/phone readable by anyone with the anon key) → removed entirely. The recon-code lookup feature was removed rather than replaced (see below), so there is no remaining legitimate public read path on this table.

**Flagged for future exploration:** per-role table restrictions within an org/event scope (e.g. treasurer limited to payments, referee limited to game-day tables) — deferred from Pass 3. Every scoped admin currently has full CRUD on all tables within their org/event boundary; narrowing this needs product definition of exactly what each role should be blocked from before it's worth encoding in RLS.

**Also removed:** the reconciliation-code public lookup (`registrations.findByReconCode` in `api.js`) — it depended on the public SELECT policy retired in this pass. Registrants already see their reconciliation code on the post-submit confirmation screen and via their confirmation email; no lookup UI existed to replace (LandingPage.jsx needed no changes).

## ✅ Pass 3b: Wizard org-scoping fast-follow — Done

Pass 3 correctly restricted `organizations` INSERT to `super_admin`, but `createTournament.js` unconditionally inserted a brand-new organization on every "Create Tournament" run — so an `org_admin` adding a second event to their own org could no longer complete the Wizard. Separately, `/wizard` had no auth gate at all (in fact, no reusable `ProtectedRoute` component exists anywhere in this app yet — `/e/:eventId/admin` also has no route-level auth gate; that's a pre-existing gap, out of scope here).

Fixed:
- **`createTournament.js`** — signature is now `createTournament(data, adminUser)`. If `adminUser.org_id` is set (org_admin), the organizations insert is skipped entirely and `adminUser.org_id` is reused as `orgId` for the event insert; org-info fields the Wizard collected are discarded for this path (editing org branding outside the Wizard is future work). If `adminUser.org_id` is null (super_admin), behavior is unchanged — a new org is created.
- **`TournamentWizard.jsx`** — pulls `adminUser` from `useAuth()`, passes it into `createTournament()`, and relaxes the Organization step's required-field validation when `adminUser.org_id` is set (with an inline note telling org_admins those fields are unused this run).
- **`App.jsx`** — added a lightweight `WizardRoute` guard (not a general-purpose `ProtectedRoute` — none exists yet in this app) restricting `/wizard` to `super_admin`/`org_admin`. Logged-out → `/login?redirect=/wizard`. Logged-in but wrong role → their own event admin dashboard if `event_id` is set, else `/login`.

~~**Known limitation carried forward:** `WizardRoute` treats "authenticated but `adminUser` not yet loaded" the same as "still loading" rather than distinguishing it from "authenticated non-admin".~~ **Fixed in Pass 3c** — see below.

---

## ✅ Pass 3c: Real ProtectedRoute + admin dashboard gating — Done

Building Pass 3b surfaced that `src/components/ProtectedRoute.jsx` didn't exist at all, despite this doc documenting `/e/:eventId/admin` as wrapped in one since whenever Pass 2 was originally done. That route had **zero auth gating at the React Router level** the entire time — RLS (migration 010, Pass 3) still blocked unauthenticated data reads/writes underneath it, but the admin dashboard page shell itself rendered for anyone who hit the URL, logged in or not. If this app was ever deployed publicly during that window, that's worth checking — the UI wouldn't have leaked data past RLS, but it would have been visibly reachable.

Fixed:
- **`src/components/ProtectedRoute.jsx`** (new) — generalizes the `WizardRoute` pattern into a real event-scoped guard. Checks session → adminUser exists → scope matches the event, using `config._raw.org_id` (already loaded by `useEvent()` — no redundant fetch). super_admin → always allowed. org_admin → allowed if their `org_id` matches the event's org, else inline "Access Denied" (no single valid redirect target). Event-scoped roles (`admin`, `treasurer`, `referee`, `volunteer_coord`, `control_desk`) → allowed only for their exact `event_id`, else redirected to their own event's admin dashboard.
- Also exports **`useResolvedAuth()`** — properly fixes the `loading`-vs-`adminUser` race flagged (but only patched around) in Pass 3b: `AuthContext`'s `loading` flag covers just the initial session bootstrap, not the `refreshAdminUser()` call that follows a fresh sign-in, so `adminUser` can briefly lag behind `session`. `useResolvedAuth()` actively re-triggers `refreshAdminUser()` once per session and tracks that specific attempt, so "still resolving" and "resolved to no admin row" are now distinguishable instead of both showing an indefinite spinner. `WizardRoute` in `App.jsx` was refactored to use this same hook, so both guards behave consistently.
- **`App.jsx`** — `/e/:eventId/admin` now wraps `AdminDashboard` in `ProtectedRoute` (inside `EventShell`/`ConfigGate`, so `useEvent()` and `useParams()` are both available to it).
- **`Login.jsx`** — was found to not actually read `?redirect=` at all (`navigate("/")` unconditionally, with a stale "Pass 2 will redirect based on role" comment) despite this doc's "Route protection" note implying the round-trip worked. Now reads `searchParams.get("redirect")` and navigates there post-login, falling back to `/`.

---

## ✅ Pass 4: Admin UI gaps — Built & live-verified (2026-07-22)

Live testing found four things this doc had documented as built (from "Pass 2") that **did not exist in the codebase**: no `/super-admin` route or view (so **no way to create an org_admin through the app at all** — only one manually-created super_admin existed), no Team tab, no logged-in identity display, no logout button. Fourth recurrence of documented-as-done ≠ actually-done in this project.

**Grep before building confirmed:** the *data layer* already existed from Pass 2 groundwork — `api.js`'s `admin` block had `getCurrentAdmin`, `createInvite`, `listInvites`, `getInviteByToken`, `listOrgAdmins`, `createOrganization`, and migration 007 had the `invites` table + `handle_invite_signup` trigger. Only the consuming UI was missing. So this pass wired UI to existing functions rather than rebuilding the backend.

Built:
- **`src/services/api.js`** — added `listOrganizations()`, `listPlatformAdmins()` (event_id NULL + org name join), and `listEventTeam(orgId, eventId)` (org-wide + this-event admins) to the `admin` block. Reused existing `createInvite`/`createOrganization` unchanged.
- **`src/views/SuperAdminDashboard.jsx`** (new) + **`/super-admin`** route in `App.jsx`, guarded by a new **`SuperAdminRoute`** (mirrors `WizardRoute`; requires `adminUser.org_id === null`; non-super-admins are **redirected**, never shown "Access Denied"). Page: create bare org (name + email, the two NOT-NULL cols), invite org_admin (email + org dropdown → `createInvite(email, 'org_admin', {orgId, eventId:null})`, shows the `/accept-invite?token=…` link to send), plus read-only lists of orgs and platform admins. Token format is DB-generated (`gen_random_bytes(24)` hex) — reused as-is, matches what `AcceptInvite.jsx` consumes.
- **`src/views/AdminDashboard.jsx`** — added inline `TeamContext` (matches the existing inline `BuildContext`/`PublishContext`/`GameDayContext` pattern — sibling tab components are functions in this file, not separate files): event-team roster + invite form for event-scoped roles. Added `ROLE_TABS` gating; tab nav now filters to the role's visible tabs and initial tab defaults to the role's first visible tab (was hardcoded `"build"`). Header now shows `adminUser` display name/email + role and a working **Sign Out** button (`signOut()` → `navigate("/login")`); replaced the hardcoded `"ETRC Bocce Classic"` title (now `config.event.name`) and hardcoded `"JH"` avatar (now initials from `adminUser`). The imported-but-unused `LogOut` icon is now actually used.

**Verified:** `npx vite build` passes clean (1565 modules, no errors) **and** full role-based click-through against live Supabase on 2026-07-22 — see the "Live Testing Session" section below for exactly what was exercised. The earlier "live click-through NOT yet done" caveat is now resolved.

---

## 🔬 Live Testing Session — 2026-07-22

First end-to-end manual test pass against the live Supabase project (not just build/compile checks). Everything below was exercised by hand in the browser, logged in as real accounts, watching real data change in Supabase.

### Confirmed working, verified live

- **Login redirect round-trip** — hitting a gated URL while logged out redirects to `/login?redirect=…` and, after signing in, lands back on the originally-requested page (not a blind `/`).
- **Loading-state race on hard refresh** — hard-refreshed gated pages multiple times, as two different roles; `useResolvedAuth()` correctly distinguishes "still resolving" from "resolved to no admin row" — no infinite spinner, no false "Access Denied" flash before `adminUser` loads.
- **org_admin cross-org access** — an org_admin visiting an event belonging to a *different* org gets the inline "Access Denied" (no redirect loop, no data leak).
- **Referee cross-event access** — a referee scoped to event A visiting event B's admin URL is auto-redirected to their own event's admin dashboard.
- **Wizard org-reuse logic** — an org_admin adding a *second* event to their existing org correctly reuses the org instead of inserting a duplicate `organizations` row (the Pass 3b fix), with the new inline UX note shown in the Wizard.
- **Wizard route protection** — `/wizard` is both login-gated and role-gated (super_admin / org_admin only); other roles are redirected.
- **Super Admin flow, end-to-end** — created a new org → invited an org_admin (invite link surfaced) → accepted the invite via `/accept-invite?token=…` → set a password → the resulting `admin_users` row had `role: 'org_admin'` with the correct `org_id` and `event_id: NULL` → logged in as that org_admin and confirmed the **Team** tab is visible alongside Build / Publish / Game Day.
- **Event-scoped invite flow** — from the Team tab, invited a **referee** for one specific event → accepted → `admin_users` row had both `org_id` and `event_id` set correctly → logged in as that referee and confirmed **only the Game Day tab** is visible (no Team, no Build, no Publish).
- **Identity + logout** — header shows the correct display name/email + role for at least two different roles; Sign Out actually ends the session and lands on `/login`, and a subsequent visit to any `/admin` page redirects back to login (a real signout, not just UI state).

### 🔴 Migration 010 correction — real live PII exposure window (fixed)

Migration 010 attempted to drop the public `SELECT` policy on `registrations` but **guessed the wrong policy name** (`"Public read registrations"`). The policy's real name — confirmed via live Supabase dashboard inspection — was `"Public read registrations TEMP"`, so the `DROP POLICY` silently no-op'd and **public read access to registrant PII (name / email / phone) remained live after Pass 3 was marked done.** This was found tonight via a direct *unauthenticated* REST call against the live project, which returned full registrant data using only the anon key. This was a genuine exposure window between Pass 3 being marked complete and tonight's fix — stated plainly, not softened.

- **Fixed manually, live**, via the Supabase dashboard Policies UI (the offending policy is now dropped; `registrations` retains only `"Admin full registrations"` and `"Public insert registrations"`).
- **`supabase/migrations/011_fix_registrations_public_read_drop.sql`** brings the migration history in line with that manual fix, so any *other* environment (fresh local, teammate DB, future staging/prod) running migrations from scratch also ends up correct instead of silently reintroducing the exposure. It `DROP POLICY IF EXISTS`-es both the correct TEMP name and 010's wrong guess, so it's safe against either state and is a confirmed no-op against the already-corrected live DB.
- **Apply status:** the migration file is committed to the repo. It was **not** applied from the CC session (no `supabase` CLI / `psql` / service-role access in that environment; the anon key can't alter policies) — but this is moot for the live DB, which was already corrected by hand tonight. Other environments pick it up on next migrate.

### New backlog item — Game Day needs role-scoped sub-permissions (needs design)

`ROLE_TABS` currently gates *which tabs* a role sees, but every role that can see the Game Day tab at all (org_admin, super_admin, admin, referee, control_desk) sees **identical content** — full team check-in plus all match-engine actions (award bye, resolve dispute, assign areas, force verify). That's too coarse:

- A **referee** should have their own schedule / assigned-matches view (possibly with self-service swap capability) and should **not** see org_admin-level match-engine controls.
- Referees wanting quick access to tournament **rules** is better solved as a **produced/published artifact** (ties into the existing Publish-tab artifact-generation backlog) than as a duplicated live admin panel.

This needs real design discussion (what exactly each Game Day role can see and do) before implementation — **not a quick fix.** Related to the still-open "per-role table restrictions within org/event scope" RLS item from Pass 3.

### Process note — "documented as done" must mean "verified," not "code written"

This session (and the three before it) repeatedly found things `PROJECT_STATUS.md` documented as done that weren't actually in the codebase or weren't live: route protection, the `?redirect=` param, the Team tab, the Super Admin view, and the registrations public-read policy drop. **Every one of these was caught through direct live testing, not code review.** Going forward, "done" in this doc should mean *manually verified against the running app / live DB*, not *code written and compiling*. This instruction has been added to recent CC handoffs and should keep being followed.

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
│       ├── 009_registration_approval_audit.sql # approved_by column, admin_lock_queue table
│       └── 010_rls_org_event_scoping.sql    # Pass 3: org/event-scoped RLS, retired 004/005/006 public policies
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
│   │   └── ProtectedRoute.jsx                # admin route scope-checking — created in Pass 3c (see below); this doc previously (incorrectly) listed it as already existing since whenever Pass 2 was done
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

**Route protection:** `/e/:eventId/admin` is wrapped in `ProtectedRoute` (checks session → adminUser exists → scope matches this event/org). Not-logged-in redirects to `/login?redirect=...` and bounces back after login. Wrong-event admins get redirected to their own event; wrong-org admins see "Access Denied" (no single valid redirect target). **This was documented here as done since whenever Pass 2 originally happened, but the component never actually existed — `/e/:eventId/admin` had zero route-level auth gating (RLS still blocked unauthenticated data access underneath it, but the page shell itself loaded for anyone) until Pass 3c actually built it. Worth checking whether this app was ever deployed publicly during that window.**

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

1. **Per-role table restrictions within org/event scope** (e.g. treasurer limited to payments, referee limited to game-day tables) — deferred from Pass 3 (migration 010). Needs product definition of exactly what each role should be blocked from before it's worth encoding in RLS.
2. **Match overrun / Referee authority** — spec written, not implemented. Needs Game Day UI work: per-area and tournament-wide deficit/surplus tracking, extend-time / pull-forward actions gated to admin+referee.
3. **Match engine stubs** — Generate Bracket, Assign Areas, and Reassign Captain in Game Day currently show "not yet implemented" messages; they need a match-selection UI that wasn't in scope for the data-driven refactor.
4. **Fan engagement data** (`FAN_COUNTS`, `SPONSOR_QUIZ`, `PHOTO_ENTRIES` in LivePage) — still hardcoded; no DB tables exist for these yet.
5. **BracketView round labels** — shows "Round 1/2/3" instead of "Quarterfinal/Semifinal/Final"; TODO comment left in code to derive proper labels from `bracket.total_rounds`.

---

## Proposed Schedule (Next Session)

1. **Step 7 — Deployment**: get the app live on a real host (Vercel is the natural fit for Vite) with production env vars, so there's something real to test against instead of only local dev.
2. **Step 5 — Serverless functions**: Twilio (OTP SMS) and Stripe (payments) — needed for Player Portal captain login and real payment processing to actually function.
3. **Step 6 — Artifact generation engine**: real schedule/run-sheet/resource-directory generation for the Publish tab.

Steps 5–6 are bigger lifts; reserved Fable 5 credits ($140) may be worth spending there per earlier discussion, once Sonnet+CC has the foundation (Pass 3 + deployment) solid.

---

## Service Layer (src/services/api.js)

Domains: `events`, `registrations` (+ `setPaymentReceived`/`setApproved`), `teams`, `players`, `matches`, `pools`, `brackets`, `sponsors`, `volunteers`, `giftBasket`, `localServices`, `artifacts`, `announcements`, `activityLog`, `otp`, `admin` (auth/invites).

## Hooks (src/hooks/)

- `useRealtime.js` — `useRealtimeTable` (generic, now with `refetch()`), `useRealtimeMatches`, `useRealtimeStandings`, `useRealtimeTeams`, `useRealtimeAreas`, `useRealtimeAnnouncements`, `useRealtimeRegistrations`, `useWatchMatch` — all channel names now include a per-instance random suffix to prevent collision when the same table is subscribed to twice on one page.
- `useEventConfig.js` — fetches + transforms event config for `EventContext`
- `useScreenLock.js` — FIFO lock queue with heartbeat presence + idle timeout

## Database (supabase/schema.sql + 10 migrations)

22 core tables + `activity_log`, `invites`, `admin_lock_queue`. RLS now org/event-scoped per admin (migration 010 — see above; per-role table restrictions within a scope remain a flagged future item), realtime enabled on `matches`, `pool_standings`, `playing_areas`, `teams`, `announcements`, `playing_area_queue`, `admin_lock_queue`. Key triggers: reconciliation code generation (now `SECURITY DEFINER`, atomic), invite-signup → admin_users auto-creation (`SECURITY DEFINER`), pool standings recomputation, fundraising totals, volunteer role fill counts.
