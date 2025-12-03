/**
 * Error-Handler für IPC-Kommunikation.
 *
 * Konvertiert WawiError zu ErrorInfo für IPC-Übertragung.
 *
 * WICHTIG: In Produktion werden keine Stack-Traces oder sensiblen Daten
 * an den Renderer-Prozess übertragen.
 */

import { app } from "electron";
import { WawiError } from "../../core/domain/errors.js";
import type { ErrorInfo } from "../types/ipc.js";

/**
 * Prüft, ob die App im Development-Modus läuft.
 */
function isDevelopment(): boolean {
  return !app.isPackaged || process.env.NODE_ENV === "development";
}

/**
 * Sanitized Error-Details für Produktion.
 * Entfernt Stack-Traces und sensible Daten.
 */
function sanitizeErrorDetails(details: unknown, isDev: boolean): unknown {
  if (!isDev) {
    // In Produktion: Nur nicht-sensitive Informationen behalten
    if (typeof details === "object" && details !== null) {
      const sanitized: Record<string, unknown> = {};
      const detailsObj = details as Record<string, unknown>;

      // Erlaube nur bestimmte Felder
      const allowedFields = ["status", "code", "retryAfter", "missingScopes"];
      for (const key of allowedFields) {
        // eslint-disable-next-line security/detect-object-injection
        if (key in detailsObj) {
          // eslint-disable-next-line security/detect-object-injection
          sanitized[key] = detailsObj[key];
        }
      }

      return Object.keys(sanitized).length > 0 ? sanitized : undefined;
    }
    return undefined;
  }

  // In Development: Alle Details behalten
  return details;
}

/**
 * Konvertiert einen Error zu ErrorInfo für IPC-Übertragung.
 *
 * WICHTIG: Stack-Traces werden nur im Development-Modus übertragen.
 */
export function errorToErrorInfo(error: unknown): ErrorInfo {
  const isDev = isDevelopment();

  if (error instanceof WawiError) {
    // Sanitize Details für Produktion
    const sanitizedDetails = sanitizeErrorDetails(error.details, isDev);

    return {
      code: error.code,
      message: error.message,
      severity: error.severity,
      details: sanitizedDetails,
      userMessage: error.getUserMessage(),
    };
  }

  if (error instanceof Error) {
    // In Produktion: Keine Stack-Traces
    const details = isDev
      ? {
          name: error.name,
          stack: error.stack,
        }
      : {
          name: error.name,
        };

    return {
      code: "INTERNAL_UNEXPECTED",
      message: error.message,
      severity: "error",
      details,
      userMessage: "Ein unerwarteter Fehler ist aufgetreten.",
    };
  }

  return {
    code: "INTERNAL_UNEXPECTED",
    message: String(error),
    severity: "error",
    details: isDev ? { originalError: error } : undefined,
    userMessage: "Ein unerwarteter Fehler ist aufgetreten.",
  };
}

/**
 * Wrapper für IPC-Handler, der Fehler automatisch zu ErrorInfo konvertiert.
 *
 * @param handler - Async Handler-Funktion
 * @returns Wrapped Handler mit Error-Handling
 */
export function withErrorHandling<T extends (...args: unknown[]) => Promise<unknown>>(
  handler: T
): T {
  return (async (...args: Parameters<T>) => {
    try {
      const result = await handler(...args);
      return result;
    } catch (error) {
      const errorInfo = errorToErrorInfo(error);
      console.error(`IPC Handler Error [${errorInfo.code}]:`, errorInfo.message, errorInfo.details);

      // Werfe den Fehler weiter (wird von Electron behandelt)
      // IPC-Handler sollten selbst entscheiden, wie sie Fehler zurückgeben
      throw error;
    }
  }) as T;
}
