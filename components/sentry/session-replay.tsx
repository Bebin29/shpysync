"use client";

import { useEffect } from "react";

/**
 * Session Replay Komponente für Sentry.
 *
 * Initialisiert Session Replay im Renderer-Prozess, wenn aktiviert.
 * Session Replay zeichnet UI-Interaktionen auf, um Fehler besser zu verstehen.
 *
 * WICHTIG: Datenschutz
 * - Alle Texte werden maskiert (maskAllText: true)
 * - Alle Medien werden blockiert (blockAllMedia: true)
 * - Nur 10% der Sessions werden normal aufgezeichnet
 * - 100% der Fehler-Sessions werden aufgezeichnet
 */
export function SentrySessionReplay(): null {
  useEffect(() => {
    // Prüfe ob Session Replay aktiviert ist
    if (typeof window === "undefined" || !window.electron) {
      return;
    }

    const initSessionReplay = async (): Promise<void> => {
      try {
        const config = await window.electron.errorReporting.getConfig();

        if (!config.enabled || !config.sessionReplay) {
          return;
        }

        // Dynamisch @sentry/react importieren (Code-Splitting)
        // Nur laden wenn Session Replay aktiviert ist
        const Sentry = await import("@sentry/react");
        const { Replay } = await import("@sentry/react");

        // Hole DSN aus Config oder Umgebungsvariable
        const dsn = process.env.NEXT_PUBLIC_SENTRY_DSN || config.dsn;

        if (!dsn) {
          console.warn("[Sentry Session Replay] DSN nicht konfiguriert");
          return;
        }

        // Initialisiere Sentry mit Session Replay
        Sentry.init({
          dsn,
          environment: process.env.NODE_ENV === "production" ? "production" : "development",
          integrations: [
            new Replay({
              // Datenschutz: Alle Texte maskieren
              maskAllText: true,
              // Datenschutz: Alle Medien blockieren
              blockAllMedia: true,
            }),
          ],
          // Session Replay Sampling-Raten (10% normal, 100% bei Fehlern)
          replaysSessionSampleRate: 0.1,
          replaysOnErrorSampleRate: 1.0,
        });

        console.log("[Sentry Session Replay] Initialisiert");
      } catch (error) {
        // Fehler beim Initialisieren sollten die App nicht beeinträchtigen
        console.warn("[Sentry Session Replay] Fehler bei Initialisierung:", error);
      }
    };

    initSessionReplay();
  }, []);

  // Keine UI - nur Initialisierung
  return null;
}
