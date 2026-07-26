# Vision & Roadmap Boundary

**Purpose of this doc:** capture the long-term direction so it shapes near-term architecture decisions without derailing the current v1 build. Not a build spec — `PROJECT_STATUS.md` and the `FEATURE_SPEC_*.md` files are that. This is the "why," reviewed and updated as the real picture sharpens, not built from speculation.

**Established 2026-07-25**, following the entitlements/identity design session.

---

## The mission

Community organizations run events regularly — sports tournaments, conferences, fundraisers — without a systematic approach. That gap gets absorbed as unpaid load by the people organizing: tracking registrations by spreadsheet, chasing payments by email, remembering permit deadlines, re-explaining the same logistics every time.

**The thesis:** community building — and the events that build it — is going to matter more, not less. A platform that reduces that coordination load, priced as a share of event profit and/or a small monthly fee, is a meaningful win for the organizations it serves. **The value is in letting people do the people things — connecting, running the event, building the community — while the system absorbs the coordination and compliance overhead.**

This reframes what's actually being built. The bracket/pool tournament engine was never the core product — it's the first activity model built on top of the real one: registrations, volunteers, sponsors, logistics, and publishing, running for any organization coordinating any kind of gathering.

---

## Platform core vs. activity model — the architectural boundary

Confirmed reusable across event types, already built or in progress:
- Org/event/auth structure, role-based access
- Registrations (sign up, pay, get approved)
- Volunteers (role-based signup, fill tracking)
- Sponsors & sponsor tiers
- Staff contacts / local services / logistics
- Playing areas → generalizes to any bookable resource (court, room, booth)
- Artifacts/publishing (schedule, run-sheet, resource directory)

**Not generalizable, and shouldn't be forced to be:** `matches`/`pools`/`brackets` encode a specific computation — head-to-head results, standings, bracket advancement. A conference's speakers/sessions or an exhibitor's booth assignment has no equivalent shape. Renaming tables to fit a second vertical would produce the right columns wired to the wrong relationships.

**The standing architectural principle going forward:** as work lands in the tournament-specific tables (Game Day role redesign, match overrun policy, officials table), keep asking whether it's genuine coordination infrastructure or bracket-specific computation, and keep it out of the generic layer if it's the latter. This costs nothing extra now — it's a placement discipline in code review — and it's what keeps a future activity-model extraction cheap instead of a rewrite.

**Explicitly not doing yet:** extracting the platform core into a formal pluggable structure, or designing a second activity model. That's real work worth doing from two concrete verticals, not one real one and one imagined one.
**Trigger to revisit:** a second real organization actually asking for a genuinely different activity shape (conference, gala, fundraiser walk, etc.).

---

## The compliance/logistics layer — the real differentiator

Validated 2026-07-25: BC's Special Event Permit process is a concrete example of exactly the load this platform should absorb — specific lead times (30 days under 500 people, 60 days for 500+ or exemptions), per-event fees, proof-of-registration requirements, and municipal permits that often have to be sequenced before the liquor application. This is deadline-sensitive, document-heavy, easy-to-miss work — a strong candidate for the platform to track and prompt around.

**Honest scope of "automation" here:** BC's Special Event Permit is submitted through the province's own portal (BCeID login). There's no indication of a public submission API. Near-term value is realistically: the platform holds canonical event data and generates pre-filled documents/checklists with deadlines, not a true submit-on-behalf-of integration. Worth being precise about this with organizations so the pitch doesn't overpromise — "we make sure you never miss a form or a deadline" is the honest and still-valuable version.

**Separate, longer-horizon idea, deliberately not conflated with the above:** providing services *to* a body like the BC Liquor and Cannabis Regulation Branch. That's B2G — procurement-driven, security/compliance-audited, sales cycles measured in years — a different business with a different shape, not something to architect toward now.
**Trigger to revisit:** the platform becoming a de facto data source for enough BC community organizations that government engagement becomes a real conversation, not a starting assumption.

---

## Deferred decisions and their triggers

Keeping this list explicit so "should we build X now" has a fast answer:

| Deferred | Why | Trigger to build |
|---|---|---|
| Dynamic/self-serve custom roles (`roles` + `role_entitlements` data model, admin-built wizard) | No org needs it yet; static roles + a documented recipe (see `FEATURE_SPEC_entitlements_and_identity.md`) covers new-role needs in ~30-60 min | A real org needs a role today that can't wait for a deploy, or role-adding becomes frequent enough to bottleneck |
| Pluggable activity-model architecture (conference/exhibitor support) | One real vertical today; designing from imagination risks the wrong abstraction | A second real organization with a genuinely different event shape |
| Permit/compliance automation module | Not yet designed; depends on which jurisdictions/orgs are actually onboarded first | Once 2-3 real organizations are live on the platform and their actual permit pain points are known firsthand |
| B2G service offering to regulatory bodies | Different business model, different sales motion entirely | Platform has enough real organizational data/reach that government engagement is a natural next step, not a bet |

---

## What this changes about the current build — and what it doesn't

**Doesn't change:** the v1 scope. Still finishing the tournament platform — landing pages, magic-link/phone-OTP identity, the entitlements matrix, deployment — as the first real, working vertical. That's still the fastest way to validate the platform core against reality, and everything reusable in it (registrations, volunteers, sponsors, logistics, publishing) carries forward regardless of what a second vertical looks like.

**Does change:** the framing for near-term naming/placement decisions — default to generic terminology in the reusable layer where it costs nothing (already mostly true), and keep tournament-specific computation contained rather than let it leak into shared tables as new features land.
