# CC Work Order — Identity: QR Check-in, Magic Link, Self-Scoped RLS, Role Trim

Reference: `FEATURE_SPEC_entitlements_and_identity.md` (revised 2026-07-26 — phone OTP replaced with QR + Supabase magic link). This is still a bigger, riskier piece of work than the publish-fix — it touches live auth flows and narrows existing admin access. Built and reported in phases, not one pass. **Stop and report after each phase — do not proceed to the next phase in the same session without a go-ahead.** No self-verification at any point; no `PROJECT_STATUS.md` edits until told to.

**Phase 1 (below) is already done and live** — migrations 012/013 applied, confirmed in `PROJECT_STATUS.md`. Included here only for reference/completeness.

---

## Phase 1 — Migrations ✅ DONE (2026-07-25, migrations 012/013)

`players.auth_user_id`, `volunteer_applications.auth_user_id`, self-scoped RLS, phone/email linking triggers. See `PROJECT_STATUS.md` for details. No action needed.

**Note carried forward:** the phone-match linking trigger on `players` (migration 012) is no longer the relevant path for captain login under the QR design — `auth_user_id` gets set directly by the magic-link exchange instead. Harmless to leave as-is; flag for cleanup later, not blocking.

---

## Phase 1b — New migration: `players.checked_in` ✅ DONE (2026-07-26, migration 017, applied clean)

`017_players_checked_in.sql` — adds `players.checked_in` (boolean, `NOT NULL`, default `false`). Applied live via Supabase SQL Editor, confirmed clean.

```sql
ALTER TABLE players ADD COLUMN IF NOT EXISTS checked_in BOOLEAN NOT NULL DEFAULT false;
COMMENT ON COLUMN players.checked_in IS 'Set true when this player (captain) completes the QR/magic-link check-in flow (Phase 3). Not linked to auth_user_id presence — a player can be linked without being checked in for a given event.';
```

---

## Phase 1b — New migration: `players.checked_in` — ORIGINAL SPEC, SUPERSEDED BY ABOVE

1. Write (don't apply) a migration adding `players.checked_in` — boolean, default `false`.
2. **Do not apply to the live DB.** Same manual-application pattern as every other migration in this project — commit the file, project owner applies via Supabase SQL Editor.
3. Report back: migration file contents.

**Stop here. Wait for confirmation it's applied before Phase 2.**

---

## Phase 2 — QR/magic-link generation function ✅ DONE (2026-07-26)

`netlify/functions/generate-login-qr.js` built, both gates implemented as specified. `netlify.toml` updated with `functions = "netlify/functions"` (first serverless function in this repo).

**Follow-up fix, small, do before Phase 3:** add `org_admin` to the admin-path role check (`ADMIN_ROLES` array) — currently only `admin`/`referee`/`control_desk`. Decided 2026-07-26: `org_admin` should have the same access as the more specific roles within their org's events.

**New env vars required on Netlify** (server-side only, not `VITE_`-prefixed, not in committed `.env`): `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`, `KIOSK_SHARED_SECRET`. Project owner to set these in Netlify's dashboard before Phase 3 can be tested live.

**Blocker flagged for Phase 3, must be solved there, not skipped:** `generate-login-qr` only generates the link — it doesn't set `players.auth_user_id`. Migration 012's self-scoped UPDATE policy requires `auth_user_id = auth.uid()` to already match, so first-time linking can't go through that policy (`auth_user_id` starts `NULL`). Phase 3 must add a `SECURITY DEFINER` linking function — same pattern as `handle_invite_signup` and the existing phone/email linking triggers — called once by the landing page immediately after the magic-link session is established, to set `auth_user_id` for that player. Do not use an RLS policy exception for this; use the SECURITY DEFINER function pattern already established in this codebase.

---

## Phase 2 — QR/magic-link generation function (CC, after Phase 1b is live) — ORIGINAL SPEC, SUPERSEDED BY ABOVE

1. Build a Netlify function (e.g. `netlify/functions/generate-login-qr.js`) that:
   - Accepts a `player_id` and a `caller_type` (`kiosk` or `admin`) — or equivalent way to distinguish which gate applies.
   - Uses the **service role key** (never the anon key) to call `supabase.auth.admin.generateLink({ type: 'magiclink', email })`, where `email` is a synthetic identifier deterministically derived from the player row (e.g. `player_<player_id>@checkin.internal`) — not a real inbox, never sent anywhere.
   - Returns the generated link/token for the client to encode as a QR (client-side QR rendering library — check what's already available in the project before adding a new dependency).
2. **Auth boundary — decided 2026-07-26, build exactly this, do not re-derive:**
   - **Kiosk path (unattended/self-serve, no staff login assumed):** gated by a static shared secret sent from the kiosk page with the request (env var, checked server-side — not shown to the end user, not real security, just anti-drive-by). Before issuing a link, **the function must check `players.checked_in`** — if already `true`, refuse (return an error the kiosk UI surfaces as "already checked in, see staff"). This caps the kiosk path to exactly one issuance per player, ever, for that event.
   - **Admin path (authenticated):** requires a real admin/referee/control_desk Supabase session — standard RLS-style role check, no shared secret needed. This path has **no** `checked_in` restriction — it's the only way to re-issue a session for a player who's already checked in (covers both "lost phone, let me back in" and Phase 4's captaincy transfer — same underlying action, different `player_id`).
   - Rationale (for context, not something to re-litigate): self-scoped RLS limits a misused session to that one player's own PII, but this project has twice shipped RLS that granted broader access than intended, so capping free issuance and funneling repeats through an authenticated action is cheap insurance, not a response to a known current hole.
3. Report back, confirming both gates are implemented as specified and that the `checked_in` check is in the kiosk path only, not the admin path.

**Stop here.**

---

## Phase 3 — Check-in landing page + kiosk UI (CC, after Phase 2's follow-up fix is in and env vars are set on Netlify)

1. **First-time `auth_user_id` linking (blocker carried from Phase 2, solve this first):** write a migration adding a `SECURITY DEFINER` function (e.g. `link_player_auth_on_checkin(player_id uuid)`) that sets `players.auth_user_id = auth.uid()` for that row, bypassing RLS deliberately — same pattern as `handle_invite_signup` and the existing linking triggers. Do not use an RLS policy exception. This migration needs manual application via the Supabase SQL Editor same as every other one — do not apply it yourself, report the file contents.
2. Build the landing page the QR link opens: exchanges the magic-link token for a Supabase session, calls the linking function from step 1, then shows "Checking in for [event name] as [captain name] of [team name]?" pulling those values from the now-authenticated player's row.
3. On confirm: write `players.checked_in = true`.
4. Build the staff-facing kiosk UI: search/select a team from the roster, display that captain's QR (calls Phase 2's function).
5. Report back, no self-verification of the actual scan-to-session flow — that needs a real device and is a manual test.

**Stop here.**

---

## Phase 3 — Check-in landing page + kiosk UI ✅ DONE (2026-07-26)

1. Migration `018_link_player_auth_on_checkin.sql` — `SECURITY DEFINER` function `link_player_auth_on_checkin(player_id)`. Validates the caller's own `auth.users.email` matches the synthetic email derived from the passed `player_id` before linking — prevents an authenticated captain from passing a different `player_id` to hijack another player's row. **Applied to live DB 2026-07-26, confirmed clean.**
2. `src/views/CheckIn.jsx`, new route `/e/:eventId/checkin` — picks up the magic-link session, calls the linking RPC, loads the player's own row via self-scoped RLS, shows confirm screen, sets `checked_in = true` on confirm. Handles already-checked-in and invalid-link states.
3. Staff kiosk UI built as a "Captain QR" tab inside `AdminDashboard.jsx`'s Game Day context (visible to admin/referee/control_desk/org/super admin — same visibility as Game Day generally). Uses the `caller_type: "admin"` path with the admin's own session token, **not** the kiosk shared-secret path (that path is built but unused by any client code).
4. `generate-login-qr.js` updated to pass `redirectTo` so the magic link lands on the right event's `/checkin` page. Needs `SITE_URL` env var (falls back to Netlify's built-in URL).
5. Dead-code cleanup folded in: removed `otp` from `src/services/api.js`, removed `PhoneEntry`/`OTPVerify` from `PlayerPortal.jsx`.

`npm run build` clean. No self-verification of the actual scan-to-session flow (needs a real device, per instructions).

**Three items flagged by CC, resolved 2026-07-26 — see Phase 3b:**
- `org_admin` still missing from `ADMIN_ROLES` in `generate-login-qr.js` (the Phase 2 follow-up fix wasn't sent before Phase 3 started) — the Captain QR tab is visible to org_admin/super_admin but they'd get a 403 generating a QR.
- Kiosk ended up staff-authenticated (via the admin path), not the originally-spec'd unattended self-serve shared-secret path. **Decided: staffed is correct, self-serve is not needed** — the shared-secret path should be removed, not left as unused reserved infrastructure.
- Check-in has no hand-off into `PlayerPortal.jsx`'s scoring dashboard — `CheckIn.jsx` is a dead-end after confirm. **Decided: check-in should hand off straight into the scoring dashboard.**

---

## Phase 3b — Follow-up: role fix, drop self-serve kiosk path, wire check-in → dashboard (CC, before Phase 4)

1. **Add `org_admin` to `ADMIN_ROLES`** in `generate-login-qr.js`, alongside `admin`/`referee`/`control_desk`. (`super_admin` — confirm whether that role exists as a distinct value in `admin_users.role` or whether `org_admin` already covers it; check `schema.sql`/existing role-check code elsewhere in the codebase rather than assuming.)
2. **Remove the kiosk shared-secret path entirely** — `KIOSK_SHARED_SECRET` env var, the header-check branch in `generate-login-qr.js`, and the associated `checked_in`-refusal gate that branch relied on. The function should only support the authenticated-staff call path going forward. Since `checked_in` is no longer a hard gate under the staffed-only design, keep it informational only — the Captain QR tab UI should surface each player's `checked_in` status (e.g. a badge/label) so staff can see who's already in, but issuing a new QR for an already-checked-in player should be allowed (covers lost-phone re-issuance and captaincy transfer, both already staff-authenticated actions).
3. **Wire check-in straight into the scoring dashboard:** after `CheckIn.jsx`'s confirm step sets `checked_in = true`, route directly into `PlayerPortal.jsx`'s `CaptainDashboard` component using the now-live session, rather than leaving the user on a dead-end confirmation screen. This also means `PlayerPortal.jsx`'s login screen (currently a placeholder "scan your QR" message per Phase 3's report) needs to actually check for an existing valid session on load and route straight to `CaptainDashboard` if one exists — covering the case where a captain closes the check-in tab and reopens the site later the same day.
4. Report back, specifically confirming: does an already-checked-in captain who scans their QR again land correctly in the dashboard (not stuck back on the confirm screen), and does a captain with no session at all get a sensible "not checked in yet" state rather than an error.

**Stop here.**

---

## Phase 3b — Follow-up: role fix, drop self-serve kiosk path, wire check-in → dashboard ✅ DONE (2026-07-26)

1. `ADMIN_ROLES` now includes all five staff roles: `admin`, `referee`, `control_desk`, `org_admin`, `super_admin` — confirmed `super_admin` is a genuinely distinct role string (not folded into `org_admin`) by checking migration 007's `admin_users.role` comment and existing `adminUser.role === "super_admin"` checks in `App.jsx`.
2. Kiosk shared-secret path fully removed from `generate-login-qr.js` — one path only now, authenticated staff, role-checked. `checked_in` no longer read by the function; purely informational in the Captain QR tab UI (badge per player, button relabels to "Re-issue QR" for already-checked-in captains — works identically to first issuance).
3. Check-in → dashboard wiring done: `CheckIn.jsx` auto-navigates to `/e/:eventId/captain` (~1.2s, with a brief transition message) after either a fresh confirm or a re-scan of an already-checked-in QR. `PlayerPortal.jsx` now checks for an existing session on mount — session found → loads straight into `CaptainDashboard` via new `players.getCaptainSessionData()`; no session → `NoSession` state, no error. `onLogout` now actually calls `supabase.auth.signOut()` (previously left the Supabase session alive after "logout").

`npm run build` clean. No self-verification of the scan-to-session flow on a real device.

**Open gap, carried forward, not blocking:** `getCaptainSessionData()` can't populate teammates' shirt/dietary fields — `players_public` (the view self-scoped roster reads go through) only exposes `id`/`team_id`/`is_captain`/`full_name`, so a captain has no RLS grant to see that PII for anyone but themselves. Same limitation the old OTP path had. Not asked of this phase; needs a decision (extend `players_public`, or a narrower self-team-scoped view/policy) before it matters — likely whenever the scoring dashboard actually needs to display roster details beyond names.

---

## Phase 4 — Printed QR fallback + captaincy transfer UI (CC, after Phase 3b is live-verified)

1. Batch-generation path: given an event, generate/export QR codes for every captain ahead of time (printable sheet or per-team output — confirm format with project owner before building).
2. Admin/referee UI action: flip `players.is_captain` from outgoing to incoming player on a team (single team-scoped update, RLS-gated to admin/referee/control_desk), then immediately call Phase 2's function for the new captain's `player_id` and display the resulting QR on the admin/referee's own screen.
3. Report back.

**Stop here.**

---

## Phase 4 — Printed QR fallback + captaincy transfer UI ✅ DONE (2026-07-26)

Format confirmed as "both" (printable sheet + per-captain download) before building, per the work order's instruction.

1. **Batch generation** — `CaptainQRBatchPanel` in the Captain QR tab. "Generate All (N)" iterates every team with a captain, calls `generate-login-qr` sequentially (avoids hammering Supabase's auth-admin API concurrently) with a live progress label; renders each as a card (QR + captain + team + `checked_in` badge). "Print Sheet" uses a `@media print` rule to hide everything but the card grid. Each card also has an individual PNG download link. Failed individual generations surface inline per-card, don't abort the batch.
2. **Captaincy transfer UI** — added to the single-team panel: selecting a team lists non-captain roster under "Transfer Captaincy"; clicking a teammate calls `players.transferCaptaincy(teamId, outgoingId, incomingId)` (two team-scoped updates), then immediately generates and displays the new captain's QR in the same panel. QR ownership tracked in explicit state (`qrFor`) rather than the reactive team lookup, to avoid a brief mismatched-name flash while the realtime subscription catches up.

`npm run build` clean.

**Open item, correctly deferred, not a gap to fix now:** the work order asked for transfer to be "RLS-gated to admin/referee/control_desk," but migration 010's `"Admin full players"` policy grants full CRUD to *any* event-scoped `admin_users` row regardless of role (treasurer/volunteer_coord included) — a known, explicitly-noted-as-future-work design point in that migration. CC correctly did not build narrower RLS here, since that's Phase 6's explicit mandate ("do this last, most caution") and pre-empting it here would fragment the role-trim work across phases. Today's actual protection is UI-level only: `ROLE_TABS` already hides Game Day (and therefore this action) from treasurer/volunteer_coord — but nothing yet stops a treasurer's token from calling `transferCaptaincy` directly at the database level. This is exactly the gap Phase 6 exists to close.

---

## Phase 5 — Volunteer magic link (CC, independent of Phases 2-4, only needs Phase 1's migration — already live)

1. Build the volunteer-facing login flow using `supabase.auth.signInWithOtp({ email })` — this one *does* send a real email, unlike the captain QR flow.
2. `auth_user_id` linking uses the existing trigger-based approach from migration 013 (email-match, `SECURITY DEFINER`) — no new decision needed.
3. Wire the volunteer's authenticated view to read/update their own `volunteer_applications` row via the self-scoped RLS from Phase 1.
4. Report back, no self-verification of the actual email flow.

**Stop here.**

---

## Phase 5 — Volunteer magic link ✅ DONE (2026-07-26)

1. `src/views/VolunteerPortal.jsx`, new route `/e/:eventId/volunteer` — email entry → `supabase.auth.signInWithOtp({ email })` via new `volunteers.requestLogin(email, eventId)`, `emailRedirectTo` pointing back at the same route. Sends a real email (unlike the captain QR flow).
2. Linking — no new code needed; migration 013's existing `link_volunteer_auth_by_email()` trigger handles it automatically once the volunteer clicks the emailed link. Portal distinguishes "not logged in yet" (show login screen) from "logged in but no matching application" (`notFound` state) rather than conflating them.
3. Self-service view (status, role, `checked_in`; editable phone/experience via `volunteers.updateSelf()`; "Withdraw Application" sets `status = 'withdrawn'`). Handles the magic-link return via `onAuthStateChange` (session can arrive async after redirect), not just on-mount `getSession()`.

`npm run build` clean. No self-verification of the email flow.

**🔴 Flagged gap, more serious than Phases 3/4's open items — needs a decision, not just a note:** migration 013's `"Self update own volunteer application"` RLS policy has no column restriction. A logged-in volunteer's own session can `UPDATE` *any* column on their own row directly — including `status`. That means a volunteer could set their own application to `status = 'approved'` by calling the Supabase client directly (bypassing the UI entirely, which only exposes phone/experience/withdraw). CC added an application-layer whitelist at the `updateSelf()` call site, but that's not a real boundary — it only stops the built UI from doing it, not a motivated user with browser devtools.

This is a step further than the players' self-update policy (which has the same shape of gap, but a captain self-editing their own player row is lower-stakes than a volunteer self-approving their own application). Worth deciding: fix this specifically now with a narrow follow-up (RLS `WITH CHECK` restricting which columns/values a self-update can touch, or a `SECURITY DEFINER` function for the two legitimate self-actions instead of a blanket UPDATE policy), or fold it into Phase 6's role-trim pass since it's the same class of "RLS grants more than the UI implies" problem Phase 6 already exists to fix.

---

## Phase 6 — Trim existing role RLS ✅ DONE (2026-07-26), pending live application + verification

Migration `019_trim_role_rls.sql` — not yet applied. Core mechanism: `is_event_admin_for()` (migration 010) had a branch matching *any* event-scoped `admin_users` row regardless of role, which is what gave treasurer/volunteer_coord/referee/control_desk full CRUD everywhere via the ~20 "Admin full X" policies that call it. Narrowed that branch to `role = 'admin'` only (super_admin/org_admin unaffected, separate branches), then re-granted exactly what the matrix specifies as additive per-resource policies.

**Phase 4/5 items addressed:**
1. `transferCaptaincy` no longer relies on a raw `players` UPDATE grant — now `transfer_captaincy(team_id, outgoing_id, incoming_id)` RPC, `SECURITY DEFINER`, gated to `admin` OR `referee`/`control_desk`, does both `is_captain` flips atomically.
2. Volunteer self-approval gap — blanket self-update policy dropped, replaced with `update_own_volunteer_info()` and `withdraw_own_volunteer_application()`, both `SECURITY DEFINER`, each internally checking `auth_user_id = auth.uid()` and touching only whitelisted columns. Same RPC pattern applied to `team_set_checked_in`/`team_mark_eliminated` for the same reason (RLS `WITH CHECK` can't reliably diff OLD vs NEW in Postgres) — `api.js` call sites unchanged, no AdminDashboard.jsx changes needed for this part. Side effect: `checked_in_by` was always `null` in production before this (the old param was never actually passed) — now fixed via `auth.uid()` server-side.

**Judgment call, accepted as correct:** treasurer's existing player-approval batch action (`RegistrationsPanel`) treated as part of "Registrations & Payments" (Full) rather than "Teams & Players" (Read) — added narrow UPDATE-only grants for player approval status + `activity_log` inserts, to avoid breaking a currently-working core treasurer duty. Matrix's literal text didn't cover this case; this was the right call to avoid an obvious regression.

**Two decisions made 2026-07-26, closing the flagged ambiguities — see Phase 6b for the resulting UI work:**
- `control_desk`'s Game Day access: **Read-only stands, per the matrix.** The UI currently shows control_desk the same full toolset as referee — those buttons need to be hidden, not just left to fail silently against RLS.
- treasurer/volunteer_coord's Fundraising & Rules write access: **dropped, Read-only stands, per the matrix.** Same issue — the save UI needs to reflect this, not silently fail.

---

## 🔴 HOTFIX ✅ DONE (2026-07-27) — CC's half, pending live application + retest

`020_fix_volunteer_link_max_uuid.sql` — not yet applied. Fixes **two** functions via `CREATE OR REPLACE FUNCTION` (existing triggers already point at these names, no trigger recreation needed):

1. `link_volunteer_auth_by_email()` (migration 013) — the originally reported bug.
2. `link_player_auth_by_phone()` (migration 012) — **found during the scan, not in the original report.** Identical bug: `max(id)` on `players.id` (UUID), same `AFTER INSERT ON auth.users` trigger pattern. Since Postgres runs every matching `AFTER INSERT ON auth.users` trigger within the same statement, and any one throwing aborts the whole insert, **this bug alone would also have broken every new signup** — meaning Phase 3's first-time captain check-in was blocked by *both* bugs simultaneously, not just the volunteer one. Fixed in the same migration.

Both now use the `count(*) = 1` guard + direct `UPDATE ... WHERE` pattern, no `MAX()`/captured-id variable.

**Full scan results (migrations 007–019, every `SECURITY DEFINER` function, full-file grep for `max(`/`min(`):** only these two functions had the bug. Everything else (`is_super_admin`, `is_org_admin_for`, `is_event_admin_for`, `generate_recon_code`, `handle_invite_signup`, `link_player_auth_on_checkin`, and all of migration 019's new functions) confirmed clean — none use an aggregate on a `uuid` column.

No client-side code touched — pure SQL migration, no `npm run build` needed for this one.

**Project owner — next steps:**
1. Apply migration `020_fix_volunteer_link_max_uuid.sql` via Supabase SQL Editor.
2. Retry the treasurer invite signup that originally surfaced this.
3. Re-test first-time captain check-in and first-time volunteer login specifically — both were previously unverified and were, in fact, broken by these bugs. Continue the rest of the Phase 6 verification checklist afterward.

---



## Phase 6b — UI cleanup after RLS trim, and live verification (CC + project owner)

**CC — ✅ DONE (2026-07-26):**
1. `control_desk` Game Day hiding via new `isControlDesk` check in `GameDayContext` — hidden entirely (not disabled): the whole Match Engine card, the whole Announcements card, and **No-Show** (in Team Check-In) — added beyond the original list since it calls the same `matchesApi.awardBye()` path as Award Bye and would've silently failed too. Team Check-In button and Captain QR tab (captaincy transfer) untouched — both RPC-gated, unaffected. Referee unchanged.
2. Fundraising/Rules hiding for treasurer/volunteer_coord — **whole sub-tab hidden, not read-only.** Decided this way because the codebase's only existing role-visibility pattern (`ROLE_TABS`) is whole-tab hiding, not disable-with-visible-content — no existing idiom to extend for the latter. Added a parallel `BUILD_SUBTAB_VISIBILITY` map, same filtering/reset-active-tab pattern as the existing top-level tab gating. Also noted: neither role has a real read-only use for this content anyway (fundraising % already shown in stat cards, rules already public on the event page), so there wasn't a case for read-only either. treasurer now sees only Registrations; volunteer_coord only sees Volunteers.

`npm run build` clean. No live-app access to verify — full handoff to project owner below.

**Project owner — next steps:**
1. **Apply migration `019_trim_role_rls.sql`** via Supabase SQL Editor — ✅ applied 2026-07-26, confirmed successful.
2. Run the verification checklist below, **plus two items added from 6b's report:** confirm control_desk's Game Day tab shows only Team Check-In (nothing else write-capable), and confirm treasurer/volunteer_coord's Build tab shows only their one sub-tab each.


- **treasurer:** can still approve/reject registrations and players, confirm/revert payments, `activity_log` writes succeed; can read events/teams/players/sponsors/local services/staff contacts; cannot write volunteers/matches; Fundraising/Rules save buttons gone.
- **volunteer_coord:** can still approve/decline volunteer applications; can read events/local services/staff contacts; cannot touch registrations/teams/players/matches; Fundraising/Rules save buttons gone.
- **referee:** full Game Day control unchanged; team check-in + captaincy transfer work; read-only on teams/players/events/local services; cannot touch registrations/volunteers/sponsors.
- **control_desk:** team check-in + captaincy transfer work (via RPC); other Game Day buttons now hidden (post-6b); confirm nothing else broke.
- **Both fixes specifically:** captain-QR captaincy transfer (Phase 4 UI) works end-to-end for **referee AND control_desk** sessions, not just admin (likely the only role tested so far); a volunteer's browser session can no longer directly `PATCH` their own `status` column via devtools/raw REST — only via the withdraw button.

**Stop here — this is the last phase in the identity work order.**

**Stop here.**

---

## Explicitly out of scope / removed from this work order

- Twilio account setup, SMS provider config in Supabase Auth dashboard — no longer needed.
- `netlify/functions/send-otp.js`, `otp_sessions` table, `otp.request`/`otp.verify` in `src/services/api.js` — still dead code to be removed, same as the original plan, just note it's now "remove because superseded by QR design" rather than "remove because replaced by native phone OTP." Fold this cleanup into Phase 3 (natural point since that's when `PlayerPortal.jsx`'s login section gets rebuilt anyway).

---

## Session close-out (2026-07-27) — deployment saga, log before next session

After the hotfix (migration 020) was applied and code was confirmed pushed, QR generation still failed through a chain of separate issues, each fixed in turn:

1. **Code was never deployed** — all of Phases 2–6's work (function, views, migrations, `AdminDashboard.jsx` changes) sat uncommitted locally through the entire build/verification cycle. Committed and pushed in one combined commit ("Identity sprint: QR captain check-in, volunteer magic link, RLS role trim, auth-signup hotfix"), covering `netlify.toml`, `package.json`/`package-lock.json`, `src/App.jsx`, `src/services/api.js`, `src/views/AdminDashboard.jsx`, `src/views/PlayerPortal.jsx`, `netlify/` (new function), `src/views/CheckIn.jsx`, `src/views/VolunteerPortal.jsx`, and migrations 017–020.
2. **Testing against `localhost:3000`** — plain `npm run dev` (Vite) has no Netlify functions runtime; `/.netlify/functions/*` 404s there regardless of deploy status. Resolved by testing against the live `cocomo-events.netlify.app` URL instead. (For future local testing of function-dependent features: use `netlify dev`, not `npm run dev`.)
3. **Function crashed with `supabaseUrl is required`** — Netlify env vars only had the `VITE_`-prefixed frontend set (`VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`, `VITE_EVENT_ID`); the function needs plain, non-prefixed server-side vars, which didn't exist yet. Added `SUPABASE_URL` (same value as the VITE one, not sensitive), `SUPABASE_SERVICE_ROLE_KEY` (from Supabase Dashboard → Project Settings → API → `service_role` secret key, marked sensitive in Netlify, added to all 5 deploy contexts), and `SITE_URL` (`https://cocomo-events.netlify.app`). Redeployed after adding.

**Confirmed working after all of the above.** QR generation succeeds live.

**Status at session close:**
- Migration 020 (hotfix) — applied live, confirmed.
- Netlify env vars — set correctly, confirmed via successful QR generation.
- Captain QR generation (admin-authenticated path) — confirmed working live.

**Still outstanding, pick up next session — the Phase 6 verification checklist itself has not been completed:**
- Treasurer invite signup retry (post-hotfix) — not yet re-confirmed.
- First-time captain check-in (actual scan → session → confirm → dashboard hand-off) — not yet tested on a real device.
- First-time volunteer login (real email → magic link → self-service view) — not yet tested.
- Full per-role checklist from Phase 6 (treasurer/volunteer_coord/referee/control_desk permission boundaries) — not yet run.
- Migration 019 was applied earlier in the session and should still be fine, but given how much else was found broken today, don't assume — verify rather than skip.

**Next session priorities (per project owner, 2026-07-27):**
1. Finish the Phase 6 verification checklist above — this identity work order isn't truly closed until that's done.
2. Marketing page / `/your_events` (Parts 1–3 of `FEATURE_SPEC_routing_and_landing.md`) — not started.
3. Stripe integration — not started, not yet spec'd in detail this session.
