# CC Fix — Embed-through-view confirmed broken, switch to two-query merge

Confirmed live 2026-07-25: `useRealtimeTeams(eventId, { publicSafe: true })`'s `players:players_public(*)` embed returns no `players` key at all on `LivePage.jsx` — roster/captain names don't render. This is the risk flagged before applying migration 014 — PostgREST's automatic embedding relies on discovering a real FK constraint, which a view doesn't carry the same way the base table does, and it's not resolving.

## Don't try to fix the embed syntax — replace the approach

Chasing the "right" embed hint for a view is exactly the kind of thing that can't be verified without a live instance and varies by PostgREST version — not worth the uncertainty for what should be a simple read. Switch the `publicSafe` path to two separate queries instead of one embedded query:

1. Fetch teams as today (unchanged).
2. Separately query `players_public` filtered to the relevant `team_id`s (`.in('team_id', teamIds)`).
3. Merge client-side — attach each team's players array from the second query's results, keyed by `team_id`.

This only needs to change inside `useRealtimeTeams`'s `publicSafe` branch — the admin/default path (`players(*)` on the base table, which works today and is unaffected by this bug) stays exactly as-is. Callers (`LivePage.jsx`) shouldn't need changes if the hook's return shape is kept consistent between both branches.

## Also check

Realtime subscriptions — if `useRealtimeTeams` sets up a realtime channel expecting the embedded shape, confirm the two-query merge still updates correctly when either teams or players change, not just on initial load. Don't assume the realtime path is unaffected just because the initial fetch is fixed.

## Verification (manual, not CC)

- `LivePage.jsx` for a real event shows team rosters with captain names populated
- Realtime: change a player's `is_captain` or `full_name` via the admin side, confirm `LivePage` updates live without a refresh
- Confirm `AdminDashboard.jsx`'s Game Day check-in list (the unaffected default-branch path) still shows correctly — should need no changes, but worth confirming nothing regressed incidentally

## Stop condition

Report back, no self-verification, `PROJECT_STATUS.md` untouched. This blocks Phase 2 until confirmed working.
