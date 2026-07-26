# CC Bug Report — Admin route shows "not published" before auth check runs

Found during manual live-verify of the publish-fix work order, on `/e/:eventId/admin` for a draft event while logged out.

## The bug

`/e/:eventId/admin` for a draft event currently renders the public `EventNotPublishedDisplay` message instead of prompting login — even though the whole point of the admin route is to let an authorized admin manage a draft event (including publishing it). This is a hard lock: there is currently no way to reach a draft event's admin panel unless you happen to already be logged in before navigating there.

## Root cause (confirm this, don't just trust it)

`ConfigGate`'s `notFound` short-circuit (added in the publish-fix work) appears to run before `ProtectedRoute`'s auth resolution in the component tree for `/e/:eventId/admin`. Sequence as it stands:

1. Route loads, `EventShell`/`ConfigGate` fetches event config immediately
2. If not yet authenticated at fetch time, the request is effectively anonymous
3. RLS's public-read policy (`status != 'draft'`) filters the draft row to zero rows → `events.get()` returns `null`
4. `ConfigGate` sees `notFound: true`, renders `EventNotPublishedDisplay`
5. `ProtectedRoute`'s auth check never runs — it's further down the tree, gated behind `ConfigGate` already having decided to render something else

This should *not* happen for a logged-in admin scoped to that event — `"Admin full events" FOR ALL USING (is_event_admin_for(id))` is an additive RLS policy alongside the public read policy, so an authenticated, scoped admin's request should return the row regardless of draft status. The bug is about request *ordering/timing*, not RLS actually blocking a legitimate admin.

## What to check

1. Confirm the theory: does the admin route work correctly if you're already logged in *before* navigating to `/e/:eventId/admin`? If yes, this is purely an ordering bug in `App.jsx`'s route tree. If it *still* fails while logged in, something else is wrong (e.g. the client isn't attaching the auth session to the request in time, or the RLS policy isn't behaving as expected) — flag that separately, don't assume the ordering fix will cover it.
2. Look at how `/e/:eventId/admin` currently composes `EventShell` → `ConfigGate` → `ProtectedRoute` → `AdminDashboard` in `App.jsx`. The `notFound` handling needs to either:
   - Run *after* `ProtectedRoute` has resolved auth (so a logged-out visitor gets sent to login first, and only a genuinely-unauthorized-or-nonexistent-event case falls through to the not-published message), or
   - Be scoped so the admin route path doesn't use the same "public not found" branch at all — an admin-context fetch failing should look different from a public-context fetch failing (e.g. "you don't have access to this event" vs. "this tournament isn't public yet")
3. **Do not fix this by just reordering blindly** — think through what should happen in each real case and make sure the fix covers all of them:
   - Logged out, visits draft event's admin URL → should redirect to login (existing `?redirect=` pattern), not show the public message
   - Logged in, but wrong org/event scope, visits draft event's admin URL → should get the existing "access denied" / redirect-to-own-event behavior `ProtectedRoute` already handles for wrong-scope admins, not the public message
   - Logged in, correct scope, draft event → should load the admin panel normally
   - Logged out (or public), visits a draft event's **public** `/e/:eventId` URL (not `/admin`) → should still show the friendly not-published message, this part of the original fix was correct and shouldn't regress

## Stop condition

Same as before: build and report back, do not self-verify, do not touch `PROJECT_STATUS.md`. Live verification of all four cases above will be done manually.

## Verified — 2026-07-25 (manual, by project owner)

Admin login flow confirmed working end-to-end: logged-out visit to a draft event's admin URL correctly redirects to login, authenticates, and lands on the admin page with `EventStatusCard` visible under Publish. `AdminGate`'s merged auth+config wait/retry approach resolved the race correctly in this pass.

**Design note carried forward to `FEATURE_SPEC_routing_and_landing.md`:** today's flow works, but it's per-route — each protected route independently redirects to `/login?redirect=...` when hit while logged out. Once the marketing page + `/your_events` land, login should become a single, consistent front door rather than something each route separately bounces to. Not a defect in this fix; a forward-looking note for that spec.
