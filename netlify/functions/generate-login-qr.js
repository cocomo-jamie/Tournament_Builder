// netlify/functions/generate-login-qr.js
// ─────────────────────────────────────────────────────────────────────
// Part of FEATURE_SPEC_entitlements_and_identity.md Phase 2/3b (QR/magic-
// link check-in). Issues a Supabase magic-link for a player's synthetic
// check-in identity (player_<player_id>@checkin.internal) — never a real
// inbox, the link is never emailed, only encoded as a QR by the caller.
//
// Uses the SERVICE ROLE key. Staffed-only per Phase 3b (2026-07-26): the
// original unattended "kiosk" shared-secret path (capped to one issuance
// via players.checked_in) was removed — every call now requires a real
// admin/referee/control_desk/org_admin/super_admin Supabase session.
// checked_in is no longer a hard gate anywhere in this function; it's
// informational only (surfaced in the staff UI), so re-issuing a QR for
// an already-checked-in player is allowed — covers lost-phone re-issuance
// and Phase 4's captaincy transfer, both already staff-authenticated
// actions.
// ─────────────────────────────────────────────────────────────────────

import { createClient } from "@supabase/supabase-js";

const supabaseAdmin = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

const ADMIN_ROLES = ["admin", "referee", "control_desk", "org_admin", "super_admin"];

export async function handler(event) {
  if (event.httpMethod !== "POST") {
    return { statusCode: 405, body: JSON.stringify({ error: "Method not allowed" }) };
  }

  let body;
  try {
    body = JSON.parse(event.body);
  } catch {
    return { statusCode: 400, body: JSON.stringify({ error: "Invalid JSON body" }) };
  }

  const { player_id } = body;
  if (!player_id) {
    return { statusCode: 400, body: JSON.stringify({ error: "player_id is required" }) };
  }

  const authHeader = event.headers.authorization || event.headers.Authorization;
  const token = authHeader?.replace(/^Bearer\s+/i, "");
  if (!token) {
    return { statusCode: 401, body: JSON.stringify({ error: "Missing admin session" }) };
  }

  const { data: userData, error: userError } = await supabaseAdmin.auth.getUser(token);
  if (userError || !userData?.user) {
    return { statusCode: 401, body: JSON.stringify({ error: "Invalid or expired admin session" }) };
  }

  const { data: adminRow, error: adminError } = await supabaseAdmin
    .from("admin_users")
    .select("role")
    .eq("id", userData.user.id)
    .eq("active", true)
    .single();

  if (adminError || !adminRow || !ADMIN_ROLES.includes(adminRow.role)) {
    return { statusCode: 403, body: JSON.stringify({ error: "Not authorized to issue check-in links" }) };
  }

  const { data: player, error: playerError } = await supabaseAdmin
    .from("players")
    .select("event_id")
    .eq("id", player_id)
    .single();

  if (playerError || !player) {
    return { statusCode: 404, body: JSON.stringify({ error: "Player not found" }) };
  }

  const email = `player_${player_id}@checkin.internal`;
  const siteUrl = process.env.SITE_URL || process.env.URL;

  const { data: linkData, error: linkError } = await supabaseAdmin.auth.admin.generateLink({
    type: "magiclink",
    email,
    options: siteUrl ? { redirectTo: `${siteUrl}/e/${player.event_id}/checkin` } : undefined,
  });

  if (linkError) {
    return { statusCode: 500, body: JSON.stringify({ error: linkError.message }) };
  }

  return {
    statusCode: 200,
    body: JSON.stringify({ action_link: linkData.properties?.action_link }),
  };
}
