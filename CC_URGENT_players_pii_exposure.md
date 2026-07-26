# CC Urgent Fix — Public `players` table exposes phone/email

Found during Phase 1 of the identity work order, not introduced by it. Same class of issue as the `registrations` public-read PII exposure fixed live 2026-07-23 — treating with the same urgency rather than deferring to Phase 4.

## The problem

`schema.sql`'s `"Public read players basic" ON players FOR SELECT USING (true)` has apparently never been narrowed by any migration. Anyone with the anon key can read every column of every `players` row — including phone and email — for every event, right now, in production.

## Why this isn't a simple drop-the-policy fix

Some of `players` is legitimately public — team rosters displayed on `LandingPage`/`LivePage`/`TVDisplay` presumably read from this table. Phone and email are not legitimate public data. Postgres RLS is row-level, not column-level, so this needs one of:

- **A public-safe view** (e.g. `players_public`) exposing only non-PII columns (name, team, pool, seed, check-in status — whatever the public views actually render), with its own grant to `anon`, while the base table's public policy is narrowed to authenticated/admin/self only.
- **Column-level privilege grants** (`REVOKE`/`GRANT` on specific columns) layered alongside RLS, if that's a cleaner fit given how the existing queries are structured.

## Task

1. **First, grep every public-facing query against `players`** (`LandingPage.jsx`, `LivePage.jsx`, `TVDisplay.jsx`, anywhere else using the anon key) and list exactly which columns each one actually uses. Don't guess at what's "needed" — confirm from real usage.
2. Based on that list, choose view-vs-column-grants (your call, pick whichever fits the existing query patterns with less rework) and implement.
3. Narrow `"Public read players basic"` on the base table to exclude phone/email from anonymous access — either by replacing it with a column-restricted grant, or by pointing public consumers at the new view and tightening the base table's policy to authenticated-admin/self only.
4. **Do not break the legitimate public roster display** — this needs the same care as the RLS trim work in Phase 4: know what should still work, and don't guess.
5. Write as a migration, do not apply — same manual-application pattern as everything else in this project. Report back with an explicit before/after: what's publicly readable today vs. after this migration.

## Stop condition

Same as always: report back, do not self-verify, do not touch `PROJECT_STATUS.md`. This gets manually verified and applied before Phase 2 resumes.

---

## Other Phase 1 findings — noted, no action needed right now

- **Phone normalization (digits-only stripping) in the linking trigger:** accepted as-is. Known residual gap (a player who registered with only a local 10-digit number won't match against Auth's E.164 format) is real but minor and already flagged as part of the broader phone-typo/reuse issue this spec explicitly defers — not blocking.
- **Trigger skips rather than raises on ambiguous match:** confirmed correct interpretation. Raising would roll back a legitimate user's `auth.users` insert over a linking ambiguity unrelated to whether their login should succeed — skip is the right call. No change needed.
- **`volunteer_applications` had no prior read/update policy gap** — Phase 1's additions there are genuinely new capability, not fixing a pre-existing hole. No action needed.
