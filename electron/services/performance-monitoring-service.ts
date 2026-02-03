import { getErrorMonitoringService } from "./error-monitoring-service.js";

/**
 * Performance Monitoring Service für Sentry Integration.
 *
 * Bietet einfache Wrapper-Funktionen für Performance-Monitoring
 * von kritischen Operationen wie Sync, CSV-Parsing, API-Calls.
 */
export class PerformanceMonitoringService {
  /**
   * Misst die Ausführungszeit einer asynchronen Funktion und sendet sie an Sentry.
   *
   * HINWEIS: Für @sentry/electron v7 verwenden wir automatische Instrumentierung.
   * Diese Funktion fügt Breadcrumbs hinzu für besseren Kontext.
   *
   * @param name - Name der Operation (z.B. "sync.start", "csv.parse")
   * @param op - Operation-Typ (z.B. "sync", "parse", "api.call")
   * @param fn - Funktion, die gemessen werden soll
   * @returns Ergebnis der Funktion
   */
  async measureAsync<T>(name: string, op: string, fn: () => Promise<T>): Promise<T> {
    const errorMonitoring = getErrorMonitoringService();

    if (!errorMonitoring.isPerformanceMonitoringEnabled()) {
      // Performance Monitoring ist deaktiviert, führe Funktion normal aus
      return await fn();
    }

    // Füge Breadcrumb hinzu für Kontext (automatische Instrumentierung übernimmt Timing)
    errorMonitoring.addBreadcrumb(`Start: ${name}`, "performance", "info", { operation: op });

    try {
      const startTime = Date.now();
      const result = await fn();
      const duration = Date.now() - startTime;

      errorMonitoring.addBreadcrumb(`End: ${name}`, "performance", "info", {
        operation: op,
        duration: `${duration}ms`,
      });

      return result;
    } catch (error) {
      errorMonitoring.addBreadcrumb(`Error: ${name}`, "performance", "error", {
        operation: op,
      });
      throw error;
    }
  }

  /**
   * Misst die Ausführungszeit einer synchronen Funktion und sendet sie an Sentry.
   *
   * HINWEIS: Für @sentry/electron v7 verwenden wir automatische Instrumentierung.
   * Diese Funktion fügt Breadcrumbs hinzu für besseren Kontext.
   *
   * @param name - Name der Operation
   * @param op - Operation-Typ
   * @param fn - Funktion, die gemessen werden soll
   * @returns Ergebnis der Funktion
   */
  measureSync<T>(name: string, op: string, fn: () => T): T {
    const errorMonitoring = getErrorMonitoringService();

    if (!errorMonitoring.isPerformanceMonitoringEnabled()) {
      // Performance Monitoring ist deaktiviert, führe Funktion normal aus
      return fn();
    }

    // Füge Breadcrumb hinzu für Kontext
    errorMonitoring.addBreadcrumb(`Start: ${name}`, "performance", "info", { operation: op });

    try {
      const startTime = Date.now();
      const result = fn();
      const duration = Date.now() - startTime;

      errorMonitoring.addBreadcrumb(`End: ${name}`, "performance", "info", {
        operation: op,
        duration: `${duration}ms`,
      });

      return result;
    } catch (error) {
      errorMonitoring.addBreadcrumb(`Error: ${name}`, "performance", "error", {
        operation: op,
      });
      throw error;
    }
  }

  /**
   * Erstellt einen manuellen Span für eine Operation.
   *
   * HINWEIS: Für @sentry/electron v7 verwenden wir automatische Instrumentierung.
   * Diese Funktion ist ein Wrapper für measureAsync().
   *
   * @param _transaction - Parent-Transaktion (nicht verwendet in v7)
   * @param name - Name des Spans
   * @param op - Operation-Typ
   * @param fn - Funktion, die gemessen werden soll
   * @returns Ergebnis der Funktion
   */
  async measureSpan<T>(
    _transaction: unknown,
    name: string,
    op: string,
    fn: () => Promise<T>
  ): Promise<T> {
    // Verwende measureAsync für automatische Instrumentierung
    return await this.measureAsync(name, op, fn);
  }
}

/**
 * Singleton-Instanz des Performance-Monitoring-Services.
 */
let performanceMonitoringServiceInstance: PerformanceMonitoringService | null = null;

/**
 * Gibt die Performance-Monitoring-Service-Instanz zurück (Singleton).
 */
export function getPerformanceMonitoringService(): PerformanceMonitoringService {
  if (!performanceMonitoringServiceInstance) {
    performanceMonitoringServiceInstance = new PerformanceMonitoringService();
  }
  return performanceMonitoringServiceInstance;
}
