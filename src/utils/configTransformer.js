// src/utils/configTransformer.js
// ─────────────────────────────────────────────────────────
// Transforms a Supabase event row (with joined org, dates,
// sponsors, volunteer roles, gift basket) into the nested
// config shape (C) that all views consume.
//
// DB call: events.get(eventId) returns:
//   { ...event_columns, organizations: {...}, event_dates: [...] }
//
// Additional data (sponsors, volunteer roles, gift basket)
// is fetched separately and merged in useEventConfig.
// ─────────────────────────────────────────────────────────

/**
 * Transform DB event row → view config object.
 *
 * @param {Object} event      - Row from events table (with organizations(*) and event_dates(*) joined)
 * @param {Object} options    - Additional data fetched separately
 * @param {Array}  options.sponsorTiers  - sponsor_tiers rows with nested sponsors
 * @param {Array}  options.sponsors      - sponsors rows
 * @param {Array}  options.volunteerRoles - volunteer_roles rows
 * @param {Array}  options.giftBasketItems - gift_basket_items rows
 * @returns {Object} Config object matching the C shape used in views
 */
export function transformEventToConfig(event, options = {}) {
  const org = event.organizations || {};
  const brand = org.brand || {};
  const {
    sponsorTiers = [],
    sponsors = [],
    volunteerRoles = [],
    giftBasketItems = [],
  } = options;

  // Parse cause education into fact cards if it's JSON, otherwise use as description
  let causeFacts = [];
  let causeClosing = "";
  if (event.cause_education) {
    try {
      const parsed = JSON.parse(event.cause_education);
      if (Array.isArray(parsed.facts)) causeFacts = parsed.facts;
      if (parsed.closing) causeClosing = parsed.closing;
    } catch {
      // Not JSON — treat as plain text, no structured facts
      causeClosing = event.cause_education;
    }
  }

  return {
    // ── Organization ──
    org: {
      name: org.name || "",
      email: org.email || "",
      phone: org.phone || "",
      website: org.website || "",
      logoUrl: org.logo_url || "",
    },

    // ── Brand ──
    brand: {
      primary: brand.primary || "#C1121F",
      secondary: brand.secondary || "#1B4D3E",
      accent: brand.accent || "#D4A843",
      dark: brand.dark || "#020e4b",
      light: brand.light || "#F4F1EA",
    },

    // ── Event ──
    event: {
      id: event.id,
      name: event.name || "",
      sport: event.sport || "",
      tagline: event.tagline || "",
      description: event.description || "",
      date: event.event_dates?.[0]?.day_date || "",
      dates: (event.event_dates || []).map((d) => ({
        date: d.day_date,
        label: d.label,
      })),
      endTime: event.end_time || "",
      venue: event.venue_name || "",
      address: event.venue_address || "",
      courts: event.area_count || event.court_count || 4,
      areaLabel: event.area_label || event.court_label || "Courts",
      status: event.status || "draft",
    },

    // ── Tournament ──
    tournament: {
      format: event.format || "pool_playoff",
      minTeams: event.min_teams || 8,
      maxTeams: event.max_teams || 24,
      playersPerTeam: event.players_per_team || 4,
      playersMin: event.players_min || 3,
      playersMax: event.players_max || 6,
      requireCaptain: event.require_captain ?? true,
      requireCoach: event.require_coach ?? false,
      poolCount: event.pool_count || 4,
      teamsPerPool: event.teams_per_pool || 4,
      pointsToWin: event.points_to_win || 11,
      maxPoints: event.max_points || 15,
      timeLimit: event.time_limit_min || 0,
      allowTies: event.allow_ties ?? false,
    },

    // ── Cause & Fundraising ──
    cause: {
      isCharity: event.is_charity ?? false,
      name: event.cause_name || "",
      description: event.cause_description || "",
      facts: causeFacts,
      closing: causeClosing,
      charityLogoUrl: event.charity_logo_url || "",
    },
    fundraising: {
      goal: parseFloat(event.fundraising_goal) || 0,
      current: parseFloat(event.fundraising_current) || 0,
      showThermometer: event.show_thermometer ?? true,
    },

    // ── Registration ──
    registration: {
      deadline: event.reg_deadline || "",
      fee: parseFloat(event.entry_fee) || 0,
      allowDonations: event.allow_donations ?? true,
      collectShirts: event.collect_shirts ?? false,
      collectDietary: event.collect_dietary ?? false,
      allowTeamLogo: event.allow_team_logo ?? true,
      allowTeamSlogan: event.allow_team_slogan ?? true,
      sloganMaxWords: event.slogan_max_words || 10,
      allowTeamStory: event.allow_team_story ?? true,
      storyMaxWords: event.story_max_words || 300,
      imageConsent: event.image_consent ?? true,
      imageConsentText: event.image_consent_text || "",
      waiverRequired: event.waiver_required ?? false,
      waiverText: event.waiver_text || "",
    },

    // ── Payment ──
    payment: {
      eTransfer: event.payment_etransfer ?? true,
      eTransferEmail: event.etransfer_email || "",
      stripe: event.payment_stripe ?? false,
      cash: event.payment_cash ?? true,
    },

    // ── Sponsors (from separate tables) ──
    sponsorTiers: sponsorTiers.map((t) => ({
      id: t.id,
      name: t.name,
      amount: parseFloat(t.amount) || 0,
    })),
    sponsors: sponsors.map((s) => ({
      id: s.id,
      name: s.name,
      tier: sponsorTiers.find((t) => t.id === s.tier_id)?.name || "",
      tierId: s.tier_id,
      logoUrl: s.logo_url || "",
      website: s.website || "",
    })),

    // ── Volunteers (from volunteer_roles table) ──
    volunteers: volunteerRoles.map((r) => ({
      id: r.id,
      title: r.title,
      count: r.headcount || 0,
      filled: r.filled_count || 0,
      description: r.description || "",
    })),

    // ── Gift Basket ──
    giftBasket: giftBasketItems.map((item) => ({
      id: item.id,
      provider: item.provider,
      description: item.description,
      code: item.discount_code || "",
      website: item.website || "",
      logoUrl: item.logo_url || "",
    })),

    // ── Rules ──
    rules: event.rules_content || "",

    // ── Raw event row for anything views need directly ──
    _raw: event,
  };
}
