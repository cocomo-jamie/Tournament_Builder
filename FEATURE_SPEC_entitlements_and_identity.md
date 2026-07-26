# Feature Spec: Entitlements Matrix + Non-Admin Identity

**Status:** Design record, not yet built. Companion to the 2026-07-23 architecture decisions in `PROJECT_STATUS.md` (marketing page / `/your_events` / persistent identity).

**Decided 2026-07-25:**
- Non-admin identity uses **Supabase Auth**, not custom tables: **magic link (email)** for volunteers/officials, **native Supabase phone OTP** for captains — replacing the originally-planned custom Twilio serverless function + `otp_sessions` table. This *removes* work from Step 5 rather than adding to it.
- The full role × resource × operation × org/event matrix is being scoped now rather than deferred indefinitely, but trimmed to real access patterns rather than a theoretical 22-table grid.

---

## Part 1 — Identity: replacing custom OTP with native Supabase Auth

### Captains — phone OTP (native)
- Enable **Phone** provider in Supabase Auth dashboard, configure Twilio as the SMS provider (same Twilio account originally scoped for Step 5, just wired through Supabase instead of a custom function).
- Client calls `supabase.auth.signInWithOtp({ phone })`, then `supabase.auth.verifyOtp({ phone, token, type: 'sms' })` — this replaces `otp.request()` / `otp.verify()` in `api.js` and the `otp_sessions` table entirely.
- Result: a real `auth.users` row + `auth.uid()` for every captain, not a bespoke session object.
- **Migration needed:** `players.auth_user_id` (nullable UUID, FK to `auth.users.id`) — set on first successful login, links the existing `players` row to the new identity. Existing `players` rows predate this and won't have it set until first login.
- **Delete from roadmap:** `netlify/functions/send-otp.js`, the `otp_sessions` table/migration, and `otp.request`/`otp.verify` in `api.js` — all superseded.
- **Open question:** phone number as the sole match key has the same typo/reuse risk called out in `PROJECT_STATUS.md`'s identity section — not solved here, carried forward.

### Volunteers & officials — magic link (email)
- `supabase.auth.signInWithOtp({ email })` — standard magic link, no SMS cost.
- **Migration needed:** `volunteer_applications.auth_user_id` and a to-be-created `officials.auth_user_id`, same pattern as above.
- Officials table itself (referees/judges directory, distinct from `admin_users.referee` dashboard role and from `staff_contacts`) is still unbuilt — this spec only wires the auth side; the table design stays a separate task per `PROJECT_STATUS.md`.

### RLS pattern for all three (new, not yet written)
```sql
-- Example shape, not final SQL — one per self-scoped table
CREATE POLICY "Self read own player row" ON players FOR SELECT USING (
  auth_user_id = auth.uid()
);
CREATE POLICY "Self update own player row" ON players FOR UPDATE USING (
  auth_user_id = auth.uid()
) WITH CHECK (auth_user_id = auth.uid());
```
Each of these needs the same live-verification treatment as every prior RLS pass — the project's track record (010 shipping with a wrong policy name, 004/005 silently staying open) is the reason to test each one against the real anon-key/authenticated-key boundary before marking it done.

---

## Part 2 — Entitlements Matrix

Collapsed from the full table list into 9 functional resource groups. "Full" = CRUD within scope boundary (org or event, per existing `is_org_admin_for`/`is_event_admin_for`). "—" = no access.

| Actor | Org/Event Settings | Registrations & Payments | Teams & Players | Match Engine | Volunteers | Sponsors & Gift Basket | Local Svc/Staff | Publishing/Artifacts | Admin/Team Mgmt |
|---|---|---|---|---|---|---|---|---|---|
| **super_admin** | Full (all orgs) | Full | Full | Full | Full | Full | Full | Full | Full |
| **org_admin** | Full (own org) | Full | Full | Full | Full | Full | Full | Full | Full (own org) |
| **admin** (event-scoped) | Full (own event) | Full | Full | Full | Full | Full | Full | Full | Full (own event) |
| **treasurer** | Read | Full | Read | — | — | Read | Read | — | — |
| **volunteer_coord** | Read | — | — | — | Full | — | Read | — | — |
| **referee** | Read | — | Read | Full (own event) | — | — | Read | — | — |
| **control_desk** | Read | — | Update (check-in only) | Read | — | — | Read | — | — |
| **player/captain** (self) | — | Read (own registration) | Read/Update (own team's active match score, submit + verify) | — | — | — | — | Read (published only) | — |
| **volunteer** (self) | — | — | — | — | Read/Update (own application/shift status) | — | — | Read (published only) | — |
| **official** (self) | — | — | — | *deferred* | — | — | Read (published rules artifact) | Read (published only) | — |

### What's genuinely new work vs. what's just documentation
- **New RLS, real work:** the 3 self-scoped rows (player, volunteer, official) — none of this exists today.
- **Trim, real work:** treasurer/volunteer_coord/referee/control_desk currently get full org/event CRUD via the blanket `is_org_admin_for`/`is_event_admin_for` checks from migration 010 — the matrix above is *narrower* than what's live now. Narrowing = new policies replacing existing blanket ones, tested to confirm nothing that should still work breaks.
- **No change needed:** super_admin/org_admin/admin rows — matches what's already built and verified.
- **Not in this pass:** `official` match-engine access is marked deferred — it depends on the still-open Game Day role-scoped sub-permissions item (referee-specific view vs. admin-level controls) already flagged in `PROJECT_STATUS.md` as needing its own design pass.

---

## Decision: static roles, not dynamic/self-serve (2026-07-25)

Considered and explicitly rejected for v1: a `roles` + `role_entitlements` data model letting an org_admin invent new roles (e.g. "Fundraising Lead") through an admin-built wizard, with RLS checking a joined `has_entitlement()` lookup instead of a hardcoded role name.

**Why rejected for now:** no org is waiting to self-serve a role tonight — there's no real forcing function yet. Against that, the dynamic model is a genuine rearchitecture (schema change to `admin_users`, every RLS policy rewritten to a joined helper, seed-migrating the 7 existing roles) that also opens a new class of risk: a bug in the entitlement-check join or the wizard itself could let someone grant broader access than intended — a scarier failure mode than "we haven't built a role yet," because it's not a missing feature, it's a live authorization bug. Not worth taking on for a need that doesn't exist yet.

**What this means in practice:** roles stay hardcoded (`role` text column + explicit RLS policies, per the matrix above), same pattern as today. If a real second vertical or an organization's genuine self-serve need shows up later, that's the trigger to revisit — not before.

### Recipe: adding a new hardcoded role (e.g. a conference's "speaker" or "host")

Reference checklist for next time a new role is needed. ~30–60 min of well-understood work, not a redesign:

1. **Decide its row in the matrix** — which of the 9 resource groups does it need, at what level (read/write/none)? Add it as a row to the Part 2 table above for the record.
2. **Write the RLS policies** — one `CREATE POLICY` per resource group it touches (usually 1–3 for a narrow role), following the existing `is_org_admin_for()`/`is_event_admin_for()` template. Most new roles are narrow, so this is small.
3. **Add it to `ROLE_TABS`** in `AdminDashboard.jsx` — one line, controls which tabs it sees.
4. **Add it to the invite-role dropdown** — Team tab / `SuperAdminDashboard.jsx` — one line.
5. **Live-verify** — log in as the new role, confirm it sees what it should and nothing more. Same standing rule as every other change in this project.

---

## Suggested build order
1. Enable Supabase Auth phone provider + Twilio SMS config (dashboard, no code)
2. `players.auth_user_id`, `volunteer_applications.auth_user_id` migrations
3. Swap `PlayerPortal.jsx`'s OTP calls to native `signInWithOtp`/`verifyOtp`; delete `otp_sessions` references
4. Self-scoped RLS policies (player row, own match score update) — live-verify
5. Volunteer magic-link flow + self-scoped RLS — live-verify
6. Trim treasurer/volunteer_coord/referee/control_desk RLS to match the table above — live-verify each, since this *removes* access that currently works and regressions are easy to miss
7. `officials` table + auth — separate follow-up, blocked on Game Day role redesign
