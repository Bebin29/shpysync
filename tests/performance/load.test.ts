/**
 * Load-Testing für Sync-Operationen
 *
 * Diese Tests prüfen die Performance unter Last:
 * - Große CSV-Dateien (1000+, 10000+ Zeilen)
 * - Batch-Processing-Performance
 * - Concurrent-Operation-Tests
 * - Rate-Limiting-Verhalten
 */

import { describe, it, expect, beforeEach, afterEach } from "vitest";
import * as path from "path";
import * as fs from "fs";
import { parseCsv } from "../../core/infra/csv/parser.js";
import {
  measureExecutionTime,
  measureMemoryUsage,
  collectMetrics,
  formatBytes,
  getMemoryUsage,
  type PerformanceMetric,
} from "./helpers/performance-utils.js";

/**
 * Load-Test-Thresholds
 */
const LOAD_THRESHOLDS = {
  CSV_1000_ROWS: 2000, // < 2s für 1000 Zeilen
  CSV_10000_ROWS: 20000, // < 20s für 10000 Zeilen
  BATCH_100_ITEMS: 500, // < 500ms für Batch von 100 Items
  CONCURRENT_10: 5000, // < 5s für 10 concurrent Operations
};

describe("Load Testing", () => {
  let tempDir: string;

  beforeEach(() => {
    // eslint-disable-next-line security/detect-non-literal-fs-filename
    tempDir = fs.mkdtempSync(path.join(process.cwd(), "temp-test-"));
  });

  afterEach(() => {
    if (fs.existsSync(tempDir)) {
      fs.rmSync(tempDir, { recursive: true, force: true });
    }
  });

  describe("Large CSV Files", () => {
    it("should handle 1000-row CSV files efficiently", async () => {
      const csvPath = path.join(tempDir, "large-1000.csv");
      const headers = "SKU;Name;Preis;Bestand\n";
      const rows: string[] = [];

      // Generiere 1000 Zeilen
      for (let i = 0; i < 1000; i++) {
        rows.push(
          `SKU-${i.toString().padStart(4, "0")};Produkt ${i};${(Math.random() * 100).toFixed(2)};${Math.floor(Math.random() * 100)}`
        );
      }

      // eslint-disable-next-line security/detect-non-literal-fs-filename
      fs.writeFileSync(csvPath, headers + rows.join("\n"), "utf-8");

      const { duration } = await measureExecutionTime(() => {
        return parseCsv(csvPath);
      }, "Load Test: 1000 rows");

      expect(duration).toBeLessThan(LOAD_THRESHOLDS.CSV_1000_ROWS);

      // Prüfe, dass alle Zeilen geparst wurden
      const result = parseCsv(csvPath);
      expect(result.rows.length).toBe(1000);
    });

    it("should handle 10000-row CSV files within threshold", async () => {
      const csvPath = path.join(tempDir, "large-10000.csv");
      const headers = "SKU;Name;Preis;Bestand\n";
      const rows: string[] = [];

      // Generiere 10000 Zeilen
      console.log("[Load Test] Generating 10000-row CSV...");
      for (let i = 0; i < 10000; i++) {
        rows.push(
          `SKU-${i.toString().padStart(5, "0")};Produkt ${i};${(Math.random() * 100).toFixed(2)};${Math.floor(Math.random() * 100)}`
        );
      }

      // eslint-disable-next-line security/detect-non-literal-fs-filename
      // eslint-disable-next-line security/detect-non-literal-fs-filename
      fs.writeFileSync(csvPath, headers + rows.join("\n"), "utf-8");
      // eslint-disable-next-line security/detect-non-literal-fs-filename
      console.log("[Load Test] CSV file created, size:", formatBytes(fs.statSync(csvPath).size));

      const { duration } = await measureExecutionTime(() => {
        return parseCsv(csvPath);
      }, "Load Test: 10000 rows");

      expect(duration).toBeLessThan(LOAD_THRESHOLDS.CSV_10000_ROWS);

      // Prüfe, dass alle Zeilen geparst wurden
      const result = parseCsv(csvPath);
      expect(result.rows.length).toBe(10000);
    });

    it("should handle CSV files with various edge cases at scale", async () => {
      const csvPath = path.join(tempDir, "edge-cases-1000.csv");
      const headers = "SKU;Name;Preis;Bestand\n";
      const rows: string[] = [];

      // Generiere 1000 Zeilen mit verschiedenen Edge-Cases
      for (let i = 0; i < 1000; i++) {
        const price =
          i % 10 === 0 ? `"${(Math.random() * 100).toFixed(2)}"` : (Math.random() * 100).toFixed(2);
        const name = i % 5 === 0 ? `"Produkt mit, Komma ${i}"` : `Produkt ${i}`;
        rows.push(`SKU-${i};${name};${price};${Math.floor(Math.random() * 100)}`);
      }

      // eslint-disable-next-line security/detect-non-literal-fs-filename
      fs.writeFileSync(csvPath, headers + rows.join("\n"), "utf-8");

      const { duration } = await measureExecutionTime(() => {
        return parseCsv(csvPath);
      }, "Load Test: Edge Cases 1000 rows");

      expect(duration).toBeLessThan(LOAD_THRESHOLDS.CSV_1000_ROWS);
    });
  });

  describe("Batch Processing Performance", () => {
    it("should process batches of 100 items efficiently", async () => {
      const items = Array.from({ length: 100 }, (_, i) => ({
        id: `item-${i}`,
        data: `Data for item ${i}`,
      }));

      const { duration } = await measureExecutionTime(() => {
        // Simuliere Batch-Processing
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const batches: any[][] = [];
        const BATCH_SIZE = 10;

        for (let i = 0; i < items.length; i += BATCH_SIZE) {
          const batch = items.slice(i, i + BATCH_SIZE);
          batches.push(batch);
        }

        // Simuliere Verarbeitung jedes Batches
        return batches.map((batch) => batch.map((item) => ({ ...item, processed: true })));
      }, "Batch Processing: 100 items");

      expect(duration).toBeLessThan(LOAD_THRESHOLDS.BATCH_100_ITEMS);
    });

    it("should handle large batches without memory issues", async () => {
      const items = Array.from({ length: 1000 }, (_, i) => ({
        id: `item-${i}`,
        data: `Data for item ${i}`,
      }));

      const { delta } = await measureMemoryUsage(() => {
        // Simuliere Batch-Processing für 1000 Items
        const BATCH_SIZE = 50;
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const batches: any[][] = [];

        for (let i = 0; i < items.length; i += BATCH_SIZE) {
          const batch = items.slice(i, i + BATCH_SIZE);
          batches.push(batch);
        }

        return batches;
      }, "Batch Processing: 1000 items");

      console.log(`[Batch Processing] Memory Delta: ${formatBytes(delta)}`);

      // Memory-Delta sollte nicht zu groß sein
      expect(Math.abs(delta)).toBeLessThan(100 * 1024 * 1024); // 100MB
    });
  });

  describe("Concurrent Operations", () => {
    it("should handle 10 concurrent CSV parsing operations", async () => {
      // Erstelle 10 CSV-Dateien
      const csvFiles: string[] = [];
      for (let i = 0; i < 10; i++) {
        const csvPath = path.join(tempDir, `concurrent-${i}.csv`);
        const headers = "SKU;Name;Preis;Bestand\n";
        const rows: string[] = [];

        for (let j = 0; j < 100; j++) {
          rows.push(
            `SKU-${i}-${j};Produkt ${i}-${j};${(Math.random() * 100).toFixed(2)};${Math.floor(Math.random() * 100)}`
          );
        }

        // eslint-disable-next-line security/detect-non-literal-fs-filename
        fs.writeFileSync(csvPath, headers + rows.join("\n"), "utf-8");
        csvFiles.push(csvPath);
      }

      const { duration } = await measureExecutionTime(async () => {
        // Führe alle Parsing-Operationen parallel aus
        const promises = csvFiles.map((file) => Promise.resolve(parseCsv(file)));
        return Promise.all(promises);
      }, "Concurrent: 10 CSV files");

      expect(duration).toBeLessThan(LOAD_THRESHOLDS.CONCURRENT_10);
    });

    it("should handle concurrent operations without memory leaks", async () => {
      const csvPath = path.join(__dirname, "../fixtures/sample.csv");
      const memoryBefore = getMemoryUsage();

      // Führe 20 concurrent Parsing-Operationen durch
      const promises = Array.from({ length: 20 }, () => Promise.resolve(parseCsv(csvPath)));

      await Promise.all(promises);

      // Force garbage collection
      if (global.gc) {
        global.gc();
      }

      await new Promise((resolve) => setTimeout(resolve, 500));

      const memoryAfter = getMemoryUsage();

      const delta = memoryAfter.heapUsed - memoryBefore.heapUsed;

      console.log(`[Concurrent Memory] Delta: ${formatBytes(delta)}`);

      // Memory sollte nicht signifikant erhöht sein
      expect(Math.abs(delta)).toBeLessThan(50 * 1024 * 1024); // 50MB
    });
  });

  describe("Rate Limiting Simulation", () => {
    it("should handle rate-limited operations efficiently", async () => {
      // Simuliere Rate-Limiting (z.B. Shopify API)
      const RATE_LIMIT = 2; // 2 Operationen pro Sekunde
      const OPERATIONS = 10;

      const { duration } = await measureExecutionTime(async () => {
        for (let i = 0; i < OPERATIONS; i++) {
          // Simuliere API-Call
          await new Promise((resolve) => setTimeout(resolve, 1000 / RATE_LIMIT));
        }
      }, `Rate Limiting: ${OPERATIONS} operations at ${RATE_LIMIT}/s`);

      // Dauer sollte etwa OPERATIONS / RATE_LIMIT Sekunden sein
      const expectedDuration = (OPERATIONS / RATE_LIMIT) * 1000;
      const tolerance = expectedDuration * 0.2; // 20% Toleranz

      expect(duration).toBeGreaterThan(expectedDuration - tolerance);
      expect(duration).toBeLessThan(expectedDuration + tolerance);
    });
  });

  describe("Stress Testing", () => {
    it("should handle rapid successive operations", async () => {
      const csvPath = path.join(__dirname, "../fixtures/sample.csv");
      const metrics: PerformanceMetric[] = [];

      // Führe 50 Parsing-Operationen schnell hintereinander durch
      for (let i = 0; i < 50; i++) {
        const { metric } = await collectMetrics(
          () => {
            return parseCsv(csvPath);
          },
          `Stress Test: Operation ${i + 1}`
        );

        metrics.push(metric);
      }

      // Analysiere Performance-Trend
      const durations = metrics.map((m) => m.duration);
      const avgDuration = durations.reduce((a, b) => a + b, 0) / durations.length;
      const maxDuration = Math.max(...durations);
      const minDuration = Math.min(...durations);

      console.log(`[Stress Test] Avg Duration: ${avgDuration.toFixed(2)}ms`);
      console.log(`[Stress Test] Max Duration: ${maxDuration.toFixed(2)}ms`);
      console.log(`[Stress Test] Min Duration: ${minDuration.toFixed(2)}ms`);

      // Performance sollte stabil bleiben (keine signifikante Verschlechterung)
      const variance = maxDuration - minDuration;
      expect(variance).toBeLessThan(avgDuration * 2); // Variance sollte nicht zu groß sein
    });
  });
});
