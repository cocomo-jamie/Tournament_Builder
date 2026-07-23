# Tournament Builder Platform — Project Status & Handoff

**Last updated:** 2026-07-23 (end of session — deployed to Netlify + live-verified; migration 010 found to have never actually applied, fixed live tonight; major architecture decisions made for marketing page / `/your_events` / identity model — not yet built, see bottom sections)

**Live URL:** https://cocomo-events.netlify.app (Git-linked to `main`, CI/CD active — every push auto-deploys)

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
| **Pass 3: RLS tightening** | ✅ Actually done as of 2026-07-23 | Migration 010 was marked done on 2026-07-22 but **had never been applied to the live DB** — 004/005 were still wide open. Found via live behavioral testing 2026-07-23, fixed by running 010+011 in the SQL Editor, re-verified clean. See "Session Update — 2026-07-23" below. |
| **Pass 3b: Wizard org-scoping fast-follow** | ✅ Done | `createTournament.js`/`TournamentWizard.jsx`/`App.jsx` — see below |
| **Pass 3c: Real ProtectedRoute + admin dashboard gating** | ✅ Done | `ProtectedRoute.jsx` created; `/e/:eventId/admin` now actually gated — see below |
| **Pass 4: Admin UI gaps (super-admin, Team tab, identity, logout)** | ✅ Done, live-verified | `SuperAdminDashboard.jsx` + `/super-admin` route, Team tab + role→tab gating, header identity + logout — click-through-verified 2026-07-22, see below |
| **Migration 010 fix (registrations public-read PII exposure)** | ✅ Fixed live + migration 011 | 010's DROP POLICY used the wrong policy name; public PII was readable with the anon key until tonight's manual fix — see below |
| 5: Serverless functions (OTP + Stripe) | Not started | Player Portal OTP shows graceful error; no backend exists |
| 6: Artifact generation engine | Not started | Publish tab has hardcoded placeholder data |
| 7: Deployment / hosting | ✅ Done, live-verified | Netlify, Git-linked CI/CD → https://cocomo-events.netlify.app. See "Deployment — Live" below. |
| 8: Style extraction | Not started | Lower priority enhancement |

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
6. **No UI path to publish an event.** Every event is created as `status = 'draft'` by the Wizard and nothing in the app flips it to `published`. Currently requires a manual `UPDATE events SET status = 'published' ...` in the Supabase SQL Editor. Found 2026-07-23 while smoke-testing deployment.
7. **Unpublished/nonexistent event IDs throw a raw Postgrest error to the browser** (`PGRST116 — Cannot coerce the result to a single JSON object`) instead of a friendly "not found / not published yet" page. Root cause: `events.get()` uses `.single()`, and RLS correctly returns zero rows for a draft event to an anonymous request, which `.single()` treats as an error rather than a valid "not visible" state.
8. **No service-role key or DB connection string available in the Claude Code environment.** Verifying `schema_migrations` state, and applying any future migration, currently requires manual action via the Supabase dashboard SQL Editor rather than CLI/psql from that environment. Deliberate tradeoff to keep a service-role key out of the coding agent's reach — revisit if migration work becomes frequent enough to be worth it.
9. **No persistent person identity across registrations.** A player/volunteer/official who participates in multiple events or orgs currently exists as multiple disconnected rows, not one entity — see "Architecture Decisions — 2026-07-23" above.
10. **No auth/access mechanism for non-admin users** beyond captain phone OTP — volunteers, non-captain players, and referees/officials have no way to authenticate or view "their" tournaments. Direction is set (see above) but not designed or built.
11. **No entitlements/CRUD matrix.** Every admin role currently has full CRUD within its RLS-defined scope; there's no product-defined restriction of e.g. treasurer-to-payments-only or referee-to-game-day-only (this overlaps with, and should probably be resolved together with, issue #1 above).
12. **No billing/payment schema of any kind.** Marketing page pricing is display-only. Centralized-vs-decentralized payment collection is an open business/legal question (see Architecture Decisions above) that needs to be resolved before any billing schema work starts.

---

## Proposed Schedule (Next Session)

Deployment (formerly item 1 here) is done — see "Deployment — Live" above. Priorities reordered given tonight's architecture decisions:

1. **Publish-event UI + graceful not-found/not-published handling** — small, unblocks real usage; two of tonight's Known Issues (#6, #7) and worth fixing before anything else since it affects every other test going forward.
2. **Marketing page (`/`) + `/your_events` build-out** — per "Architecture Decisions — 2026-07-23" above. Suggest sequencing as: (a) marketing page with static pricing content, (b) `/your_events` for admin roles only first (reuses existing role data), (c) branding system split (platform skin vs. event skin), (d) non-admin identity/link mechanism last, since it's the least-defined piece and has real open design questions.
3. **Entitlements/CRUD matrix** — design doc first (role × resource × operation × scope), then map onto existing RLS scope functions. Explicitly deferred by the user as a "tomorrow problem," not urgent, but should land before the identity work in step 2(d) makes the permission surface bigger.
4. **Step 5 — Serverless functions**: Twilio (OTP SMS) and Stripe (payments) — needed for Player Portal captain login and real payment processing to actually function. **Note:** "Stripe" here is event-level payments only (a team paying its entry fee) — this is a different, smaller thing than the org-level SaaS billing question raised in Architecture Decisions, which needs a legal/business decision first and is not in scope for this step.
5. **Step 6 — Artifact generation engine**: real schedule/run-sheet/resource-directory generation for the Publish tab.

Steps 4–5 are bigger lifts; reserved Fable 5 credits ($140) may be worth spending there per earlier discussion, once the platform-shell work (item 2) has a stable foundation to build artifact generation against.

---

## Service Layer (src/services/api.js)

Domains: `events`, `registrations` (+ `setPaymentReceived`/`setApproved`), `teams`, `players`, `matches`, `pools`, `brackets`, `sponsors`, `volunteers`, `giftBasket`, `localServices`, `artifacts`, `announcements`, `activityLog`, `otp`, `admin` (auth/invites).

## Hooks (src/hooks/)

- `useRealtime.js` — `useRealtimeTable` (generic, now with `refetch()`), `useRealtimeMatches`, `useRealtimeStandings`, `useRealtimeTeams`, `useRealtimeAreas`, `useRealtimeAnnouncements`, `useRealtimeRegistrations`, `useWatchMatch` — all channel names now include a per-instance random suffix to prevent collision when the same table is subscribed to twice on one page.
- `useEventConfig.js` — fetches + transforms event config for `EventContext`
- `useScreenLock.js` — FIFO lock queue with heartbeat presence + idle timeout

## Database (supabase/schema.sql + 10 migrations)

22 core tables + `activity_log`, `invites`, `admin_lock_queue`. RLS now org/event-scoped per admin (migration 010 — see above; per-role table restrictions within a scope remain a flagged future item), realtime enabled on `matches`, `pool_standings`, `playing_areas`, `teams`, `announcements`, `playing_area_queue`, `admin_lock_queue`. Key triggers: reconciliation code generation (now `SECURITY DEFINER`, atomic), invite-signup → admin_users auto-creation (`SECURITY DEFINER`), pool standings recomputation, fundraising totals, volunteer role fill counts.
