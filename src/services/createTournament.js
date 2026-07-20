// src/services/createTournament.js
// ─────────────────────────────────────────────────────────
// Writes a complete tournament (org + event + all related
// config tables) from the TournamentWizard's `data` state.
// Column names verified against supabase/schema.sql plus
// migrations 001_playing_areas.sql and 002_rules_content.sql.
// ─────────────────────────────────────────────────────────

import { supabase } from "../supabaseClient";

// Matches the Wizard's own VENUE_LABELS map, so area_label/area
// names stay consistent with what the organizer saw during setup.
const AREA_LABEL_PLURAL = {
  bocce: "Courts", soccer: "Pitches", rugby: "Pitches", bowling: "Lanes",
  volleyball: "Courts", softball: "Diamonds", cornhole: "Boards", dodgeball: "Courts",
  kickball: "Diamonds", golf: "Holes", tennis: "Courts", pickleball: "Courts",
  basketball: "Courts", hockey: "Rinks", curling: "Sheets", darts: "Boards", other: "Playing Areas",
};

const AREA_NAME_SINGULAR = {
  bocce: "Court", soccer: "Pitch", rugby: "Pitch", bowling: "Lane",
  volleyball: "Court", softball: "Diamond", cornhole: "Board", dodgeball: "Court",
  kickball: "Diamond", golf: "Hole", tennis: "Court", pickleball: "Court",
  basketball: "Court", hockey: "Rink", curling: "Sheet", darts: "Board", other: "Area",
};

/**
 * Create a full tournament from Wizard data.
 * Inserts into: organizations, events, event_dates, playing_areas,
 * volunteer_roles, sponsor_tiers, sponsors, gift_basket_items,
 * local_services, staff_contacts.
 *
 * @param {Object} data - The Wizard's complete state object
 * @returns {Object} { orgId, eventId } - IDs of created records
 * @throws {Error} with descriptive message on failure
 */
export async function createTournament(data) {
  try {
    // ── Step 1: Organization ──
    const { data: org, error: orgError } = await supabase
      .from("organizations")
      .insert({
        name: data.orgName,
        email: data.orgEmail,
        phone: data.orgPhone || null,
        website: data.orgWebsite || null,
        logo_url: data.orgLogoUrl || null,
        style_ref_url: data.orgStyleRef || null,
        brand: {
          primary: data.primaryColor,
          secondary: data.secondaryColor,
          accent: data.accentColor,
          dark: data.bgColor,
          light: data.bgLight,
        },
        images: data.orgImages || [],
      })
      .select()
      .single();

    if (orgError) throw new Error(`Failed to create organization: ${orgError.message}`);

    // ── Step 2: Event ──
    const areaLabel = AREA_LABEL_PLURAL[data.sport] || "Playing Areas";
    const areaName = AREA_NAME_SINGULAR[data.sport] || "Area";

    const { data: event, error: eventError } = await supabase
      .from("events")
      .insert({
        org_id: org.id,
        name: data.eventName,
        sport: data.sport,
        sport_custom: data.sport === "other" ? data.sportOther : null,
        tagline: data.eventTagline || null,
        description: data.eventDescription || null,
        status: "draft",

        // Venue
        venue_name: data.venueName,
        venue_address: data.venueAddress || null,
        area_count: data.venueCount || 4,
        area_label: areaLabel,

        // Schedule
        event_days: data.eventDays || 1,
        end_time: data.eventEndTime || null,

        // Tournament format
        format: data.format,
        min_teams: data.minTeams,
        max_teams: data.maxTeams,
        players_per_team: data.playersPerTeam,
        players_min: data.playersMin,
        players_max: data.playersMax,
        require_captain: data.requireCaptain ?? true,
        require_coach: data.requireCoach ?? false,
        pool_count: data.poolCount || 4,
        teams_per_pool: data.teamsPerPool || 4,
        points_to_win: data.pointsToWin || 11,
        max_points: data.maxPoints || 15,
        time_limit_min: data.timeLimit || 0,
        allow_ties: data.allowTies ?? false,

        // Registration config
        reg_deadline: data.regDeadline || null,
        entry_fee: data.entryFee || 0,
        allow_donations: data.allowDonations ?? true,
        collect_shirts: data.collectShirtSizes ?? false,
        collect_dietary: data.collectDietaryNeeds ?? false,
        allow_team_logo: data.allowTeamLogo ?? true,
        allow_team_slogan: data.allowTeamSlogan ?? true,
        slogan_max_words: data.sloganMaxWords || 10,
        allow_team_story: data.allowTeamStory ?? true,
        story_max_words: data.storyMaxWords || 300,
        image_consent: data.imageConsent ?? true,
        image_consent_text: data.imageConsentText || null,
        waiver_required: data.waiverRequired ?? false,
        waiver_text: data.waiverText || null,

        // Payment config
        payment_etransfer: data.paymentMethods?.includes("e_transfer") ?? true,
        etransfer_email: data.eTransferEmail || null,
        payment_stripe: data.stripeEnabled ?? false,
        payment_cash: data.cashEnabled ?? true,
        auto_reconciliation: data.autoReconciliation ?? true,

        // Fundraising
        is_charity: data.isCharity || false,
        cause_name: data.causeName || null,
        cause_description: data.causeDescription || null,
        cause_education: data.causeEducation || null,
        charity_logo_url: data.charityLogoUrl || null,
        fundraising_goal: data.fundraisingGoal || 0,
        fundraising_current: data.fundraisingCurrent || 0,
        show_thermometer: data.showThermometer ?? true,

        // Checklists
        equipment_checklist: data.equipment || [],
        facilities_checklist: data.facilities || [],
        signage_checklist: data.signage || [],
        permits_checklist: data.permits || [],

        // Layout
        field_layout_notes: data.fieldLayoutNotes || null,

        // Deliverable feature flags
        gen_schedule: data.generateSchedule ?? true,
        gen_run_sheet: data.generateRunSheet ?? true,
        gen_site_maps: data.generateSiteMaps ?? false,
        gen_resource_dir: data.generateResourceDir ?? true,
        gen_volunteer_pkg: data.generateVolunteerPkg ?? false,
        gen_staff_pkg: data.generateStaffPkg ?? false,
        gen_service_pkg: data.generateServicePkg ?? false,
        enable_ai_qa: data.enableAIAssistant ?? false,
        enable_gift_basket: data.enableGiftBasket ?? false,
      })
      .select()
      .single();

    if (eventError) throw new Error(`Failed to create event: ${eventError.message}`);

    const eventId = event.id;

    // ── Step 3: Parallel inserts (all depend only on event.id) ──
    const [dateResult, areaResult, roleResult, tierResult] = await Promise.all([
      supabase.from("event_dates").insert(
        data.eventDates
          .filter(d => d.date)
          .map((d, i) => ({
            event_id: eventId,
            day_date: d.date,
            label: d.label || `Day ${i + 1}`,
            sort_order: i,
          }))
      ).select(),

      supabase.from("playing_areas").insert(
        Array.from({ length: data.venueCount || 4 }, (_, i) => ({
          event_id: eventId,
          number: i + 1,
          name: `${areaName} ${i + 1}`,
          status: "available",
        }))
      ).select(),

      data.volunteerRoles.length > 0
        ? supabase.from("volunteer_roles").insert(
            data.volunteerRoles.filter(r => r.title).map((r, i) => ({
              event_id: eventId,
              title: r.title,
              count_needed: parseInt(r.count) || 0,
              description: r.description || null,
              sort_order: i,
            }))
          ).select()
        : Promise.resolve({ data: [], error: null }),

      data.sponsorTiers.length > 0
        ? supabase.from("sponsor_tiers").insert(
            data.sponsorTiers.filter(t => t.name).map((t, i) => ({
              event_id: eventId,
              name: t.name,
              amount: parseFloat(t.amount) || 0,
              sort_order: i,
            }))
          ).select()
        : Promise.resolve({ data: [], error: null }),
    ]);

    if (dateResult.error) console.error("Event dates insert failed:", dateResult.error);
    if (areaResult.error) console.error("Playing areas insert failed:", areaResult.error);
    if (roleResult.error) console.error("Volunteer roles insert failed:", roleResult.error);
    if (tierResult.error) console.error("Sponsor tiers insert failed:", tierResult.error);

    // ── Step 4: Sponsors (depend on tier IDs from step 3) ──
    if (data.sponsors.length > 0 && tierResult.data?.length > 0) {
      const tierMap = {};
      tierResult.data.forEach(t => { tierMap[t.name] = t.id; });

      const sponsorRows = data.sponsors
        .filter(s => s.name)
        .map(s => ({
          event_id: eventId,
          tier_id: tierMap[s.tier] || tierResult.data[0]?.id,
          name: s.name,
          logo_url: s.logoUrl || null,
          website: s.website || null,
        }));

      if (sponsorRows.length > 0) {
        const { error: sponsorError } = await supabase.from("sponsors").insert(sponsorRows);
        if (sponsorError) console.error("Sponsors insert failed:", sponsorError);
      }
    }

    // ── Step 5: Remaining independent tables ──
    await Promise.all([
      data.giftBasket.length > 0
        ? supabase.from("gift_basket_items").insert(
            // provider and description are NOT NULL in the schema
            data.giftBasket.filter(g => g.provider && g.description).map(g => ({
              event_id: eventId,
              provider: g.provider,
              description: g.description,
              discount_code: g.discountCode || null,
              website: g.website || null,
            }))
          )
        : Promise.resolve(),

      data.localServices.length > 0
        ? supabase.from("local_services").insert(
            data.localServices.filter(s => s.name).map(s => ({
              event_id: eventId,
              name: s.name,
              service_type: s.type || null,
              phone: s.phone || null,
              notes: s.notes || null,
            }))
          )
        : Promise.resolve(),

      data.staffContacts.length > 0
        ? supabase.from("staff_contacts").insert(
            data.staffContacts.filter(c => c.name).map(c => ({
              event_id: eventId,
              name: c.name,
              role: c.role || "", // role is NOT NULL in the schema
              phone: c.phone || null,
              email: c.email || null,
            }))
          )
        : Promise.resolve(),
    ]);

    return { orgId: org.id, eventId: event.id };
  } catch (err) {
    if (err instanceof Error) throw err;
    throw new Error("Failed to create tournament. Please try again.");
  }
}
