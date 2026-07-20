// src/hooks/useEventConfig.js
// ─────────────────────────────────────────────────────────
// Fetches all event configuration from Supabase and returns
// the transformed config object that views consume.
//
// Usage:
//   const { config, loading, error, refetch } = useEventConfig(eventId);
//   if (loading) return <LoadingSpinner />;
//   if (error) return <ErrorDisplay error={error} />;
//   // config.brand.primary, config.event.name, etc.
// ─────────────────────────────────────────────────────────

import { useState, useEffect, useCallback } from "react";
import { events, sponsors, volunteers, giftBasket } from "../services/api";
import { transformEventToConfig } from "../utils/configTransformer";

export function useEventConfig(eventId) {
  const [config, setConfig] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchConfig = useCallback(async () => {
    if (!eventId) {
      setError(new Error("No event ID provided"));
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setError(null);

      // Fetch all data in parallel
      const [eventData, tierData, volunteerRoles, giftBasketItems] =
        await Promise.all([
          events.get(eventId),
          sponsors.listTiers(eventId),
          volunteers.listRoles(eventId),
          giftBasket.list(eventId),
        ]);

      // Flatten sponsors from tiers if they come nested,
      // or fetch separately if listTiers doesn't include them
      let allSponsors = [];
      if (tierData?.[0]?.sponsors) {
        // Tiers came with nested sponsors
        allSponsors = tierData.flatMap((t) => t.sponsors || []);
      } else {
        // Fetch sponsors separately
        try {
          const sponsorList = await sponsors.list(eventId);
          allSponsors = sponsorList || [];
        } catch {
          // sponsors.list may not exist — that's fine, tiers are enough
          allSponsors = [];
        }
      }

      const transformed = transformEventToConfig(eventData, {
        sponsorTiers: tierData || [],
        sponsors: allSponsors,
        volunteerRoles: volunteerRoles || [],
        giftBasketItems: giftBasketItems || [],
      });

      setConfig(transformed);
    } catch (err) {
      console.error("Failed to load event config:", err);
      setError(err);
    } finally {
      setLoading(false);
    }
  }, [eventId]);

  useEffect(() => {
    fetchConfig();
  }, [fetchConfig]);

  return { config, loading, error, refetch: fetchConfig };
}
