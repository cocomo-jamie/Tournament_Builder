# CC Work Order — Identity: Phone OTP, Magic Link, Self-Scoped RLS, Role Trim

Reference: `FEATURE_SPEC_entitlements_and_identity.md`. This is a bigger, riskier piece of work than the publish-fix — it touches live auth flows and narrows existing admin access. Built and reported in phases, not one pass. **Stop and report after each phase — do not proceed to the next phase in the same session without a go-ahead.** No self-verification at any point; no `PROJECT_STATUS.md` edits until told to.

---

## Phase 0 — Dashboard setup (human, not CC — blocking for Phase 2 only)

Before Phase 2 (captain OTP swap) can be tested, the Supabase Auth **Phone** provider needs to be enabled with Twilio configured as the SMS provider, done manually in the Supabase dashboard (Authentication → Providers). CC has no dashboard/service-role access, so this can't be delegated. **This doesn't block Phase 1** (migrations can be written and reviewed without it) — flagging so Phase 1 can start immediately while this gets set up in parallel.

---

## Phase 1 — Migrations (CC)

1. Write (don't apply) migration(s) adding:
   - `players.auth_user_id` — nullable UUID, FK to `auth.users.id`
   - `volunteer_applications.auth_user_id` — nullable UUID, FK to `auth.users.id`
2. Write the self-scoped RLS policies from the spec's "RLS pattern" section — one migration per logical group is fine (player self-access, volunteer self-access). Use the spec's example SQL as the template, not a copy-paste — check actual table/column names against `supabase/schema.sql` before writing, don't assume the spec's shorthand is exact.
3. Write the `auth_user_id`-linking triggers (one for `players` matching on phone, one for `volunteer_applications` matching on email) per the decided approach in Phase 2 step 2 below — same `SECURITY DEFINER` pattern as `handle_invite_signup` (migration 007). Include both here even though Phase 3 (volunteer) comes after Phase 2 (captain) in build order, so the migration set is complete in one pass rather than split across phases.
3. **Do not apply these migrations to the live DB.** Per this project's established pattern (see 010/011 in `PROJECT_STATUS.md`), CC has no `psql`/service-role access — migration files get committed, then applied manually via the Supabase SQL Editor by the project owner. Say so explicitly in your report; don't imply they're live.
4. Report back: migration file contents, and specifically flag anything where the spec's assumed schema didn't match what's actually in `schema.sql`.

**Stop here. Wait for the migrations to be manually applied and confirmed before Phase 2 depends on them.**

---

## Phase 2 — Captain phone OTP swap (CC, after Phase 0 + Phase 1's migration is live)

1. In `PlayerPortal.jsx`, replace the custom `otp.request()`/`otp.verify()` calls with `supabase.auth.signInWithOtp({ phone })` and `supabase.auth.verifyOtp({ phone, token, type: 'sms' })`.
2. **Decided 2026-07-25: use a DB trigger**, not client-side linking, for `auth_user_id` matching — mirrors the existing `handle_invite_signup` pattern (migration 007) for consistency, and is more robust since it works even if a client-side write fails or is skipped. On successful phone verification (new `auth.users` row created or matched), a `SECURITY DEFINER` trigger should match on phone number against `players.phone` and set `players.auth_user_id` accordingly — write this as part of Phase 1's migration set, not deferred to Phase 2's app code. If a phone number matches zero or multiple `players` rows, do not guess — see the known-open-issue note below.
3. Remove now-dead code: `otp.request`/`otp.verify` in `src/services/api.js`, the `otp_sessions` table (write a migration to drop it, don't just leave it orphaned), and `netlify/functions/send-otp.js` if it exists yet (check — Step 5 may not have built this file at all, in which case there's nothing to remove).
4. **Known open issue, not solved in this phase:** phone number as the sole match key has the typo/reuse risk flagged in `PROJECT_STATUS.md`'s identity section. Don't attempt to solve it here — just don't make it worse: the Phase 1 trigger should error/skip rather than guess if a phone number matches zero or multiple `players` rows, not silently overwrite the wrong row.
5. Report back. **Do not self-verify the actual SMS flow** — that needs a real phone number and Phase 0's dashboard config, which is a manual test.

**Stop here.**

---

## Phase 3 — Volunteer magic link (CC, after Phase 1's migration is live; independent of Phase 2)

1. Build the volunteer-facing login flow using `supabase.auth.signInWithOtp({ email })`.
2. `auth_user_id` linking uses the same trigger-based approach decided in Phase 2/written in Phase 1 (email-match trigger on `volunteer_applications`, same `SECURITY DEFINER` pattern) — no new decision needed here.
3. Wire the volunteer's authenticated view to read/update their own `volunteer_applications` row via the self-scoped RLS from Phase 1.
4. Report back, no self-verification of the actual email flow.

**Stop here.**

---

## Phase 4 — Trim existing role RLS (CC, do this last, most caution)

This is the highest-risk phase: **narrowing** access that currently works, for treasurer/volunteer_coord/referee/control_desk, to match the matrix in `FEATURE_SPEC_entitlements_and_identity.md` Part 2. Unlike Phases 1-3 (additive), a mistake here can break something that currently works and the breakage may not be obvious immediately.

1. For each of the 4 roles, write RLS policies matching its row in the matrix, replacing the current blanket `is_org_admin_for`/`is_event_admin_for` grant for that role specifically.
2. Write these as migrations, don't apply — same manual-application pattern as Phase 1.
3. **For each role, write out explicitly in your report**: what access it has today (before) vs. what it will have after this migration applies (after) — a plain-language before/after table, not just the SQL. This is what makes the manual verification pass actually checkable.
4. Do not touch super_admin/org_admin/admin (event-scoped) — matrix confirms no change needed there.
5. `official` row stays deferred per the spec — don't build anything for it in this phase.

**Stop here. This phase in particular gets a careful manual pass before applying — do not suggest it's safe to apply without review.**

---

## What's explicitly out of scope for this work order

- `officials` table itself — deferred, blocked on the Game Day role redesign, not part of this spec
- Any UI/UX polish on the new login flows beyond making them functional — that can be a follow-up pass once the mechanism is confirmed working
- Notification-on-resume, or anything related to the separate pause-registration feature — unrelated, queued after this

## When each phase is done

Report back per phase, wait for confirmation before continuing. Manual live-verification and `PROJECT_STATUS.md` updates happen after all phases are built and reviewed, done by the project owner — not by CC mid-phase.
