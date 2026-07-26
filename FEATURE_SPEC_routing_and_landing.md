# Feature Spec: Publish Flow, Marketing Page (`/`), `/your_events`

**Status:** Design record, not yet built. Implements the route map decided in `PROJECT_STATUS.md`'s "Architecture Decisions — 2026-07-23," in the sequence that doc's Proposed Schedule already set. This spec exists to make that sequence concrete enough for CC to build against without re-deriving it.

**Explicitly not in this spec:** the non-admin identity/link mechanism (magic link, phone OTP, self-scoped RLS) — that's `FEATURE_SPEC_entitlements_and_identity.md`. This spec covers routing/pages only, and treats identity as landing later, per the 07-23 doc's own sequencing note ("non-admin identity/link mechanism last, since it's the least-defined piece").

---

## Part 0 — Publish-event flow (do this first)

**Why first:** it's a live bug, not a new feature, and every other smoke test in this spec depends on being able to publish an event without hand-editing SQL. Currently every event in prod is `status = 'draft'`, there's no UI to change that, and an anonymous visit to a draft event's public page throws a raw Postgrest error instead of a friendly message (`events.get()` uses `.single()`, RLS filters the draft row to zero rows, `.single()` throws — confirmed live 2026-07-23).

**Build:**
1. **Publish control** — a button/toggle in `AdminDashboard.jsx`'s Publish tab (or Build, wherever event status lives conceptually) that runs `events.update(eventId, { status: 'published' })`. Needs org_admin/admin-level auth, already covered by existing RLS.
2. **Graceful not-found/not-published handling** — `LandingPage.jsx`'s data-fetch path needs to catch the draft/missing case and render a "this tournament isn't public yet" state instead of letting the raw `.single()` error surface. Likely means swapping `.single()` for `.maybeSingle()` in `events.get()` (`api.js`) and branching on `null` in the view, rather than relying on the thrown error.
3. **Live-verify:** publish an event through the new UI, confirm its public page loads anonymously; visit a still-draft event's URL, confirm the friendly message (not a console error) renders.

---

## Part 1 — Marketing page (`/`)

Static content only this pass — no checkout, no Stripe, no billing logic. Per the 07-23 decision:
- Explains what the platform does: tournament design, registrations, volunteer management, game day tools, TV display, sponsor management, digital gift management
- Shows static/dummy pricing: $1000 CAD/1 event, $750/2, $500/3, or $20/mo + $100/event, "12 months full package for early adopters" framing
- "Log in" from here routes to `/your_events` (post-auth) or `/login` (pre-auth) — see routing note below
- Needs its **own platform-level visual identity** (Tournament Builder's own colors/type), distinct from any single org's brand, per the "same bones, different skin" principle — while sharing enough of the component/layout system that marketing → `/your_events` → `/e/:eventId` doesn't feel discontinuous

**Build:**
1. New `src/views/MarketingPage.jsx` — static content component, no Supabase queries needed (pricing is hardcoded display content this pass)
2. Platform-level design tokens (colors/type) separate from `configTransformer.js`'s per-event brand extraction — read the `frontend-design` skill before building this, since it covers the styling constraints/tokens for this environment
3. `App.jsx` — `/` route renders `MarketingPage`, replacing today's `VITE_EVENT_ID`-based redirect to a hardcoded event entirely

---

## Part 2 — `/your_events` (admin roles only, this pass)

Authenticated landing page for **any admin role** (super_admin, org_admin, event-scoped roles). Reuses existing role/session data — no new backend work beyond a query to list a user's associated events.

**Build:**
1. New `src/views/YourEvents.jsx` — on load, query events the logged-in admin has scope over:
   - super_admin: all events (or all orgs, needs a UX decision — see Open Question below)
   - org_admin: all events under `adminUser.org_id`
   - event-scoped roles: just their one event (`adminUser.event_id`)
2. **Card/list UI**, each entry linking out to that event's **existing public `/e/:eventId` URL** — see the hard constraint below, this is not a new gated view of event data
3. **Onboarding flag** — first-time users get a short tour + prompt to create their first event (routes to `/wizard`, already gated). Needs a persisted "has completed onboarding" boolean.
   - **Open question, needs a decision before building:** per-org or per-admin_user? Per-org is simpler (one flag, org_admin's first login clears it for the whole org) but under-serves a super_admin managing many orgs, or a second admin invited into an already-onboarded org who'd never see the tour. Per-admin_user is more correct but is one more column on every invite/signup path. **Recommend per-admin_user** (`admin_users.onboarded_at` nullable timestamp) since it's a small schema cost and avoids the "second admin never sees onboarding" gap — flagging rather than deciding unilaterally since this wasn't resolved in the 07-23 session.
4. **Route guard** — reuse the `ProtectedRoute` pattern (session → adminUser exists), but `/your_events` itself needs no event/org scope check since it's the landing page for any authenticated admin, not a specific event's admin panel

**Hard constraint (from the 07-23 decision, repeated here because it's easy to violate by accident):** `/e/:eventId` must remain fully reachable with zero auth, regardless of login state. `/your_events` **links out** to the same public URLs — one URL, two entry points, never a second authenticated copy of the same page. **Explicit regression check:** log in, click through to `/e/:eventId` from `/your_events`, log out, reload the same URL, confirm identical content still loads.

---

## Design note: single entry point for login (added 2026-07-25)

The current per-route login redirect (`?redirect=...`) works correctly — verified live during the admin-route-ordering bug fix — but it's fragmented by design: every protected route independently decides to bounce an unauthenticated visitor to `/login`. That's fine as a fallback, but it's not the *primary* login experience once this spec's routes exist.

**Once the marketing page and `/your_events` are built, they should become the front door.** The expectation: a visitor lands on `/`, clicks "Log in," authenticates once, and lands on `/your_events` — from there, every event they have access to is one click away via links to `/e/:eventId/admin`, already carrying an authenticated session. The scattered per-route `?redirect=` bounce becomes the edge case (someone hits a deep admin link directly, e.g. from a bookmark or a shared URL, while logged out) rather than the primary path — it should still work when that happens, but it's no longer the main way people log in.

**Practical implication for Part 2's build:** `MarketingPage.jsx`'s "Log in" action and `Login.jsx` itself should route consistently to `/your_events` post-auth (not back to whatever arbitrary page prompted the login, unless that arbitrary page was itself the reason they logged in — the existing `?redirect=` behavior stays correct for that case, this is about what the *default*, no-redirect-param login lands on).

---

## Part 3 — routing cleanup

- Remove `VITE_EVENT_ID` entirely once `/` no longer needs a default-event fallback — it was already flagged in the Deployment section as existing only to support the old root-redirect behavior
- Update the route-map comment block at the top of `App.jsx` to reflect the new map:
  ```
  /                      → Marketing page
  /your_events           → Authenticated admin landing (any admin role)
  /e/:eventId            → Public tournament page (unchanged)
  /e/:eventId/live       → Public game day hub (unchanged)
  /e/:eventId/captain    → Captain login + scoring (unchanged)
  /e/:eventId/tv         → Projector display (unchanged)
  /e/:eventId/admin      → Admin dashboard (unchanged)
  /wizard                → Tournament wizard (unchanged)
  /login                 → Admin login (unchanged)
  ```
- Netlify env vars: remove `VITE_EVENT_ID` from the dashboard once the code no longer reads it — don't leave a stale unused var around

---

## Explicitly deferred within this spec

- **Non-admin identity / "see all my tournaments" flow** — depends entirely on the identity model in `FEATURE_SPEC_entitlements_and_identity.md`; sequenced last per the 07-23 decision
- **Real payments/checkout on the marketing page** — pricing is display-only; the centralized-vs-decentralized payment model is an open legal/business question flagged separately in `PROJECT_STATUS.md`, not resolved here and not a blocker for this spec
- **Branding system formalization beyond "platform has its own skin"** — the deeper split (event skin vs. platform skin as a reusable theming system) can stay ad hoc for this pass; only becomes worth formalizing if/when a second activity vertical shows up (see `VISION.md`)

---

## Suggested build order — and where this spec sits in the overall sequence

**Confirmed 2026-07-25:** Part 0 (publish-fix) is a live bug and runs immediately, standalone. After that, `FEATURE_SPEC_entitlements_and_identity.md` runs **before** the rest of this spec (Parts 1-3) — not after, as this spec's own internal ordering might otherwise imply. Reason: `/your_events` (Part 2) is deliberately scoped to admin roles only *specifically to avoid depending on identity*, but that means it would otherwise get built twice — once now for admins, once later reworked to add non-admin users once identity lands. Building identity first means `/your_events` gets built once, correctly, from the start.

**Onboarding flag decided:** per-admin_user (`admin_users.onboarded_at` nullable timestamp), per the recommendation in Part 2 above.

Overall order:
1. **Publish control + graceful not-found handling (Part 0 of this spec)** — live-verify before moving on. Standalone, no dependency on anything below.
2. **`FEATURE_SPEC_entitlements_and_identity.md`, full build order** (Supabase phone/magic-link auth, self-scoped RLS, trimmed role RLS) — do this in full before returning here.
3. Marketing page, static content (Part 1 of this spec)
4. `/your_events`, built once against the now-existing identity model — admin roles per Part 2, non-admin "see my tournaments" flow added in the same pass rather than bolted on later
5. Routing cleanup, remove `VITE_EVENT_ID` (Part 3)
6. Live-verify the hard constraint explicitly: logged-out access to `/e/:eventId` still works after all of the above
