/**
 * Utility-Funktionen für Performance-Messungen
 *
 * Diese Utilities helfen bei der Sammlung und Analyse von Performance-Metriken
 * in Performance-Tests.
 */

/**
 * Memory-Usage-Informationen
 */
export interface MemoryUsage {
  heapUsed: number;
  heapTotal: number;
  external: number;
  rss: number;
  timestamp: number;
}

/**
 * Performance-Metrik
 */
export interface PerformanceMetric {
  name: string;
  duration: number;
  memoryBefore?: MemoryUsage;
  memoryAfter?: MemoryUsage;
  timestamp: number;
}

/**
 * Sammelt aktuelle Memory-Usage-Informationen
 */
export function getMemoryUsage(): MemoryUsage {
  const usage = process.memoryUsage();
  return {
    heapUsed: usage.heapUsed,
    heapTotal: usage.heapTotal,
    external: usage.external,
    rss: usage.rss,
    timestamp: Date.now(),
  };
}

/**
 * Formatiert Bytes in lesbares Format
 */
export function formatBytes(bytes: number): string {
  if (bytes === 0) return "0 Bytes";
  const k = 1024;
  const sizes = ["Bytes", "KB", "MB", "GB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  // eslint-disable-next-line security/detect-object-injection
  return `${Math.round((bytes / Math.pow(k, i)) * 100) / 100} ${sizes[i]}`;
}

/**
 * Misst die Ausführungszeit einer Funktion
 */
export async function measureExecutionTime<T>(
  fn: () => Promise<T> | T,
  name?: string
): Promise<{ result: T; duration: number }> {
  const start = performance.now();
  const result = await fn();
  const end = performance.now();
  const duration = end - start;

  if (name) {
    console.log(`[Performance] ${name}: ${duration.toFixed(2)}ms`);
  }

  return { result, duration };
}

/**
 * Misst Memory-Usage vor und nach einer Operation
 */
export async function measureMemoryUsage<T>(
  fn: () => Promise<T> | T,
  name?: string
): Promise<{ result: T; memoryBefore: MemoryUsage; memoryAfter: MemoryUsage; delta: number }> {
  // Force garbage collection if available
  if (global.gc) {
    global.gc();
  }

  const memoryBefore = getMemoryUsage();
  const result = await fn();

  // Force garbage collection if available
  if (global.gc) {
    global.gc();
  }

  // Warte kurz, damit Memory-Statistiken aktualisiert werden
  await new Promise((resolve) => setTimeout(resolve, 100));

  const memoryAfter = getMemoryUsage();
  const delta = memoryAfter.heapUsed - memoryBefore.heapUsed;

  if (name) {
    console.log(`[Memory] ${name}:`);
    console.log(`  Before: ${formatBytes(memoryBefore.heapUsed)}`);
    console.log(`  After:  ${formatBytes(memoryAfter.heapUsed)}`);
    console.log(
      `  Delta:  ${formatBytes(delta)} (${delta > 0 ? "+" : ""}${((delta / memoryBefore.heapUsed) * 100).toFixed(2)}%)`
    );
  }

  return { result, memoryBefore, memoryAfter, delta };
}

/**
 * Sammelt Performance-Metriken für eine Operation
 */
export async function collectMetrics<T>(
  fn: () => Promise<T> | T,
  name: string
): Promise<{ result: T; metric: PerformanceMetric }> {
  const memoryBefore = getMemoryUsage();
  const start = performance.now();

  const result = await fn();

  const end = performance.now();
  const memoryAfter = getMemoryUsage();

  const metric: PerformanceMetric = {
    name,
    duration: end - start,
    memoryBefore,
    memoryAfter,
    timestamp: Date.now(),
  };

  return { result, metric };
}

/**
 * Vergleicht zwei Performance-Metriken
 */
export function compareMetrics(
  baseline: PerformanceMetric,
  current: PerformanceMetric
): {
  durationDiff: number;
  durationDiffPercent: number;
  memoryDiff: number;
  memoryDiffPercent: number;
} {
  const durationDiff = current.duration - baseline.duration;
  const durationDiffPercent = (durationDiff / baseline.duration) * 100;

  const baselineMemory = baseline.memoryAfter?.heapUsed ?? 0;
  const currentMemory = current.memoryAfter?.heapUsed ?? 0;
  const memoryDiff = currentMemory - baselineMemory;
  const memoryDiffPercent = baselineMemory > 0 ? (memoryDiff / baselineMemory) * 100 : 0;

  return {
    durationDiff,
    durationDiffPercent,
    memoryDiff,
    memoryDiffPercent,
  };
}

/**
 * Erstellt einen Benchmark-Report
 */
export function createBenchmarkReport(metrics: PerformanceMetric[]): string {
  const lines: string[] = ["=== Performance Benchmark Report ===", ""];

  metrics.forEach((metric) => {
    lines.push(`[${metric.name}]`);
    lines.push(`  Duration: ${metric.duration.toFixed(2)}ms`);
    if (metric.memoryBefore && metric.memoryAfter) {
      const delta = metric.memoryAfter.heapUsed - metric.memoryBefore.heapUsed;
      lines.push(
        `  Memory: ${formatBytes(metric.memoryBefore.heapUsed)} → ${formatBytes(metric.memoryAfter.heapUsed)} (${delta > 0 ? "+" : ""}${formatBytes(delta)})`
      );
    }
    lines.push("");
  });

  return lines.join("\n");
}

/**
 * Prüft, ob Event-Listener korrekt aufgeräumt wurden
 */
export function checkEventListeners(): {
  activeListeners: number;
  maxListeners: number;
} {
  // Diese Funktion kann erweitert werden, um spezifische Event-Listener zu prüfen
  // Für jetzt geben wir nur allgemeine Informationen zurück
  return {
    activeListeners:
      process.listenerCount("uncaughtException") + process.listenerCount("unhandledRejection"),
    maxListeners: process.getMaxListeners(),
  };
}
