# Feature Spec: Registration Pause + Interest Capture

**Status:** Design record, not yet built. Raised 2026-07-25 as a replacement for the earlier "revoke publish status" idea — pausing, not reverting, is the actual need: block *new* signups temporarily without touching anyone already registered.

**Why not a status revert:** reverting `registration_open` back to `draft` (or any backward status transition) risks hiding existing registrations, breaking already-registered captains' login flow, or orphaning data — flagged as a real risk before this was scoped, not solved by a simple toggle. Pause sidesteps that entirely by never touching `events.status` — it's an independent flag layered on top.

---

## What "paused" means

- A new field, `events.registration_paused` (boolean, default `false`), independent of `events.status`.
- When `true`: any attempt to submit a **new** team registration, sponsor signup, or volunteer commitment is blocked with a friendly message — *"Event registration is temporarily paused. Leave your name and email and we'll notify you when it reopens."*
- Does **not** affect: already-registered teams/sponsors/volunteers, captain login, public page visibility, or any existing data. Pause only gates new-submission entry points.
- Independent of `events.status` — an event can be `registration_open` and paused at the same time (open in principle, temporarily not accepting new signups — e.g. capacity hit, a data issue being fixed, a payment processor outage).

## Who can toggle it

Super_admin, org_admin, and event-scoped `admin` — same tier as publish, per your instruction. Not treasurer/volunteer_coord/referee/control_desk. Reuses the existing `is_event_admin_for()`/`is_org_admin_for()` RLS scope functions; no new permission primitive needed, this is just another field those same policies already cover.

## Lead capture — new table

```sql
CREATE TABLE paused_registration_interest (
  id          UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  event_id    UUID NOT NULL REFERENCES events(id) ON DELETE CASCADE,
  name        TEXT NOT NULL,
  email       TEXT NOT NULL,
  source_area TEXT NOT NULL,  -- 'team_registration' | 'sponsor_signup' | 'volunteer_signup'
  notified_at TIMESTAMPTZ,     -- set once the "we're back" notification is actually sent (Step 5 dependency, see below)
  created_at  TIMESTAMPTZ DEFAULT now() NOT NULL
);

CREATE INDEX idx_paused_interest_event ON paused_registration_interest(event_id);
```
- Public **INSERT** policy needed (same pattern as `registrations`/`volunteer_applications` today) — this form is filled out by anonymous visitors hitting a paused event, same trust level as registration itself.
- **No public SELECT** — this is contact info, same PII-sensitivity class as `registrations` (the table that had the real exposure incident on 2026-07-23). Admin-only read, scoped the same as pause-toggle access above. Don't repeat that mistake here — write and live-verify the read policy carefully, single-quote-checked against the real policy name this time.

## Frontend — three touch points, one shared component

1. **Team registration form** (wherever that currently lives — likely `LandingPage.jsx` or a dedicated registration flow) — check `event.registration_paused` before rendering the form; if true, render the paused message + capture form instead.
2. **Sponsor signup** — same pattern, same shared "paused" component, `source_area: 'sponsor_signup'`.
3. **Volunteer commitment** — same pattern, `source_area: 'volunteer_signup'`.

Build one reusable `<RegistrationPausedNotice eventId source_area />` component that renders the message + name/email capture form + calls the new insert, rather than duplicating this three times. Each of the three existing forms swaps in a paused-check + this component in place of its normal submit form when `registration_paused` is true.

## Admin-side toggle

- Add to `EventStatusCard` (same component CC just built for publish/status) — a pause/resume toggle, visually distinct from the status lifecycle control since it's a different concept (temporary gate, not a lifecycle stage).
- Show a count of captured leads next to the toggle once paused (`SELECT count(*) FROM paused_registration_interest WHERE event_id = ... AND notified_at IS NULL`) so the admin has a sense of how many people are waiting.

## Notification when unpaused — explicitly deferred

Sending the "registration is back open" email/SMS depends on Step 5 (serverless functions, not yet built) for the actual send mechanism. **This spec only covers capturing the data now** so nothing is lost while that's pending — `notified_at` stays `null` until Step 5 exists and a real send happens. Do not build a notification-send path in this pass; that's follow-up work once Step 5 lands.

## Open questions worth deciding before build, not mid-build

1. **Does resuming (un-pausing) require any confirmation step**, or is it a plain toggle-back? Given the earlier concern about accidental status reverts, worth deciding whether pause/resume needs any "are you sure" friction or if that's over-engineering a simple flag. Leaning toward plain toggle — pause doesn't destroy anything, so the risk profile is much lower than a status revert.
2. **Duplicate submissions** — if the same email submits interest twice for the same event (e.g. tried registering, got paused message, submitted email, tried again a day later, submitted again) — dedupe on `(event_id, email, source_area)`, or just accept duplicates and let the eventual notification step handle de-duping? Recommend accepting duplicates for now (simpler, and duplicate rows are low-cost) and revisit only if it becomes a real nuisance.

## Suggested build order
1. Migration: `events.registration_paused` boolean + `paused_registration_interest` table + RLS (public insert, admin-only read)
2. Shared `RegistrationPausedNotice` component
3. Wire into the three existing forms (team registration, sponsor signup, volunteer commitment)
4. Admin toggle + lead count in `EventStatusCard`
5. Live-verify: pause an event, confirm all three forms show the paused message and capture leads correctly; confirm existing registrations/captains are unaffected; confirm the lead table isn't publicly readable
