# Phase 6 Verification Checklist — Identity Work Order Close-out

Reference: `CC_WORK_ORDER_identity.md`, Phase 6 / 6b. This checklist is what stands between "code is written and deployed" and "identity work order is actually done." Test against the live app: `https://cocomo-events.netlify.app` (not `localhost`/`npm run dev` — Netlify functions won't run there).

---

## Pre-flight / hotfix follow-up

- [x] **Treasurer invite signup retry** — confirmed working post-hotfix (migration 020)
- [x] **First-time captain check-in** — real device, actual QR scan → session → confirm screen → hand-off into `/captain` dashboard, confirmed working
- [ ] **First-time volunteer login** — real email → `signInWithOtp` magic link → lands in self-service view (status/role/checked_in, editable phone/experience, withdraw button)
- [ ] **Migration 019 sanity check** — spot-check that it's actually applied and behaving as expected before trusting the role tests below (applied 2026-07-26, but the same session found two other "documented as done" bugs, so don't skip this)

---

## Per-role permission boundaries

### treasurer
- [ ] Can approve/reject registrations
- [ ] Can approve/reject individual players
- [ ] Can confirm/revert payments
- [ ] `activity_log` writes succeed for the above actions
- [ ] Can read: events, teams, players, sponsors, local services, staff contacts
- [ ] **Cannot** write volunteers or matches (try directly, not just via hidden UI)
- [ ] Fundraising & Rules save buttons are gone (Build tab shows only Registrations sub-tab)

### volunteer_coord
- [ ] Can approve/decline volunteer applications
- [ ] Can read: events, local services, staff contacts
- [ ] **Cannot** touch registrations, teams, players, or matches (try directly)
- [ ] Fundraising & Rules save buttons are gone (Build tab shows only Volunteers sub-tab)

### referee
- [ ] Full Game Day control unchanged (Match Engine, Announcements, etc.)
- [ ] Team check-in works
- [ ] Captaincy transfer works end-to-end (not just admin — this role specifically)
- [ ] Read-only on teams/players/events/local services
- [ ] **Cannot** touch registrations, volunteers, or sponsors

### control_desk
- [ ] Team check-in works (via RPC)
- [ ] Captaincy transfer works end-to-end (not just admin — this role specifically)
- [ ] Match Engine card, Announcements card, and "No-Show" button are **hidden** (post-6b), not just disabled
- [ ] Nothing else in Game Day is write-capable for this role

### Security boundary (not UI-dependent)
- [ ] A volunteer's browser session **cannot** directly `PATCH`/update their own `status` column via devtools/raw REST call — only the withdraw button should be able to change it (SECURITY DEFINER RPC boundary, not just UI hiding)

---

## Notes
- Anything failing here is a regression from Phase 6's migration 019 (RLS trim) or Phase 6b's UI hiding — flag which one before reporting back to CC, since the fix differs (SQL vs. component).
- Once every box above is checked, the identity work order (`CC_WORK_ORDER_identity.md`) is genuinely closed and `PROJECT_STATUS.md` can be updated to reflect that — not before.
