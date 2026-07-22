"use client";

import { useEffect } from "react";
import { track, type AnalyticsEvent } from "@/lib/analytics";

/**
 * Dispara um evento PostHog uma vez, ao montar. Existe pra permitir tracking
 * de "visualizou a página" a partir de Server Components (que não podem
 * chamar track() diretamente) sem converter a página inteira em Client
 * Component só por causa disso.
 */
export function ViewTracker({
  event,
  properties,
}: {
  event: AnalyticsEvent;
  properties?: Record<string, unknown>;
}) {
  useEffect(() => {
    track(event, properties);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return null;
}
