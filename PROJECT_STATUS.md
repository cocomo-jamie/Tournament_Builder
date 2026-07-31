# Tournament Builder Platform — Project Status & Handoff

**Last updated:** 2026-07-31 (Billing + Beneficiary Commitments work order (Phases 1–7, migrations 021–027) built since the 07-25 session; end-to-end verification pass found multiple confirmed bugs, one fully blocked phase, and one phase that doesn't appear to be deployed at all — see "Session Update — 2026-07-31" below. A phased fix work order now exists; fixes are being applied and live-verified one phase at a time, not all at once, given this project's repeated "documented as done ≠ actually done" history.)

**Live URL:** https://cocomo-events.netlify.app (Git-linked to `main`, CI/CD active — every push auto-deploys)

## Quick Context
A multi-sport charity tournament management platform. Originally scoped for an Ebb Tide Rugby Club (ETRC) bocce tournament supporting Elder Fraud Prevention, generalized to support any organization running any sport's charity tournament.

**GitHub Repo:** `cocomo-jamie/Tournament_Builder`
**Database:** Supabase (schema deployed, 27 migrations — 010 corrected by 011, 013/012's linking triggers hotfixed by 020; see below)
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
| **Pass 3: RLS tightening** | ✅ Actually done as of 2026-07-23 | Migration 010 was marked done on 2026-07-22 but **had never been applied to the live DB** — 004/005 were still wide open. Found via live behavioral testing 2026-07-23, fixed by running 010+011 in the SQL Editor, re-verified clean. See "Session Update — 2026-07-23" below. |
| **Pass 3b: Wizard org-scoping fast-follow** | ✅ Done | `createTournament.js`/`TournamentWizard.jsx`/`App.jsx` — see below |
| **Pass 3c: Real ProtectedRoute + admin dashboard gating** | ✅ Done | `ProtectedRoute.jsx` created; `/e/:eventId/admin` now actually gated — see below |
| **Pass 4: Admin UI gaps (super-admin, Team tab, identity, logout)** | ✅ Done, live-verified | `SuperAdminDashboard.jsx` + `/super-admin` route, Team tab + role→tab gating, header identity + logout — click-through-verified 2026-07-22, see below |
| **Migration 010 fix (registrations public-read PII exposure)** | ✅ Fixed live + migration 011 | 010's DROP POLICY used the wrong policy name; public PII was readable with the anon key until tonight's manual fix — see below |
| **Publish-event flow** | ✅ Done, live-verified | Draft events no longer throw a raw error publicly; `EventStatusCard` in Publish tab lets org_admin/admin/super_admin flip status. A real race-condition bug (config fetch firing before auth session restored) was found and fixed — see below. |
| **Players PII exposure** | ✅ Fixed live + migration 014 | `"Public read players basic" USING (true)` exposed every player's phone/email to anyone with the anon key — same class of bug as the 2026-07-23 registrations incident, pre-existing, found during identity work. Fixed via a `players_public` view (id/team_id/is_captain/full_name only); admin and self-scoped reads unaffected. |
| **Identity — Phases 1–6 (self-scoped RLS, QR check-in, volunteer magic link, role-RLS trim)** | ⚠️ Built + applied live, verification checklist incomplete | Phase 1 (migrations 012/013) done 07-25. Phases 2–6 built and migrations 017–020 applied live 07-26/27 — captain phone OTP replaced with QR/magic-link check-in (deliberate redesign, not the original OTP plan), volunteer magic link, treasurer/volunteer_coord/referee/control_desk RLS narrowed to a real entitlements matrix. A hotfix (020) was needed — a `max(uuid)` bug in two linking triggers blocked **all** new Supabase Auth signups until fixed. As of session close 2026-07-27, the underlying build is confirmed working (QR generation succeeds live) but the **full manual verification checklist has not been completed** — see "Still outstanding" in the 2026-07-27 session below. Treat as built-not-verified, not done, until that checklist runs. |
| **Team roster registration + per-player approval** | ✅ Done, live-verified | Full rebuild of team registration: spreadsheet upload (primary, `.csv`/`.xlsx` via SheetJS) or manual entry (secondary, collapsible cards), post-upload captain/coach role assignment, per-player approval on the Registrations page foldout, `teams.status` derived via DB trigger from player statuses. See below for what this replaced and the bugs found. |
| 5: Serverless functions (OTP + Stripe) | Not started | Player Portal OTP shows graceful error; no backend exists |
| 6: Artifact generation engine | Not started | Publish tab has hardcoded placeholder data |
| 7: Deployment / hosting | ✅ Done, live-verified | Netlify, Git-linked CI/CD → https://cocomo-events.netlify.app. See "Deployment — Live" below. |
| 8: Style extraction | Not started | Lower priority enhancement |
| **Billing + Beneficiary Commitments (Phases 1–7)** | ⚠️ Built, **not** verified-working — see below | Migrations 021–027 applied live. E2E pass (2026-07-31) found: Phase 4 (public commitment notice) confirmed broken on all surfaces tested; Phase 5 (fulfillment evidence) fully blocked — no UI path exists to advance an event to `completed`; Phase 6 (ledger) has real gaps (no expense edit, expenses not wired to running total, no donation update/delete); Phase 7 (billing panels) not found anywhere in the deployed app despite migrations existing. Phases 2–3 have known open issues (verification labeling, inconsistent beneficiary-detail visibility). Fix work order in progress, one phase at a time — see below. |

---

## ✅ Pass 3: RLS Org/Event Scoping — Done as of 2026-07-23 (see correction below)

**This section originally claimed migration 010 was applied and verified on 2026-07-22. That was false — see "Session Update — 2026-07-23" further down for what was actually found and how it was fixed. The description of what 010's SQL *does* below is accurate (confirmed by reading the file); what was wrong was the claim that it had been *run* against the live database.**

Migration 010 (`010_rls_org_event_scoping.sql`) replaced every blanket `"Admin full X"` policy (previously `auth.uid() IN (SELECT id FROM admin_users WHERE active = true)` — any active admin, any org, any event) with real scoping via three new `SECURITY DEFINER` helper functions: `is_super_admin()`, `is_org_admin_for(org_id)`, `is_event_admin_for(event_id)`.

It also retires the temporary public policies opened during Step 3/4 development:
- **004** public INSERT (10 wizard tables) → now requires an authenticated org_admin/super_admin (org-level) or event admin (event-scoped tables).
- **005** public SELECT on `organizations` → narrowed (not removed): public read now requires the org to own at least one non-draft event, since `configTransformer.js` reads `event.organizations.brand`/`.logo_url` for public-site branding via the `events.get()` embed. `events` reverted to its original `status != 'draft'` scoping.
- **006** public SELECT on `registrations` (the PII exposure — name/email/phone readable by anyone with the anon key) → removed entirely. The recon-code lookup feature was removed rather than replaced (see below), so there is no remaining legitimate public read path on this table.

**As of 2026-07-23, all of the above is confirmed live** — see the behavioral before/after table in "Session Update — 2026-07-23."

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

## Session Update — 2026-07-25

### 🔴 Found: `teams.createFromRegistration()` existed but was never called

Discovered while trying to generate real test data for the identity work: approving a registration in the Registrations panel only ever updated `registrations.status` — nothing converted an approved registration into a `teams` row or created any `players` rows. The conversion function existed in `api.js`, scaffolded but never wired into the approval flow. This meant no tournament run through this app could ever have progressed past registration, regardless of anything else built. Root-caused this session, not fixed by a patch — see the roster rebuild below, which fixes it properly rather than just wiring the old function in.

### 🔴 Found and fixed live: `players` table public PII exposure

Same class of bug as the 2026-07-23 `registrations` incident. `schema.sql`'s `"Public read players basic" ON players FOR SELECT USING (true)` had never been narrowed — anyone with the anon key could read every player's phone/email/dietary needs/shirt size, for every event. Pre-existing, not introduced this session. Fixed via migration 014: dropped the public policy entirely, added a `players_public` view exposing only `id, team_id, is_captain, full_name`, with public/`LivePage` reads redirected through the view while admin reads keep full column access. Live-verified against real roster data by session's end — both the security fix and the public roster display (`LivePage`) confirmed working correctly.

### ✅ Publish-event flow — built and live-verified

Every event was stuck `status = 'draft'` in prod with no UI to change it, and a draft event's public page threw a raw Postgrest error instead of a friendly message. Fixed: `events.get()` swapped `.single()` → `.maybeSingle()`, `EventStatusCard` added to the Publish tab (org_admin/admin/super_admin only, matching existing RLS scope — confirmed via code that `is_event_admin_for()` is role-blind within scope, a known pre-existing gap tracked separately, not fixed here).

**A real bug found during verification:** the admin route for a draft event showed the public "not published" message instead of prompting login, when accessed while logged out — a hard lock, since the only way to publish a draft event is via its own admin panel. Root cause: the event-config fetch fired in a `useEffect` on mount, before auth session restoration necessarily finished — a race, not a JSX-ordering issue (an initial theory about component nesting order was wrong; timing was the actual cause). Fixed by merging auth-gating and config-gating into one `AdminGate` component that waits for both to resolve before deciding what to render, with a guarded single retry. Live-verified across logged-out, correct-scope, wrong-scope, and nonexistent-event cases.

### ✅ Team roster registration + per-player approval — built and live-verified

Full rebuild, not a patch. Replaces the never-wired `teams.createFromRegistration()` gap above with a real submission flow:

- **Entry method:** spreadsheet upload (primary/default) or manual entry (secondary, via a toggle), not combined — switching methods after entering data prompts a confirm dialog (data loss both directions).
- **Spreadsheet path:** drop box (`.csv`/`.xlsx` via the new `xlsx`/SheetJS dependency) with a downloadable template (`name`, `email`, `phone`, plus optional `shirt_size`/`dietary_needs`), client-side parsing with clear per-column failure messaging (not just a wall of ambiguous warnings), remove/replace control on the loaded file.
- **Role assignment, post-upload:** "Choose Captain" → "Choose Coach" (if the event's existing `events.require_coach` flag is set) checkbox flow, replacing everyone else's label with "Player." Manual path: captain is the fixed first collapsible card, coach is a simple per-card toggle.
- **Submission:** `registrations` (captain fields sourced from whichever entry is flagged captain) → `teams.create()` → `players.createBatch()`, sequential calls (no transaction wrapper exists anywhere in this codebase — an accepted, documented risk, not a new gap; see `FEATURE_SPEC_team_roster_registration.md`).
- **Registrations page:** the foldout mechanism was found to be **completely non-functional** — expand state toggled, chevron rotated, but no expanded content was ever rendered in the JSX at all. Rebuilt for real: captain (informational, from `registrations`) plus every player (from `players`, fully actionable — independent approve/reject per row, same pattern as the existing registration-level payment/approval checkboxes).
- **`teams.status`** is derived via a new DB trigger (migration 016), not frontend logic — recomputes to `approved` once the captain and at least `events.players_min` total players are individually approved; never auto-writes `rejected`/`withdrawn`, so one rejected player can't cascade to reject the whole team.

**Two real bugs found and fixed during live verification, both confirmed via direct SQL against live data before any fix was attempted:**
1. **Captain identified by array position (`confirmedRoster[0]`) instead of by role.** Since captain/coach are chosen *after* upload (not assumed to be whichever row happened to load first), code that assumed position-0 was the captain could validate or submit the wrong person's data. Fixed by using an explicit role field instead of array position throughout.
2. **Realtime merge couldn't display nested rosters.** `useRealtimeTable`'s realtime handler hand-merged flat `postgres_changes` payloads (which never include embedded relations) into local state — for any query embedding a relation (like `teams` with nested `players`), an inserted/updated row's embedded data was structurally absent after a realtime event, not stale. This is a general bug, not specific to this one screen — anywhere `useRealtimeTable` is used with an embedded relation was affected. Fixed: the hook now detects an embedded `select` and does a full refetch on any change instead of hand-merging.

Live-verified end-to-end: multi-player roster submission (both entry methods), per-player approval, team status derivation, and `LivePage`'s public roster display — all confirmed working against real test data ("blahs" / Clark Kent + Lois Lane) by session's end.

**Migrations from this session, all manually applied and confirmed live:** 012 (player self-identity), 013 (volunteer self-identity), 014 (players_public view / PII fix), 015 (team/player roster status columns), 016 (team status derivation trigger).

### Still open, going into next session

- ~~**Identity work Phases 2-4** — captain phone OTP swap (replacing the still-dead `otp.request`/`otp.verify`/`otp_sessions` path), volunteer magic link, and trimming treasurer/volunteer_coord/referee/control_desk RLS to the matrix in `FEATURE_SPEC_entitlements_and_identity.md`. Phase 1 only.~~ **Superseded 07-26/27 — see the Identity Sprint session update below.** The captain OTP plan itself was replaced (QR + magic link, not phone OTP) and Phases 2–6 were built and applied live, though full verification is still outstanding.
- **Registration pause feature** (`FEATURE_SPEC_registration_pause.md`) — spec'd, not built.
- **Marketing page / `/your_events`** (`FEATURE_SPEC_routing_and_landing.md` Parts 1-3) — only Part 0 (publish-fix) is done; the rest is unbuilt.
- **Self-registration** (Path B in the roster spec) — deferred, confirmed additive/cheap to add later, not a foundation that needed building now.
- **`players` not in the realtime publication list** — the Registrations panel works around this with an explicit `refetchTeams()` call; any future view wanting live player-status updates will need the same workaround or a proper fix (adding `players` to the realtime publication).
- **Sequential-write risk on roster submission** (no transaction wrapper) — accepted for v1, noted as debt in `FEATURE_SPEC_team_roster_registration.md`, not verified against an actual mid-submit failure.
- **`is_event_admin_for()` is role-blind within scope** — a referee/control_desk admin could technically call `events.update()` directly despite the Publish tab being hidden from them via `ROLE_TABS`. Pre-existing, tracked, feeds into the still-pending identity Phase 4 RLS trim.

---

## 🔴 Session Update — 2026-07-23: Migration 010 had never actually run (found + fixed, live-verified)

**Sixth recurrence of "documented as done" ≠ actually done.** Before starting deployment work, this session re-verified the Pass 3 RLS claim from scratch — a deliberate choice given the project's track record, not routine. No service-role key or DB connection string exists in the Claude Code environment (only the anon key; no `supabase`/`psql` CLI access), so verification was done **behaviorally against live PostgREST** rather than by reading `pg_policies` — arguably a stronger test, since it exercises the same path a real anonymous client would.

**Finding:** migration 010 had never been applied to the live database at all. This is a different failure than what migration 011's changelog described (011 claimed 010 used the wrong policy name on the registrations DROP). Inspecting the 010 file directly showed it already has the *correct* registrations policy name — the file had been edited after the fact, and its own changelog comment didn't match its current content. The real gap: Part E of 010 (retiring 004/005/006) simply never executed against production.

**Before/after, tested with the anon key only:**

| Check | Before (tonight) | After (010 + 011 run via SQL Editor) |
|---|---|---|
| Anon insert, 10 wizard tables (004) | `23502` — RLS let the write through, only blocked by a missing-column error ❌ | `42501` — RLS blocks it ✅ |
| Anon read `events` (005) | 3 rows returned, all `status: draft` ❌ | 0 rows ✅ |
| Anon read `organizations` (005) | 2 rows returned ❌ | 0 rows ✅ |
| Anon read `registrations` (006, PII) | 0 rows ✅ (already fixed by hand on 2026-07-22) | 0 rows ✅ (unchanged) |
| Anon insert `registrations` (control — should stay open) | `23502` | `23502` (unchanged, as expected) |

**Fix applied:** 010 and 011 run manually via the Supabase SQL Editor dashboard, 2026-07-23 (still no CLI/service-role access from the Claude Code environment — this remains a manual step; see Known Issues).

**New finding surfaced by the fix, not yet resolved:** every event in the live DB is currently `status = 'draft'`. With the read policy now correctly enforced, an anonymous visit to any event's public page fails — confirmed live at `https://cocomo-events.netlify.app/e/17deda12-.../`, which threw a raw Postgrest error (`PGRST116 — Cannot coerce the result to a single JSON object`) instead of a friendly "not published yet" message. Root cause: `events.get()` uses `.single()`, and RLS silently filters the draft row to zero rows rather than erroring, so `.single()` throws. **There is currently no UI path to publish an event** — the test event (`17deda12-50f9-4c6b-941b-f1d75423d284`) was published manually via `UPDATE events SET status = 'published' WHERE id = ...` in the SQL Editor to unblock the deploy smoke test. Both the missing "publish" UI and the ungraceful error need fixing — see Known Issues.

---

## ✅ Deployment — Live (2026-07-23)

- **Host:** Netlify, Git-linked to `cocomo-jamie/Tournament_Builder` on `main` — CI/CD active, every push to `main` triggers an auto-deploy.
- **URL:** https://cocomo-events.netlify.app
- **`netlify.toml`** added — build command `npm run build`, publish dir `dist`, SPA redirect (`/* → /index.html`, status 200) so deep routes (`/live`, `/tv`, `/captain`, `/e/:eventId/admin`) don't 404 on direct load/refresh.
- **Real deploy bug caught and fixed:** the first deploy 404'd on every deep route because `netlify.toml` existed only as a local file and had never been committed — the Git-triggered build never saw it. Committed (`609f904`), Netlify auto-rebuilt, re-verified all routes return 200.
- **Env vars set** on the Netlify site: `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`, and `VITE_EVENT_ID` (this third one isn't in `.env.example` but is read by `App.jsx` for default routing — **note:** this var's entire purpose goes away once the marketing-page/`/your_events` architecture below is built, since root will no longer resolve to a single hardcoded event).
- **Supabase Auth URL Configuration** updated: `https://cocomo-events.netlify.app` added to both Site URL and Redirect URLs (required for invite/`AcceptInvite.jsx` links to work in production — this is a dashboard-only step, no CLI path).
- **Smoke test:** passed manually in-browser (not just `curl`) after the draft-event fix above — landing page renders live Supabase data, no console/CORS errors observed.
- **Known, expected gaps in prod right now (not bugs):** Player Portal OTP and Stripe both show graceful errors — Step 5 (serverless functions) is still not started.

---

## 🗺️ Architecture Decisions — 2026-07-23 (decided, none of this is built yet)

A significant restructuring of the app's public/authenticated surface was scoped out tonight. None of it is implemented — this is a design record for the next build session, not a status update.

**New route map:**
- **`/` (root)** — becomes a platform-level **marketing/signup page**. Explains what Tournament Builder does (tournament design, registrations, volunteer management, game day tools, TV display, sponsor management, digital gift management) and shows **static/dummy pricing** ($1000 CAD/1 event, $750/2, $500/3, or $20/mo + $100/event, "12 months full package for early adopters" framing). **No real checkout, no Stripe, no billing logic this pass** — pricing is display-only content; the actual payment/billing model is explicitly deferred to a dedicated future session (see Payments below). "Log in" from here goes to `/your_events`.
- **`/your_events`** (new, doesn't exist yet) — authenticated landing page. **Any admin role** (super_admin, org_admin, and event-scoped roles) lands here and sees the views/tools relevant to their scope. First-time users get an onboarding tour and are prompted to set up their first event; this needs a persisted "has completed onboarding" flag (per org or per admin_user — not yet decided which).
- **`/e/:eventId`** (existing event public pages) — **this is where `/`'s current behavior moves to.** `VITE_EVENT_ID`-based root routing goes away entirely.

**Hard constraint — do not accidentally gate the public event pages:** `/e/:eventId` must remain fully reachable with no auth, regardless of login state. The safe pattern: `/your_events` should **link out** to the same public `/e/:eventId` URL for a user's associated tournaments rather than rendering a separate authenticated view of the same data — one URL, two entry points, never a second gated copy. Explicit regression check for the next smoke test: log in, view `/e/:eventId`, log out, confirm the identical page still loads.

**Non-admin users (players, captains, referees, volunteers):** don't log in via `/your_events` in the admin sense. They follow a **direct link to their specific tournament's public page** as today, OR, if they have some persistent identity in the system, can authenticate via the marketing page to see a list of tournaments they're associated with, click through to the tournament's public page, and from there see whichever views they're authorized for (e.g. captain score entry) **plus the list of digital artifacts they're entitled to for that tournament.** This depends entirely on the identity model below, which is not yet designed.

**Branding — "same bones, different skin":** `/e/:eventId` pages already pull per-org branding (colors/logo/fonts) from Supabase per event. The marketing page and `/your_events` have no single org to brand around (a super_admin's `/your_events` may span many orgs with different brand configs), so they need their **own platform-level identity** — Tournament Builder's own colors/type — while sharing enough of the underlying component/layout system that moving from marketing → `/your_events` → `/e/:eventId` doesn't feel like leaving the app. Platform shell has its own skin; each event page layers its own skin on the same bones.

**Payments — explicitly punted, but the business question is now on record:**
- This pass: static/dummy pricing display only, as above.
- A real future session needs to resolve, **before schema/build work starts**, whether the platform:
  (a) lets each org connect their own payment processor (Stripe/PayPal/e-Transfer) so registration/donation money goes directly to the org, or
  (b) centralizes collection (Cocomo collects, disburses to orgs on a schedule, potentially with in-app upsell credit against an org's balance).
- **(b) is a materially bigger lift than (a).** Holding and disbursing other parties' funds is generally regulated (money transmission / payment facilitator rules, which vary by jurisdiction), which is why platforms doing this typically build on something like Stripe Connect rather than a custom balance/ledger system — and even Connect's standard model is a straight per-transaction split, not a hold-and-disburse-on-our-schedule wallet, which is what was described as the preferred direction tonight. There's also a charitable-solicitation angle (donation terminology/receipting) layered on top given this platform's fundraising use case.
- **This needs actual legal/accounting advice before a schema is built, not just an architecture decision made here.** Flagged plainly so it isn't quietly decided by default via whatever's easiest to code.

**Identity & entitlements — direction set, not designed:**
- Today, only `admin_users` roles have real login (Supabase Auth). Captains authenticate via phone OTP. Volunteers, non-captain players, and referees/officials have **no persistent identity or access mechanism** at all currently.
- Direction agreed: introduce a **persistent person/contact identity**, separate from per-event participation rows, that `players`, volunteers, and a new `officials` table would all reference — this is what would let "the same human across 3 tournaments and 2 orgs" actually be one entity instead of three disconnected rows, and is the real prerequisite for the "click a link, see all my tournaments" flow described above.
- Planned schema direction (not yet built): expand `players` to capture waiver/fee/role status per registration; formalize an approved-volunteers table (event-scoped or reusable per org); add a new `officials` table (referees, court judges, etc.) with a searchable-or-custom "type" field, distinct from `staff_contacts` (logistics) and distinct from the `admin_users.referee` role (dashboard access ≠ officiating role).
- **Still open:** the actual matching/auth mechanism for non-admin users (phone OTP extended to everyone? A per-person magic link? Something else?) and how matches are made/confirmed (phone vs. email, handling typos or a second email address, auto-link vs. confirm-before-linking). Not solved — flagged for the next design pass.

**Entitlements / CRUD matrix — explicitly deferred ("tomorrow problem"):** every admin role can currently create tournaments via the Wizard, and CRUD scope needs a real matrix (role × resource × operation × org/event scope) rather than the current ad hoc `ROLE_TABS`/RLS-function checks. The scope primitives already exist (`is_super_admin()`, `is_org_admin_for()`, `is_event_admin_for()`) — the matrix just needs to be designed and then mapped onto them. Not started.

---

## ⚠️ Session Update — 2026-07-26/27: Identity Sprint (QR check-in, magic link, RLS role trim) — built, hotfixed, not fully verified

Original captain-identity plan (native Supabase phone OTP via Twilio) was **replaced mid-design 2026-07-26**: the real requirement was fast desk check-in + persistent same-day scoring access, not proof of phone ownership, and Twilio cost real money to solve a harder problem than the one that existed. New design: a unique QR code per player encoding a Supabase magic link (synthetic `player_<id>@checkin.internal` address, link delivered via QR not email), exchanged for a real session on scan. Volunteer/official identity (real email magic link) unchanged from the original plan.

**Built and applied live (migrations 017–020, all confirmed applied via Supabase SQL Editor):**
- 017 — `players.checked_in` column.
- 018 — `link_player_auth_on_checkin()`, first-time `auth_user_id` linking for a captain's first QR scan (validates the caller's synthetic email matches the target `player_id` before linking, so one captain can't hijack another's row).
- 019 — **highest-risk migration in this project to date.** Narrows `is_event_admin_for()`'s previously role-blind branch to `role = 'admin'` only, then re-grants exactly what a new entitlements matrix specifies per role (treasurer, volunteer_coord, referee, control_desk) — this *removes* access that previously worked for these four roles across ~20 tables. Also closed a real gap found along the way: volunteers could previously self-approve their own application by calling Supabase directly (the self-update RLS policy had no column restriction) — fixed via `SECURITY DEFINER` RPCs (`update_own_volunteer_info`, `withdraw_own_volunteer_application`) instead of a blanket UPDATE policy. Captaincy transfer and team check-in/no-show also moved to RPCs for the same reason.
- 020 — **hotfix.** `link_volunteer_auth_by_email()` (013) and, found only via a full scan requested alongside the fix, `link_player_auth_by_phone()` (012) both called `max(uuid)`, which doesn't exist in Postgres — since both fire as `AFTER INSERT ON auth.users` triggers and any one throwing aborts the whole insert, **this blocked all new Supabase Auth signups of any kind**, not just the volunteer path that originally surfaced it. Fixed via a `count(*) = 1` guard + direct UPDATE, no aggregate.

**Also built:** `CheckIn.jsx` (magic-link landing/confirm page), a "Captain QR" tab in Game Day (staff-authenticated kiosk, not the originally-spec'd unattended shared-secret path — decided during the build that staffed-only is correct and the self-serve path should be removed rather than left unused), `VolunteerPortal.jsx` + `/e/:eventId/volunteer` magic-link flow, `control_desk`'s Game Day UI trimmed to read-only (Match Engine/Announcements/No-Show hidden, not just RLS-blocked) and treasurer/volunteer_coord's Build tab trimmed to their one relevant sub-tab each. Dead OTP code (`otp.request`/`otp.verify`, `PhoneEntry`/`OTPVerify`) removed.

**Deployment saga, 2026-07-27:** after the hotfix, QR generation still failed through a chain of separate issues found and fixed in sequence — all of Phases 2–6's work had sat **uncommitted locally** through the entire build/verify cycle (committed and pushed in one combined commit once found); local `npm run dev` testing was silently invalid for this feature since Netlify Functions don't run under plain Vite dev (needs `netlify dev`, not `npm run dev`, for local testing of any function-dependent feature going forward); and the deployed function crashed for missing server-side (non-`VITE_`-prefixed) env vars, which didn't exist on Netlify yet. Fixed by adding `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`, `SITE_URL` to Netlify. **Confirmed working after all of the above — QR generation succeeds live.**

**Still outstanding as of session close (2026-07-27) — the Phase 6 verification checklist itself was not completed, treat the whole sprint as built-not-verified until this is run:**
- Treasurer invite signup retry (the flow originally blocked by the hotfixed bug) — not yet re-confirmed post-fix.
- First-time captain check-in (real scan → session → confirm → dashboard hand-off) — not yet tested on a real device.
- First-time volunteer login (real email → magic link → self-service view) — not yet tested.
- Full per-role permission-boundary checklist (treasurer/volunteer_coord/referee/control_desk — exact expected CRUD boundaries listed in `CC_WORK_ORDER_identity.md`) — not yet run.
- Migration 019 (the highest-risk one) was applied before the rest of the session's problems surfaced — given how much else was found broken that day, don't assume it's fine; verify rather than skip.

**As of tonight (2026-07-31), none of the above appears to have been picked back up** — this session's testing focused on the billing/beneficiary work instead (see below). Worth deciding whether to close out this checklist before or after the billing/beneficiary fix work order, given it touches live auth for every non-super-admin role.

---

Between the 07-25 session and tonight, `CC_WORK_ORDER_billing_and_beneficiary.md` was executed against `FEATURE_SPEC_ledger_platform_fee_payments.md` and `FEATURE_SPEC_billing_and_beneficiary_commitments.md` — Phases 1–7 (beneficiaries + verification stub, commitment creation + publish gate, public commitment-notice surfaces, post-event fulfillment evidence, ledger, billing schema + manual-status UI). Migrations 021–027 written and manually applied live, same pattern as every other migration in this project.

**This session's end-to-end verification pass (`billing_beneficiary_e2e_checklist.md`) found this feature is substantially less complete than "Phases 1–7 built" implies.** Consistent with this project's repeated pattern (see the 2026-07-22 process note above) — code existing/compiling is not the same as verified-working, and once again the gap was only found via direct live testing, not by trusting the work order's own phase reports.

**Confirmed bugs:**
- **Phase 4 — public commitment notice does not render anywhere.** Tested on two independently-built events (different orgs, different beneficiaries, both with published commitments) — the "Cause" section is absent from the public event page in both cases. This rules out the original "maybe it's just an empty state on a pre-feature event" theory; it's a real rendering or data-fetch bug. The other three required surfaces (team registration, volunteer application, invite-acceptance) haven't been individually confirmed broken yet, but are suspect given the shared likely root cause (see Known Issues below on RLS scoping of the new tables).
- **Phase 6 — ledger has real functional gaps.** Expenses can be added/deleted but not edited. Expenses are tracked but **do not affect the running total at all** — only donations do. Donations can be created and read but not updated or deleted. Tab visibility and create/delete permission-gating are all confirmed correct.

**Fully blocked, not a bug per se:**
- **Phase 5 — post-event fulfillment evidence is entirely untestable.** There is no UI control anywhere, including super_admin, to advance an event's `status` past `registration_open` — the only transition ever given a UI control was the earlier publish-fix work (`draft → registration_open`). `registration_closed → game_day → completed → archived` have no admin control at all. This is not calendar/date-driven either — confirmed no scheduled-job infrastructure exists anywhere in this codebase. Phase 5's evidence-upload, review, confirm/dispute flow cannot be reached until this is built.

**Appears not to be deployed at all:**
- **Phase 7 — billing UI not found.** No BillingPanel anywhere in super_admin, no BillingSummaryCard on the org_admin Team tab, despite migrations 025/027 and the work order both describing this as built. Not yet reconciled whether the components don't exist in the codebase at all, or exist but aren't wired in/deployed.

**Still-open items from earlier in the same testing pass, unresolved:**
- Phase 2: the fake verification stub (format-check only, by design — see the original work order's decisions) marks a format-valid-but-fake registration number "Verified," which overstates the confidence the stub can actually back up. Needs a labeling decision, and separately a real manual-evidence verification path for org admins whose actual charity isn't in whatever registry data eventually exists — flagged as a new feature to design, not a quick patch.
- Phase 3: an org_admin can see beneficiary registration details on one event but not another, inconsistently — not yet root-caused. Also newly found: **no way to edit a saved beneficiary commitment**, even while still in `draft`.
- **New, separate from the phased feature:** creating a second event under an org that already has one throws an RLS violation (`42501`, `events` table). The actual RLS policy (`is_super_admin() OR is_org_admin_for(org_id)`) has no count/limit logic in it, so this doesn't look like an intended constraint — most likely explanation is an org_id mismatch somewhere in the wizard/session state, not yet confirmed.

**Plan going forward:** a phased fix work order (`CC_WORK_ORDER_billing_beneficiary_fixes.md`) now exists, covering all of the above across 8 phases — two diagnostic phases first (the RLS block, the Phase 4 render bug's root cause), since they're blocking further live testing, then the rest in no particular required order. Given tonight's findings, **each phase is being sent to CC, verified live, and only then greenlit into the next phase** — not batched — deliberately slower than earlier sessions' pattern, in direct response to how much of "Phases 1–7 built" turned out not to actually work once tested. Progress on this will be logged here phase-by-phase as it happens, not as one final "done" claim at the end.

---

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
│       ├── 010_rls_org_event_scoping.sql    # Pass 3: org/event-scoped RLS, retired 004/005/006 public policies
│       ├── 011_fix_registrations_public_read_drop.sql
│       ├── 012_player_self_identity.sql
│       ├── 013_volunteer_self_identity.sql
│       ├── 014_players_public_view.sql      # PII fix — players_public view
│       ├── 015_team_roster_status.sql
│       ├── 016_team_status_derivation.sql
│       ├── 017_players_checked_in.sql       # QR check-in identity sprint
│       ├── 018_link_player_auth_on_checkin.sql
│       ├── 019_trim_role_rls.sql            # HIGHEST RISK migration — narrows treasurer/volunteer_coord/referee/control_desk RLS
│       ├── 020_fix_volunteer_link_max_uuid.sql  # hotfix, blocked ALL new signups until applied
│       ├── 021_beneficiaries_and_commitments.sql
│       ├── 022–024_*.sql                    # ledger tables + fulfillment tracking (billing/beneficiary work)
│       ├── 025_billing_tables.sql
│       ├── 026_*.sql
│       └── 027_org_subscriptions_created_at.sql
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
6. **No UI path to publish an event.** Every event is created as `status = 'draft'` by the Wizard and nothing in the app flips it to `published`. Currently requires a manual `UPDATE events SET status = 'published' ...` in the Supabase SQL Editor. Found 2026-07-23 while smoke-testing deployment.
7. **Unpublished/nonexistent event IDs throw a raw Postgrest error to the browser** (`PGRST116 — Cannot coerce the result to a single JSON object`) instead of a friendly "not found / not published yet" page. Root cause: `events.get()` uses `.single()`, and RLS correctly returns zero rows for a draft event to an anonymous request, which `.single()` treats as an error rather than a valid "not visible" state.
8. **No service-role key or DB connection string available in the Claude Code environment.** Verifying `schema_migrations` state, and applying any future migration, currently requires manual action via the Supabase dashboard SQL Editor rather than CLI/psql from that environment. Deliberate tradeoff to keep a service-role key out of the coding agent's reach — revisit if migration work becomes frequent enough to be worth it.
9. **No persistent person identity across registrations.** A player/volunteer/official who participates in multiple events or orgs currently exists as multiple disconnected rows, not one entity — see "Architecture Decisions — 2026-07-23" above.
10. **No auth/access mechanism for non-admin users** beyond captain phone OTP — volunteers, non-captain players, and referees/officials have no way to authenticate or view "their" tournaments. Direction is set (see above) but not designed or built.
11. **No entitlements/CRUD matrix.** Every admin role currently has full CRUD within its RLS-defined scope; there's no product-defined restriction of e.g. treasurer-to-payments-only or referee-to-game-day-only (this overlaps with, and should probably be resolved together with, issue #1 above).
12. **No billing/payment schema of any kind.** ~~Marketing page pricing is display-only.~~ **Superseded 2026-07-31** — a billing schema now exists (migrations 025/027) but the corresponding UI (BillingPanel/BillingSummaryCard) is not confirmed present in the deployed app; see Session Update 2026-07-31. Centralized-vs-decentralized payment collection remains an open business/legal question (see Architecture Decisions above) not yet resolved.
13. **Public beneficiary commitment notice does not render.** Confirmed on two independent test events with published commitments — the public event page's Cause section, and (not yet individually confirmed but suspect) the team registration, volunteer application, and invite-acceptance surfaces. See Session Update 2026-07-31.
14. **No UI path to advance an event past `registration_open`.** Blocks all post-event fulfillment-evidence testing (Phase 5 of the billing/beneficiary work) and likely blocks any other future feature keyed off `registration_closed`/`game_day`/`completed`/`archived`. Not calendar-driven — no scheduled-job infra exists in this project.
15. **Ledger (Phase 6 of billing/beneficiary work) has functional gaps.** No expense edit; expenses don't affect the running total; no donation update/delete. See Session Update 2026-07-31.
16. **Beneficiary commitments can't be edited once created**, even while still `draft`. Minor, but worth fixing alongside the Phase 3 investigation below.
17. **Second event under an existing org throws an RLS `42501` on `events` insert.** The RLS policy itself has no count/limit logic, so this doesn't look intentional — likely an org_id mismatch somewhere in the wizard/session flow, not yet root-caused.

---

## Proposed Schedule (Next Session)

**Immediate priority, superseding everything below until it's resolved:** work through `CC_WORK_ORDER_billing_beneficiary_fixes.md` one phase at a time — send Phase 1 to CC, live-verify the result, only then greenlight Phase 2, and so on through Phase 8. Do not batch phases. This doc will be updated after each phase with a pass/fail, not just at the end.

**Competing priority, not yet scheduled — flagging rather than deciding:** the Identity Sprint's own Phase 6 verification checklist (07-26/27) was never completed either, and it touches live auth for every non-super-admin role including the highest-risk RLS migration in the project (019). Worth a deliberate decision on sequencing — finish that checklist before starting the billing/beneficiary fixes, interleave them, or explicitly accept the risk of leaving it unverified a while longer — rather than letting it default to "whichever gets mentioned last."

1. **Phase 1** — diagnose the second-event RLS block (org_id mismatch vs. real RLS bug).
2. **Phase 2** — root-cause and fix the Phase 4 public commitment-notice render bug (all four surfaces).
3. **Phase 3** — build an event status-advance control past `registration_open`, unblocking Phase 5 fulfillment-evidence testing.
4. **Phase 4** — reconcile whether the Phase 7 billing UI exists in the codebase at all, and if so why it isn't deployed.
5. **Phase 5** — ledger fixes: expense edit, expenses wired into the running total, donation update/delete.
6. **Phase 6** — allow editing a beneficiary commitment while still `draft`.
7. **Phase 7** — investigate the Phase 3 inconsistent beneficiary-visibility bug.
8. **Phase 8** — design decision only (not a build task): fake-verification labeling + whether a manual evidence-based verification path is wanted.

**Once the above is fully closed out and re-verified, resume the pre-existing backlog** (unchanged from the 07-25 session, reordered slightly):

1. **Marketing page (`/`) + `/your_events` build-out** — per "Architecture Decisions — 2026-07-23" above. Suggest sequencing as: (a) marketing page with static pricing content, (b) `/your_events` for admin roles only first (reuses existing role data), (c) branding system split (platform skin vs. event skin), (d) non-admin identity/link mechanism last, since it's the least-defined piece and has real open design questions.
2. **Entitlements/CRUD matrix** — design doc first (role × resource × operation × scope), then map onto existing RLS scope functions. Still deferred, but worth doing before the identity work in step 1(d) makes the permission surface bigger — and now also relevant to the billing/beneficiary RLS gaps found tonight.
3. **Step 5 — Serverless functions**: Twilio (OTP SMS) and Stripe (payments) — needed for Player Portal captain login and real payment processing to actually function. **Note:** "Stripe" here is event-level payments only (a team paying its entry fee) — this is a different, smaller thing than the org-level SaaS billing question raised in Architecture Decisions, which needs a legal/business decision first and is not in scope for this step. Also distinct from the billing/beneficiary work's Phase 7, which is Cocomo's own subscription revenue (currently hand-set, no real Stripe integration either).
4. **Step 6 — Artifact generation engine**: real schedule/run-sheet/resource-directory generation for the Publish tab.

Steps 3–4 are bigger lifts; reserved Fable 5 credits ($140) may be worth spending there per earlier discussion, once the platform-shell work (item 1) has a stable foundation to build artifact generation against.

---

## Service Layer (src/services/api.js)

Domains: `events`, `registrations` (+ `setPaymentReceived`/`setApproved`), `teams`, `players`, `matches`, `pools`, `brackets`, `sponsors`, `volunteers`, `giftBasket`, `localServices`, `artifacts`, `announcements`, `activityLog`, `admin` (auth/invites), `beneficiaries`, `billing`. (`otp` domain removed 07-26 — dead code from the pre-QR captain-identity design, superseded by the QR/magic-link check-in flow; see Identity Sprint session update.)

## Hooks (src/hooks/)

- `useRealtime.js` — `useRealtimeTable` (generic, now with `refetch()`), `useRealtimeMatches`, `useRealtimeStandings`, `useRealtimeTeams`, `useRealtimeAreas`, `useRealtimeAnnouncements`, `useRealtimeRegistrations`, `useWatchMatch` — all channel names now include a per-instance random suffix to prevent collision when the same table is subscribed to twice on one page.
- `useEventConfig.js` — fetches + transforms event config for `EventContext`
- `useScreenLock.js` — FIFO lock queue with heartbeat presence + idle timeout

## Database (supabase/schema.sql + 27 migrations)

22 core tables from the original schema + `activity_log`, `invites`, `admin_lock_queue`, plus `beneficiaries`, `event_beneficiary_commitments`, `billing_plans`, `org_subscriptions`, `event_billing`, and the ledger tables (`transactions`/`fan_donations`/`expenses`) from the billing/beneficiary work. RLS org/event-scoped per admin since migration 010, further narrowed per-role for treasurer/volunteer_coord/referee/control_desk by migration 019 (see Identity Sprint session update — verification still incomplete). Realtime enabled on `matches`, `pool_standings`, `playing_areas`, `teams`, `announcements`, `playing_area_queue`, `admin_lock_queue`. Key triggers/RPCs: reconciliation code generation (`SECURITY DEFINER`, atomic), invite-signup → admin_users auto-creation, pool standings recomputation, fundraising totals, volunteer role fill counts, QR check-in auth linking (migration 018), captaincy transfer/team check-in RPCs (migration 019).
