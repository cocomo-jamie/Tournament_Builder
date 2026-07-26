# Feature Spec: Entitlements Matrix + Non-Admin Identity

**Status:** Design record, not yet built. Companion to the 2026-07-23 architecture decisions in `PROJECT_STATUS.md` (marketing page / `/your_events` / persistent identity).

**Superseded 2026-07-26:** The original captain identity plan (native Supabase phone OTP via Twilio) has been replaced. Root cause: the actual product requirement was never "prove phone ownership" — it was "check a team in fast at a desk, and let the captain enter/verify scores for the rest of the day without re-authenticating." Phone OTP solved a harder problem than the one that existed, and cost real money (Twilio) to do it. See "Part 1 — Revised" below.

Volunteer/official identity (magic link, email) is unchanged from the original design and still applies as written further down.

---

## Part 1 — Revised: Captain & player identity via QR + Supabase magic link

### The actual requirement (2026-07-26 working session)

- Captain arrives at the registration desk, gets checked in with minimal friction — no password, no typed code.
- Once checked in, that captain can submit/verify scores for the rest of the event from their own phone, without logging in again.
- If a captain's phone is lost/dead/broken mid-event, a referee/admin can hand captaincy to another player on the roster, and that player can pick up scoring duties with equally low friction.
- This is a convenience problem, not a security problem. The project owner is explicitly not concerned about someone falsely claiming to be a captain to submit a fake score — the existing dispute flow (away captain accept/dispute, referee resolves only on dispute) already provides the real check.

### Design: unique QR code per player, encoding a Supabase magic link

- Every `players` row (not just the captain — see "captaincy transfer" below) can have a magic link generated for it via `supabase.auth.admin.generateLink({ type: 'magiclink', email })`, called from a Netlify function using the **service role key** (never exposed client-side).
- The "email" is synthetic, not a real inbox: `player_<player_id>@checkin.internal` (or similar), generated deterministically from the player row. No email is ever sent — the link itself is the credential, delivered via QR code instead of an inbox.
- The generated link is encoded as a QR code. Scanning it (with the player's own phone camera) opens the site, exchanges the token for a real Supabase session, and that session persists via Supabase's normal refresh-token handling — no re-login for the rest of the day.
- The same landing page doubles as the check-in confirmation screen: "Checking in for [event name] as [captain name] of [team name]?" → tap yes → `players.checked_in` (new column, see migration below) flips true and the session is now live on their device.

### Distribution flow

- **Primary:** a check-in kiosk screen (staff phone/tablet) where staff search/select a team from the roster; the screen displays that captain's QR. Captain scans with their own phone.
- **Fallback (kiosk/device failure):** a pre-printed sheet of QR codes, one per captain, generated ahead of the event from the same `generateLink` mechanism. No behavioral difference to the captain — same code, different medium.
- **Fallback (captain's own phone fails, pre-checkin):** staff manually mark the team checked in from the admin dashboard, bypassing the scan. No session is created for anyone in this case — acceptable, since the team simply isn't scoring yet.

### Captaincy transfer (also the mid-event phone-failure fallback)

- `players.is_captain` (existing boolean) can be flipped by an admin/referee/control_desk action: set the outgoing captain's `is_captain` to `false`, the incoming player's to `true`, single team-scoped update, RLS-gated to those roles.
- Immediately after transfer, the admin/referee UI triggers the same `generateLink` flow for the new captain's `player_id` and displays the resulting QR on their own screen. New captain scans with their own phone → logged in → can submit/verify scores going forward.
- This is deliberately the *same* mechanism as check-in, not a separate fallback path — one feature covers both "captain wants someone else to do it" and "captain's phone died."
- Consequence: QR/magic-link generation must be callable for **any** `player_id` on a team, not gated to whoever was marked captain at registration time.

### What this removes from the original plan

- No Twilio account, no SMS cost, no phone-number-as-identity typo/reuse risk (carried in the original spec as an open, unsolved problem — this design removes the problem rather than solving it).
- No Android-SMS-gateway workaround (textbee.dev, self-hosted `android-sms-gateway`, Tasker/AutoRemote) — considered and explicitly rejected in favor of the QR/magic-link approach, since it reuses Phase 1's already-built self-scoped RLS instead of introducing a new identity system.
- Phase 0 (manual Supabase dashboard Twilio config) is no longer needed.

### Migration needed (new, on top of Phase 1's `players.auth_user_id`)

- `players.checked_in` — boolean, default `false`. Set true on confirmation-screen "yes," not on QR generation (a printed/displayed QR existing doesn't mean the person showed up).
- No new migration needed for captaincy transfer — reuses the existing `players.is_captain` column.

### What's reused, unchanged, from Phase 1 (already live via migrations 012/013)

- `players.auth_user_id`, self-scoped RLS (a logged-in player can read/update their own row), and the phone-match linking trigger. Note: the linking trigger matched on phone number, which is no longer the relevant match key for login — this trigger becomes dead weight for the captain flow specifically (harmless to leave, since `auth_user_id` is now set directly by the magic-link exchange rather than needing to be inferred). Flag for cleanup, not urgent.

### Open questions carried forward, not solved here

- QR pre-generation vs. on-demand at the desk — either works technically; a pure workflow choice for the event owner, not a technical blocker.
- Whether to visually invalidate/rotate a QR after first use (currently: no — a captain could re-scan their own code from a second device if needed, which is consistent with "convenience over security" framing).

---

## Part 2 — Volunteers & officials — magic link (email) — unchanged

- `supabase.auth.signInWithOtp({ email })` — standard magic link, real inbox this time (volunteers/officials aren't scanning a code at a desk), no SMS cost.
- **Migration needed:** `volunteer_applications.auth_user_id` and a to-be-created `officials.auth_user_id`, same pattern as captains. `volunteer_applications.auth_user_id` is already live via migration 013.
- Officials table itself (referees/judges directory, distinct from `admin_users.referee` dashboard role and from `staff_contacts`) is still unbuilt — this spec only wires the auth side; the table design stays a separate task per `PROJECT_STATUS.md`.

---

## Part 3 — Entitlements matrix (role × resource × operation) — unchanged, not affected by Part 1's revision

*(Carried forward from the original spec as-is — see existing matrix and RLS-trim table below this line in the working doc. Not reproduced here since Part 1 is the only section that changed.)*

## Suggested build order (revised 2026-07-26)

1. Migration: `players.checked_in` column.
2. Netlify function: `generate-login-qr` — takes `player_id`, calls `supabase.auth.admin.generateLink` with the service role key, returns the link/token for QR encoding. Gated: callable by check-in kiosk flow (open, since it's pre-authentication by design) and by admin/referee actions (for reassignment) — confirm auth boundary on this function specifically, since it uses the service role key.
3. Check-in landing page: exchanges the magic-link token for a session, shows confirmation screen, writes `checked_in = true` on confirm.
4. Check-in kiosk UI: staff-facing team search/select → display QR (reuses function from step 2).
5. Printed QR fallback sheet — batch-generate ahead of an event.
6. Captaincy transfer UI (admin/referee): flip `is_captain`, trigger QR regeneration for new captain, display on screen.
7. Volunteer magic-link flow + self-scoped RLS — live-verify (unchanged from original plan).
8. Trim treasurer/volunteer_coord/referee/control_desk RLS to match the matrix in Part 3 — live-verify each, since this *removes* access that currently works and regressions are easy to miss.
9. `officials` table + auth — separate follow-up, blocked on Game Day role redesign (unchanged).
