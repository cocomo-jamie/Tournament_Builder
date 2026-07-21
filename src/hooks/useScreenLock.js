// src/hooks/useScreenLock.js
// ─────────────────────────────────────────────────────────
// Single-admin-at-a-time lock with FIFO queue, for screens
// where concurrent edits would conflict (e.g. Registrations
// payment/approval processing).
//
// Usage:
//   const { isActive, queuePosition, queueLength, recordActivity } =
//     useScreenLock(eventId, "registrations", adminUser?.id, adminUser?.display_name);
// ─────────────────────────────────────────────────────────

import { useState, useEffect, useRef, useCallback } from "react";
import { supabase } from "../supabaseClient";

const HEARTBEAT_INTERVAL_MS = 20_000;      // send heartbeat every 20s
const DISCONNECT_THRESHOLD_MS = 75_000;    // treat as gone if no heartbeat in 75s
const IDLE_TIMEOUT_MS = 5 * 60_000;        // 5 min of no real interaction releases active status

export function useScreenLock(eventId, resource, adminId, adminName) {
  const [queue, setQueue] = useState([]);
  const [myRowId, setMyRowId] = useState(null);
  const heartbeatRef = useRef(null);
  const idleCheckRef = useRef(null);
  const lastActivityRef = useRef(Date.now());

  useEffect(() => {
    if (!eventId || !adminId) return;
    let cancelled = false;

    const join = async () => {
      const { data, error } = await supabase
        .from("admin_lock_queue")
        .upsert(
          { event_id: eventId, resource, admin_id: adminId, admin_name: adminName, joined_at: new Date().toISOString(), last_heartbeat_at: new Date().toISOString(), last_activity_at: new Date().toISOString() },
          { onConflict: "event_id,resource,admin_id" }
        )
        .select()
        .single();
      if (!cancelled && !error && data) setMyRowId(data.id);
    };
    join();

    return () => {
      cancelled = true;
      supabase.from("admin_lock_queue").delete().eq("event_id", eventId).eq("resource", resource).eq("admin_id", adminId);
    };
  }, [eventId, resource, adminId, adminName]);

  useEffect(() => {
    if (!eventId || !adminId) return;
    heartbeatRef.current = setInterval(() => {
      supabase
        .from("admin_lock_queue")
        .update({ last_heartbeat_at: new Date().toISOString() })
        .eq("event_id", eventId)
        .eq("resource", resource)
        .eq("admin_id", adminId)
        .then(() => {});
    }, HEARTBEAT_INTERVAL_MS);
    return () => clearInterval(heartbeatRef.current);
  }, [eventId, resource, adminId]);

  const recordActivity = useCallback(() => {
    lastActivityRef.current = Date.now();
  }, []);

  useEffect(() => {
    if (!eventId || !adminId) return;
    idleCheckRef.current = setInterval(async () => {
      const idleFor = Date.now() - lastActivityRef.current;
      if (idleFor > IDLE_TIMEOUT_MS) {
        await supabase.from("admin_lock_queue").delete().eq("event_id", eventId).eq("resource", resource).eq("admin_id", adminId);
        const { data } = await supabase
          .from("admin_lock_queue")
          .insert({ event_id: eventId, resource, admin_id: adminId, admin_name: adminName, joined_at: new Date().toISOString(), last_heartbeat_at: new Date().toISOString(), last_activity_at: new Date().toISOString() })
          .select()
          .single();
        if (data) setMyRowId(data.id);
        lastActivityRef.current = Date.now();
      }
    }, 30_000);
    return () => clearInterval(idleCheckRef.current);
  }, [eventId, resource, adminId, adminName]);

  useEffect(() => {
    if (!eventId) return;

    const fetchQueue = async () => {
      const { data } = await supabase
        .from("admin_lock_queue")
        .select("*")
        .eq("event_id", eventId)
        .eq("resource", resource)
        .order("joined_at", { ascending: true });
      setQueue(data || []);
    };
    fetchQueue();

    const channel = supabase
      .channel(`lock_${eventId}_${resource}_${Math.random().toString(36).slice(2)}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "admin_lock_queue", filter: `event_id=eq.${eventId}` }, fetchQueue)
      .subscribe();

    const pollInterval = setInterval(fetchQueue, 30_000);

    return () => {
      supabase.removeChannel(channel);
      clearInterval(pollInterval);
    };
  }, [eventId, resource]);

  const now = Date.now();
  const liveQueue = queue.filter(q => now - new Date(q.last_heartbeat_at).getTime() < DISCONNECT_THRESHOLD_MS);
  const myIndex = liveQueue.findIndex(q => q.admin_id === adminId);
  const isActive = myIndex === 0;
  const queuePosition = myIndex;
  const queueLength = liveQueue.length;
  const activeAdminName = liveQueue[0]?.admin_name || null;

  return { isActive, queuePosition, queueLength, activeAdminName, recordActivity };
}
