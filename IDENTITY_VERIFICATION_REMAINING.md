# Identity Sprint Verification — What's Left

Source: `phase6_verification_checklist.md`. Test against the LIVE app
(`https://cocomo-events.netlify.app`), not localhost — Netlify functions
won't run there. Already confirmed: treasurer invite signup retry,
first-time captain check-in (real device). Everything below is still open.

This is manual testing only — no CC involvement needed unless something
fails, in which case flag whether it's migration 019 (RLS) or Phase 6b
(UI hiding) before reporting back, since the fix differs.

## Pre-flight
- [ ] First-time volunteer login — real email → magic link → self-service view
- [ ] Migration 019 sanity check — spot-check it's actually applied/behaving before trusting the role tests below

## treasurer
- [ ] Approve/reject registrations
- [ ] Approve/reject individual players
- [ ] Confirm/revert payments
- [ ] `activity_log` writes succeed for the above
- [ ] Can read: events, teams, players, sponsors, local services, staff contacts
- [ ] Cannot write volunteers or matches (try directly, not just via hidden UI)
- [ ] Fundraising & Rules save buttons are gone (Build tab shows only Registrations sub-tab)

## volunteer_coord
- [ ] Approve/decline volunteer applications
- [ ] Can read: events, local services, staff contacts
- [ ] Cannot touch registrations, teams, players, matches (try directly)
- [ ] Fundraising & Rules save buttons gone (Build tab shows only Volunteers sub-tab)

## referee
- [ ] Full Game Day control unchanged (Match Engine, Announcements, etc.)
- [ ] Team check-in works
- [ ] Captaincy transfer works end-to-end (this role specifically, not just admin)
- [ ] Read-only on teams/players/events/local services
- [ ] Cannot touch registrations, volunteers, sponsors

## control_desk
- [ ] Team check-in works (via RPC)
- [ ] Captaincy transfer works end-to-end (this role specifically)
- [ ] Match Engine card, Announcements card, "No-Show" button are hidden (not just disabled)
- [ ] Nothing else in Game Day is write-capable for this role

## Security boundary (not UI-dependent)
- [ ] A volunteer's session cannot directly PATCH their own `status` column via devtools/raw REST — only the withdraw button (SECURITY DEFINER RPC) should change it

## When done
Update `PROJECT_STATUS.md`: mark the Identity Sprint verification checklist
fully closed, with today's date and what was verified. This is the item
that's been flagged as unscheduled risk since 07-27 — closing it removes
that flag entirely.
