import {
  init,
  captureException,
  addBreadcrumb,
  setUser,
  setTag,
  setContext,
  close,
} from "@sentry/electron/main";
import type { ErrorEvent, EventHint, Breadcrumb } from "@sentry/core";
import { app } from "electron";
import { getConfig } from "./config-service.js";
import { WawiError } from "../../core/domain/errors.js";
import { getLogger } from "./logger.js";

/**
 * Error Monitoring Service für Sentry Integration.
 *
 * Sendet Fehler automatisch an Sentry für Remote-Monitoring.
 * WICHTIG: Nur wenn Error-Reporting in den Einstellungen aktiviert ist.
 */
export class ErrorMonitoringService {
  private isInitialized = false;
  private isEnabled = false;
  private isEnabledExplicitlySet = false; // Flag, um zu markieren, ob isEnabled explizit gesetzt wurde
  private logger = getLogger();

  /**
   * Initialisiert Sentry mit DSN und Konfiguration.
   * Wird beim App-Start aufgerufen, wenn Error-Reporting aktiviert ist.
   */
  initialize(): void {
    if (this.isInitialized) {
      return;
    }

    const config = getConfig();
    // Nur überschreiben, wenn isEnabled noch nicht explizit gesetzt wurde
    // (z.B. durch setEnabled() vor dem initialize() Aufruf)
    if (!this.isEnabledExplicitlySet) {
      this.isEnabled = config.errorReporting?.enabled ?? false; // Default: Opt-in (false)
    }

    if (!this.isEnabled) {
      this.logger.debug("error-monitoring", "Error Reporting ist deaktiviert");
      return;
    }

    // Sentry DSN aus Umgebungsvariable oder Config
    const dsn = process.env.SENTRY_DSN || config.errorReporting?.dsn;

    if (!dsn) {
      this.logger.warn(
        "error-monitoring",
        "Sentry DSN nicht konfiguriert. Error Monitoring deaktiviert."
      );
      return;
    }

    try {
      init({
        dsn,
        environment: app.isPackaged ? "production" : "development",
        release: app.getVersion(),
        // Nur kritische Fehler senden (spart Events)
        beforeSend(event: ErrorEvent, _hint: EventHint) {
          // Filtere nur error und fatal
          if (event.level === "info" || event.level === "warning") {
            return null; // Nicht senden
          }

          // Anonymisiere sensible Daten aus Tags
          if (event.tags) {
            Object.keys(event.tags).forEach((key) => {
              const value = event.tags?.[key];
              if (typeof value === "string") {
                if (
                  value.includes("shpat_") ||
                  value.includes("shpca_") ||
                  value.includes(".myshopify.com")
                ) {
                  if (event.tags) {
                    event.tags[key] = "[REDACTED]";
                  }
                }
              }
            });
          }

          // Entferne sensible Daten aus Context
          if (event.contexts) {
            Object.keys(event.contexts).forEach((key) => {
              const context = event.contexts?.[key];
              if (context && typeof context === "object") {
                Object.keys(context).forEach((contextKey) => {
                  const contextValue = (context as Record<string, unknown>)[contextKey];
                  if (typeof contextValue === "string") {
                    if (
                      contextValue.includes("shpat_") ||
                      contextValue.includes("shpca_") ||
                      contextValue.includes(".myshopify.com")
                    ) {
                      (context as Record<string, unknown>)[contextKey] = "[REDACTED]";
                    }
                  }
                });
              }
            });
          }

          return event;
        },
        // Anonymisiere sensible Daten aus Breadcrumbs
        beforeBreadcrumb(breadcrumb: Breadcrumb) {
          if (breadcrumb.data) {
            // Entferne Token-ähnliche Strings
            Object.keys(breadcrumb.data).forEach((key) => {
              const value = breadcrumb.data?.[key];
              if (typeof value === "string") {
                // Erkenne Token-Muster
                if (
                  value.includes("shpat_") ||
                  value.includes("shpca_") ||
                  value.includes("token") ||
                  value.includes("accessToken") ||
                  value.includes("access_token")
                ) {
                  if (breadcrumb.data) {
                    breadcrumb.data[key] = "[REDACTED]";
                  }
                }
                // Erkenne Shop-URLs (nur Hash senden)
                if (value.includes(".myshopify.com")) {
                  // Ersetze durch Hash
                  try {
                    const url = new URL(value);
                    if (breadcrumb.data) {
                      breadcrumb.data[key] = `[SHOP_HASH:${url.hostname.slice(0, 10)}...]`;
                    }
                  } catch {
                    if (breadcrumb.data) {
                      breadcrumb.data[key] = "[REDACTED]";
                    }
                  }
                }
              }
            });
          }
          return breadcrumb;
        },
      });

      // Setze User Context (anonymisiert - KEINE persönlichen Daten)
      setUser({
        id: undefined, // Keine User-ID
        username: undefined, // Kein Username
        email: undefined, // Keine E-Mail
        ip_address: undefined, // Keine IP
      });

      // Setze Tags für bessere Filterung
      setTag("app_version", app.getVersion());
      setTag("electron_version", process.versions.electron);
      setTag("platform", process.platform);
      setTag("node_version", process.versions.node);

      this.isInitialized = true;
      this.logger.info("error-monitoring", "Sentry Error Monitoring initialisiert", {
        environment: app.isPackaged ? "production" : "development",
        release: app.getVersion(),
      });
    } catch (error) {
      this.logger.error("error-monitoring", "Fehler beim Initialisieren von Sentry", {
        error: error instanceof Error ? error.message : String(error),
      });
    }
  }

  /**
   * Sendet einen Fehler an Sentry.
   * Wird automatisch vom Logger und Error-Handler aufgerufen.
   *
   * @param error - Fehler-Objekt (Error oder WawiError)
   * @param context - Zusätzlicher Kontext (optional)
   */
  captureError(error: Error | WawiError, context?: Record<string, unknown>): void {
    if (!this.isEnabled || !this.isInitialized) {
      return;
    }

    try {
      // Bereite Kontext vor (anonymisiert)
      const sanitizedContext: Record<string, unknown> = {};

      if (context) {
        Object.keys(context).forEach((key) => {
          const value = context[key];
          if (typeof value === "string") {
            // Anonymisiere sensible Daten
            if (
              value.includes("shpat_") ||
              value.includes("shpca_") ||
              value.includes("token") ||
              value.includes("accessToken")
            ) {
              sanitizedContext[key] = "[REDACTED]";
            } else if (value.includes(".myshopify.com")) {
              // Shop-URL anonymisieren (nur Hash)
              try {
                const url = new URL(value);
                sanitizedContext[key] = `[SHOP_HASH:${url.hostname.slice(0, 10)}...]`;
              } catch {
                sanitizedContext[key] = "[REDACTED]";
              }
            } else {
              sanitizedContext[key] = value;
            }
          } else {
            sanitizedContext[key] = value;
          }
        });
      }

      // Setze zusätzliche Tags für WawiError
      if (error instanceof WawiError) {
        setTag("error_code", error.code);
        setTag("error_severity", error.severity);

        // Setze Kontext
        setContext("wawi_error", {
          code: error.code,
          severity: error.severity,
          ...sanitizedContext,
        });
      }

      // Setze Level basierend auf Severity
      const level: "fatal" | "error" | "warning" | "info" | "debug" =
        error instanceof WawiError && error.severity === "fatal"
          ? "fatal"
          : error instanceof WawiError && error.severity === "warning"
            ? "warning"
            : "error";

      // Sende Fehler an Sentry
      captureException(error, {
        level,
        tags: {
          error_type: error instanceof WawiError ? "WawiError" : "Error",
        },
        contexts: sanitizedContext ? { additional: sanitizedContext } : undefined,
      });
    } catch (sentryError) {
      // Fehler beim Senden an Sentry sollten nicht die App beeinträchtigen
      this.logger.warn("error-monitoring", "Fehler beim Senden an Sentry", {
        error: sentryError instanceof Error ? sentryError.message : String(sentryError),
      });
    }
  }

  /**
   * Setzt zusätzlichen Kontext für zukünftige Events.
   * Wird z.B. während eines Syncs aufgerufen, um Kontext zu setzen.
   *
   * @param key - Kontext-Schlüssel
   * @param context - Kontext-Daten (werden anonymisiert)
   */
  setContext(key: string, context: Record<string, unknown>): void {
    if (!this.isEnabled || !this.isInitialized) {
      return;
    }

    try {
      // Anonymisiere sensible Daten
      const sanitizedContext: Record<string, unknown> = {};

      Object.keys(context).forEach((contextKey) => {
        const value = context[contextKey];
        if (typeof value === "string") {
          if (
            value.includes("shpat_") ||
            value.includes("shpca_") ||
            value.includes("token") ||
            value.includes(".myshopify.com")
          ) {
            sanitizedContext[contextKey] = "[REDACTED]";
          } else {
            sanitizedContext[contextKey] = value;
          }
        } else {
          sanitizedContext[contextKey] = value;
        }
      });

      setContext(key, sanitizedContext);
    } catch (error) {
      this.logger.warn("error-monitoring", "Fehler beim Setzen von Kontext", {
        error: error instanceof Error ? error.message : String(error),
      });
    }
  }

  /**
   * Fügt einen Breadcrumb hinzu (für besseren Kontext).
   *
   * @param message - Breadcrumb-Nachricht
   * @param category - Kategorie (z.B. "sync", "config")
   * @param level - Level (default: "info")
   * @param data - Zusätzliche Daten (werden anonymisiert)
   */
  addBreadcrumb(
    message: string,
    category: string,
    level: "fatal" | "error" | "warning" | "info" | "debug" = "info",
    data?: Record<string, unknown>
  ): void {
    if (!this.isEnabled || !this.isInitialized) {
      return;
    }

    try {
      // Anonymisiere sensible Daten
      const sanitizedData: Record<string, unknown> = {};

      if (data) {
        Object.keys(data).forEach((key) => {
          const value = data[key];
          if (typeof value === "string") {
            if (
              value.includes("shpat_") ||
              value.includes("shpca_") ||
              value.includes("token") ||
              value.includes(".myshopify.com")
            ) {
              sanitizedData[key] = "[REDACTED]";
            } else {
              sanitizedData[key] = value;
            }
          } else {
            sanitizedData[key] = value;
          }
        });
      }

      addBreadcrumb({
        message,
        category,
        level,
        data: sanitizedData,
        timestamp: Date.now() / 1000,
      });
    } catch (error) {
      // Fehler beim Hinzufügen von Breadcrumbs sollten nicht die App beeinträchtigen
      this.logger.warn("error-monitoring", "Fehler beim Hinzufügen von Breadcrumb", {
        error: error instanceof Error ? error.message : String(error),
      });
    }
  }

  /**
   * Aktiviert oder deaktiviert Error Monitoring.
   * Wird von IPC-Handler aufgerufen, wenn Benutzer Einstellung ändert.
   *
   * @param enabled - Ob Error Monitoring aktiviert sein soll
   */
  setEnabled(enabled: boolean): void {
    this.isEnabled = enabled;
    this.isEnabledExplicitlySet = true; // Markiere, dass isEnabled explizit gesetzt wurde

    if (enabled && !this.isInitialized) {
      // Initialisiere Sentry wenn aktiviert
      this.initialize();
    } else if (!enabled && this.isInitialized) {
      // Deaktiviere Sentry wenn deaktiviert
      try {
        close();
        this.isInitialized = false;
        this.logger.info("error-monitoring", "Sentry Error Monitoring deaktiviert");
      } catch (error) {
        this.logger.warn("error-monitoring", "Fehler beim Deaktivieren von Sentry", {
          error: error instanceof Error ? error.message : String(error),
        });
      }
    }
  }

  /**
   * Gibt zurück, ob Error Monitoring aktiviert ist.
   *
   * @returns true wenn aktiviert
   */
  isErrorMonitoringEnabled(): boolean {
    return this.isEnabled && this.isInitialized;
  }
}

/**
 * Singleton-Instanz des Error-Monitoring-Services.
 */
let errorMonitoringServiceInstance: ErrorMonitoringService | null = null;

/**
 * Gibt die Error-Monitoring-Service-Instanz zurück (Singleton).
 */
export function getErrorMonitoringService(): ErrorMonitoringService {
  if (!errorMonitoringServiceInstance) {
    errorMonitoringServiceInstance = new ErrorMonitoringService();
  }
  return errorMonitoringServiceInstance;
}
