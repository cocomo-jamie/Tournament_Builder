// src/context/EventContext.jsx
// ─────────────────────────────────────────────────────────
// React Context that provides event config to all views.
//
// Wraps the app so any component can:
//   const { config, eventId, loading, error } = useEvent();
//
// The provider fetches config once and shares it. Views that
// need to refresh (e.g. after admin updates) call refetch().
// ─────────────────────────────────────────────────────────

import { createContext, useContext } from "react";
import { useEventConfig } from "../hooks/useEventConfig";

const EventContext = createContext(null);

/**
 * Wrap routes that need event config with this provider.
 *
 * @param {string} eventId - UUID of the current event
 * @param {React.ReactNode} children
 */
export function EventProvider({ eventId, children }) {
  const { config, loading, error, refetch } = useEventConfig(eventId);

  return (
    <EventContext.Provider value={{ config, eventId, loading, error, refetch }}>
      {children}
    </EventContext.Provider>
  );
}

/**
 * Access event config from any child component.
 *
 * @returns {{ config: Object|null, eventId: string, loading: boolean, error: Error|null, refetch: Function }}
 */
export function useEvent() {
  const ctx = useContext(EventContext);
  if (!ctx) {
    throw new Error("useEvent() must be used within an <EventProvider>");
  }
  return ctx;
}
