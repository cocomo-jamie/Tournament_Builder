# CC Work Order — Identity: QR Check-in, Magic Link, Self-Scoped RLS, Role Trim

Reference: `FEATURE_SPEC_entitlements_and_identity.md` (revised 2026-07-26 — phone OTP replaced with QR + Supabase magic link). This is still a bigger, riskier piece of work than the publish-fix — it touches live auth flows and narrows existing admin access. Built and reported in phases, not one pass. **Stop and report after each phase — do not proceed to the next phase in the same session without a go-ahead.** No self-verification at any point; no `PROJECT_STATUS.md` edits until told to.

**Phase 1 (below) is already done and live** — migrations 012/013 applied, confirmed in `PROJECT_STATUS.md`. Included here only for reference/completeness.

---

## Phase 1 — Migrations ✅ DONE (2026-07-25, migrations 012/013)

`players.auth_user_id`, `volunteer_applications.auth_user_id`, self-scoped RLS, phone/email linking triggers. See `PROJECT_STATUS.md` for details. No action needed.

**Note carried forward:** the phone-match linking trigger on `players` (migration 012) is no longer the relevant path for captain login under the QR design — `auth_user_id` gets set directly by the magic-link exchange instead. Harmless to leave as-is; flag for cleanup later, not blocking.

---

## Phase 1b — New migration: `players.checked_in`

1. Write (don't apply) a migration adding `players.checked_in` — boolean, default `false`.
2. **Do not apply to the live DB.** Same manual-application pattern as every other migration in this project — commit the file, project owner applies via Supabase SQL Editor.
3. Report back: migration file contents.

**Stop here. Wait for confirmation it's applied before Phase 2.**

---

## Phase 2 — QR/magic-link generation function (CC, after Phase 1b is live)

1. Build a Netlify function (e.g. `netlify/functions/generate-login-qr.js`) that:
   - Accepts a `player_id`.
   - Uses the **service role key** (never the anon key) to call `supabase.auth.admin.generateLink({ type: 'magiclink', email })`, where `email` is a synthetic identifier deterministically derived from the player row (e.g. `player_<player_id>@checkin.internal`) — not a real inbox, never sent anywhere.
   - Returns the generated link/token for the client to encode as a QR (client-side QR rendering library — check what's already available in the project before adding a new dependency).
2. **Auth boundary on this function needs explicit thought, not assumption** — it uses the service role key, so it must not be callable by just anyone with the function URL. Two call sites need it: (a) the check-in kiosk flow, which happens *before* the player has any session (so can't be gated on player auth), and (b) the admin/referee captaincy-transfer flow, which should be gated to those roles. Propose an approach (e.g. kiosk calls go through a lightweight shared secret or are restricted to the admin-authenticated kiosk session itself; transfer calls require an authenticated admin/referee session) and flag the tradeoff rather than picking silently.
3. Report back, including the auth-boundary proposal from step 2 as a specific callout.

**Stop here.**

---

## Phase 3 — Check-in landing page + kiosk UI (CC, after Phase 2)

1. Build the landing page the QR link opens: exchanges the magic-link token for a Supabase session, then shows "Checking in for [event name] as [captain name] of [team name]?" pulling those values from the now-authenticated player's row.
2. On confirm: write `players.checked_in = true`.
3. Build the staff-facing kiosk UI: search/select a team from the roster, display that captain's QR (calls Phase 2's function).
4. Report back, no self-verification of the actual scan-to-session flow — that needs a real device and is a manual test.

**Stop here.**

---

## Phase 4 — Printed QR fallback + captaincy transfer UI (CC, after Phase 3 is live-verified)

1. Batch-generation path: given an event, generate/export QR codes for every captain ahead of time (printable sheet or per-team output — confirm format with project owner before building).
2. Admin/referee UI action: flip `players.is_captain` from outgoing to incoming player on a team (single team-scoped update, RLS-gated to admin/referee/control_desk), then immediately call Phase 2's function for the new captain's `player_id` and display the resulting QR on the admin/referee's own screen.
3. Report back.

**Stop here.**

---

## Phase 5 — Volunteer magic link (CC, independent of Phases 2-4, only needs Phase 1's migration — already live)

1. Build the volunteer-facing login flow using `supabase.auth.signInWithOtp({ email })` — this one *does* send a real email, unlike the captain QR flow.
2. `auth_user_id` linking uses the existing trigger-based approach from migration 013 (email-match, `SECURITY DEFINER`) — no new decision needed.
3. Wire the volunteer's authenticated view to read/update their own `volunteer_applications` row via the self-scoped RLS from Phase 1.
4. Report back, no self-verification of the actual email flow.

**Stop here.**

---

## Phase 6 — Trim existing role RLS (CC, do this last, most caution)

Unchanged from original plan. Highest-risk phase: **narrowing** access that currently works, for treasurer/volunteer_coord/referee/control_desk, to match the matrix in `FEATURE_SPEC_entitlements_and_identity.md` Part 3. Live-verify each role after trimming — regressions here are easy to miss since they show up as "can no longer do X," not an error.

**Stop here.**

---

## Explicitly out of scope / removed from this work order

- Twilio account setup, SMS provider config in Supabase Auth dashboard — no longer needed.
- `netlify/functions/send-otp.js`, `otp_sessions` table, `otp.request`/`otp.verify` in `src/services/api.js` — still dead code to be removed, same as the original plan, just note it's now "remove because superseded by QR design" rather than "remove because replaced by native phone OTP." Fold this cleanup into Phase 3 (natural point since that's when `PlayerPortal.jsx`'s login section gets rebuilt anyway).
