// src/hooks/useRealtime.js
// ─────────────────────────────────────────────────────────
// Real-time Supabase subscription hooks.
// These power live updates on the TV display, public live
// page, admin game day panel, and captain portal.
// ─────────────────────────────────────────────────────────

import { useState, useEffect, useCallback, useRef } from "react";
import { supabase } from "../supabaseClient";

// ═══════════════════════════════════════════════════════════
// GENERIC REALTIME TABLE HOOK
// ═══════════════════════════════════════════════════════════

function useRealtimeTable(table, eventId, initialFetch, options = {}) {
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);
  const { filter, orderBy, ascending = true } = options;

  // Unique per-instance ID so concurrent hook calls for the same
  // table+eventId don't collide on the same Supabase channel object.
  const instanceId = useRef(Math.random().toString(36).slice(2)).current;

  const fetchData = useCallback(async () => {
    setLoading(true);
    let query = supabase.from(table).select(options.select || "*").eq("event_id", eventId);
    if (filter) Object.entries(filter).forEach(([k, v]) => { query = query.eq(k, v); });
    if (orderBy) query = query.order(orderBy, { ascending });
    const { data: rows, error } = await query;
    if (!error) setData(rows);
    setLoading(false);
  }, [table, eventId, options.select, JSON.stringify(filter), orderBy, ascending]);

  // Initial fetch
  useEffect(() => {
    if (eventId) fetchData();
  }, [eventId, table]);

  // Subscribe to changes
  useEffect(() => {
    if (!eventId) return;

    const channel = supabase
      .channel(`${table}_${eventId}_${instanceId}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table,
          filter: `event_id=eq.${eventId}`,
        },
        (payload) => {
          const { eventType, new: newRow, old: oldRow } = payload;

          setData((prev) => {
            if (eventType === "INSERT") {
              return [...prev, newRow];
            }
            if (eventType === "UPDATE") {
              // Realtime sends bigint primary keys (e.g. registrations.id)
              // as strings over the wire, while the initial REST fetch
              // returns them as numbers — String() on both sides keeps the
              // match working regardless of which table's PK type this is.
              return prev.map((row) => (String(row.id) === String(newRow.id) ? { ...row, ...newRow } : row));
            }
            if (eventType === "DELETE") {
              return prev.filter((row) => String(row.id) !== String(oldRow.id));
            }
            return prev;
          });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [eventId, table]);

  return { data, loading, setData, refetch: fetchData };
}

// ═══════════════════════════════════════════════════════════
// SPECIFIC HOOKS
// ═══════════════════════════════════════════════════════════

/**
 * Live match updates — used by TV display, live page, admin game day
 * Returns all matches for the event, auto-updating on any change.
 */
export function useRealtimeMatches(eventId) {
  const { data, loading } = useRealtimeTable("matches", eventId, true, {
    select: "*, team_a:teams!matches_team_a_id_fkey(id, name, slogan), team_b:teams!matches_team_b_id_fkey(id, name, slogan), playing_area:playing_areas(number, name)",
    orderBy: "round",
  });

  const live = data.filter((m) => ["live", "score_entered", "disputed"].includes(m.status));
  const completed = data.filter((m) => m.status === "completed");
  const upcoming = data.filter((m) => ["pending", "scheduled", "ready"].includes(m.status));

  return { matches: data, live, completed, upcoming, loading };
}

/**
 * Pool standings — used by TV display, live page standings tab
 * Auto-updates when the trigger recalculates after match completion.
 */
export function useRealtimeStandings(eventId) {
  const [pools, setPools] = useState([]);
  const [loading, setLoading] = useState(true);
  const instanceId = useRef(Math.random().toString(36).slice(2)).current;

  useEffect(() => {
    async function fetch() {
      setLoading(true);
      const { data, error } = await supabase
        .from("pools")
        .select("*, pool_standings(*, team:teams(id, name, slogan))")
        .eq("event_id", eventId)
        .order("sort_order");
      if (!error) {
        setPools(
          data.map((pool) => ({
            ...pool,
            pool_standings: pool.pool_standings.sort(
              (a, b) => (a.pool_rank || 99) - (b.pool_rank || 99)
            ),
          }))
        );
      }
      setLoading(false);
    }
    if (eventId) fetch();
  }, [eventId]);

  // Listen to standings updates
  useEffect(() => {
    if (!eventId) return;
    const channel = supabase
      .channel(`standings_${eventId}_${instanceId}`)
      .on(
        "postgres_changes",
        { event: "UPDATE", schema: "public", table: "pool_standings", filter: `event_id=eq.${eventId}` },
        () => {
          // Refetch all standings on any update (trigger recalculates ranks)
          supabase
            .from("pools")
            .select("*, pool_standings(*, team:teams(id, name, slogan))")
            .eq("event_id", eventId)
            .order("sort_order")
            .then(({ data }) => {
              if (data) {
                setPools(
                  data.map((pool) => ({
                    ...pool,
                    pool_standings: pool.pool_standings.sort(
                      (a, b) => (a.pool_rank || 99) - (b.pool_rank || 99)
                    ),
                  }))
                );
              }
            });
        }
      )
      .subscribe();
    return () => supabase.removeChannel(channel);
  }, [eventId]);

  return { pools, loading };
}

/**
 * Playing area status — used by TV display court grid, admin game day
 */
export function useRealtimeAreas(eventId) {
  return useRealtimeTable("playing_areas", eventId, true, {
    orderBy: "number",
  });
}

/**
 * Team data — used by live page, TV display, admin
 */
export function useRealtimeTeams(eventId) {
  const { data, loading } = useRealtimeTable("teams", eventId, true, {
    select: "*, players(*), pool:pools(name)",
    orderBy: "name",
  });

  const checkedIn = data.filter((t) => t.checked_in);
  const eliminated = data.filter((t) => t.eliminated);

  return { teams: data, checkedIn, eliminated, loading };
}

/**
 * Announcements — used by TV ticker, live page feed
 */
export function useRealtimeAnnouncements(eventId) {
  return useRealtimeTable("announcements", eventId, true, {
    filter: { active: true },
    orderBy: "created_at",
    ascending: false,
  });
}

/**
 * Playing area queue — used by admin game day for court allocation
 */
export function useRealtimeQueue(eventId) {
  return useRealtimeTable("playing_area_queue", eventId, true, {
    orderBy: "priority",
    ascending: false,
  });
}

// ═══════════════════════════════════════════════════════════
// CAPTAIN-SPECIFIC: Watch a single match for score updates
// ═══════════════════════════════════════════════════════════

/**
 * Watch a specific match for real-time score changes.
 * Used by the captain portal to detect when:
 * - Home captain submits a score (away captain sees verification screen)
 * - Away captain verifies/disputes (home captain sees result)
 */
export function useWatchMatch(matchId) {
  const [match, setMatch] = useState(null);
  const [loading, setLoading] = useState(true);
  const instanceId = useRef(Math.random().toString(36).slice(2)).current;

  useEffect(() => {
    async function fetch() {
      setLoading(true);
      const { data, error } = await supabase
        .from("matches")
        .select(
          "*, team_a:teams!matches_team_a_id_fkey(id, name), team_b:teams!matches_team_b_id_fkey(id, name), playing_area:playing_areas(number, name)"
        )
        .eq("id", matchId)
        .single();
      if (!error) setMatch(data);
      setLoading(false);
    }
    if (matchId) fetch();
  }, [matchId]);

  useEffect(() => {
    if (!matchId) return;
    const channel = supabase
      .channel(`match_${matchId}_${instanceId}`)
      .on(
        "postgres_changes",
        { event: "UPDATE", schema: "public", table: "matches", filter: `id=eq.${matchId}` },
        (payload) => {
          setMatch((prev) => ({ ...prev, ...payload.new }));
        }
      )
      .subscribe();
    return () => supabase.removeChannel(channel);
  }, [matchId]);

  return { match, loading };
}

// ═══════════════════════════════════════════════════════════
// ADMIN: Watch registrations for new submissions
// ═══════════════════════════════════════════════════════════

export function useRealtimeRegistrations(eventId) {
  return useRealtimeTable("registrations", eventId, true, {
    orderBy: "created_at",
    ascending: false,
  });
}
