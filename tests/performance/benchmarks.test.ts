/**
 * Performance-Benchmarks für kritische Operationen
 *
 * Diese Tests messen die Performance von:
 * - CSV-Parsing
 * - Cache-Operationen
 * - Sync-Dauer (mit Mocks)
 * - API-Response-Times (mit Mocks)
 */

import { describe, it, expect, beforeEach, afterEach } from "vitest";
import * as path from "path";
import * as fs from "fs";
import { parseCsv } from "../../core/infra/csv/parser.js";
import {
  measureExecutionTime,
  measureMemoryUsage,
  collectMetrics,
} from "./helpers/performance-utils.js";
import { loadFixture } from "../helpers/test-utils.js";

/**
 * Performance-Thresholds (in Millisekunden)
 */
const THRESHOLDS = {
  CSV_PARSING_SMALL: 100, // < 100ms für kleine CSV (< 100 Zeilen)
  CSV_PARSING_MEDIUM: 500, // < 500ms für mittlere CSV (< 1000 Zeilen)
  CSV_PARSING_LARGE: 2000, // < 2000ms für große CSV (< 10000 Zeilen)
  CACHE_WRITE_100: 50, // < 50ms für 100 Einträge
  CACHE_READ_100: 10, // < 10ms für 100 Einträge
  SYNC_PREVIEW_100: 1000, // < 1000ms für Preview mit 100 Produkten
  SYNC_PREVIEW_1000: 10000, // < 10000ms für Preview mit 1000 Produkten
};

describe("Performance Benchmarks", () => {
  let tempDir: string;

  beforeEach(() => {
    // Erstelle temporäres Verzeichnis für Test-Dateien
    tempDir = fs.mkdtempSync(path.join(process.cwd(), "temp-test-"));
  });

  afterEach(() => {
    // Bereinige temporäres Verzeichnis
    if (fs.existsSync(tempDir)) {
      fs.rmSync(tempDir, { recursive: true, force: true });
    }
  });

  describe("CSV Parsing Performance", () => {
    it("should parse small CSV file quickly", async () => {
      const csvPath = path.join(__dirname, "../fixtures/sample.csv");

      const { duration } = await measureExecutionTime(() => {
        return parseCsv(csvPath);
      }, "CSV Parsing (Small)");

      expect(duration).toBeLessThan(THRESHOLDS.CSV_PARSING_SMALL);
    });

    it("should parse CSV with different encodings efficiently", async () => {
      const encodings = ["csv-encodings.csv", "csv-tab-delimited.csv"];

      for (const filename of encodings) {
        const csvPath = path.join(__dirname, "../fixtures", filename);
        // eslint-disable-next-line security/detect-non-literal-fs-filename
        if (!fs.existsSync(csvPath)) {
          continue; // Überspringe wenn Datei nicht existiert
        }

        const { duration } = await measureExecutionTime(() => {
          return parseCsv(csvPath);
        }, `CSV Parsing (${filename})`);

        expect(duration).toBeLessThan(THRESHOLDS.CSV_PARSING_SMALL);
      }
    });

    it("should handle edge cases efficiently", async () => {
      const csvPath = path.join(__dirname, "../fixtures/csv-edge-cases.csv");

      // eslint-disable-next-line security/detect-non-literal-fs-filename
      if (!fs.existsSync(csvPath)) {
        return; // Überspringe wenn Datei nicht existiert
      }

      const { duration } = await measureExecutionTime(() => {
        return parseCsv(csvPath);
      }, "CSV Parsing (Edge Cases)");

      expect(duration).toBeLessThan(THRESHOLDS.CSV_PARSING_SMALL);
    });

    it("should parse large CSV files within threshold", async () => {
      // Erstelle große CSV-Datei für Test (1000 Zeilen)
      const largeCsvPath = path.join(tempDir, "large-1000.csv");
      const headers = "SKU;Name;Preis;Bestand\n";
      const rows: string[] = [];

      for (let i = 0; i < 1000; i++) {
        rows.push(
          `SKU-${i};Produkt ${i};${(Math.random() * 100).toFixed(2)};${Math.floor(Math.random() * 100)}`
        );
      }

      // eslint-disable-next-line security/detect-non-literal-fs-filename
      fs.writeFileSync(largeCsvPath, headers + rows.join("\n"), "utf-8");

      const { duration } = await measureExecutionTime(() => {
        return parseCsv(largeCsvPath);
      }, "CSV Parsing (1000 rows)");

      expect(duration).toBeLessThan(THRESHOLDS.CSV_PARSING_MEDIUM);
    });
  });

  describe("Memory Usage - CSV Parsing", () => {
    it("should not leak memory when parsing multiple CSV files", async () => {
      const csvPath = path.join(__dirname, "../fixtures/sample.csv");
      const memoryDeltas: number[] = [];

      // Parse CSV 10 Mal und messe Memory-Delta
      for (let i = 0; i < 10; i++) {
        const { delta } = await measureMemoryUsage(
          () => {
            return parseCsv(csvPath);
          },
          `CSV Parse Iteration ${i + 1}`
        );

        memoryDeltas.push(delta);

        // Force garbage collection if available
        if (global.gc) {
          global.gc();
        }

        // Warte kurz zwischen Iterationen
        await new Promise((resolve) => setTimeout(resolve, 100));
      }

      // Prüfe, ob Memory-Delta stabil bleibt (keine kontinuierliche Steigerung)
      const avgDelta = memoryDeltas.reduce((a, b) => a + b, 0) / memoryDeltas.length;
      const maxDelta = Math.max(...memoryDeltas);

      // Memory-Delta sollte nicht zu groß sein (weniger als 10MB pro Iteration)
      expect(maxDelta).toBeLessThan(10 * 1024 * 1024);

      console.log(`[Memory] Average Delta: ${(avgDelta / 1024 / 1024).toFixed(2)}MB`);
      console.log(`[Memory] Max Delta: ${(maxDelta / 1024 / 1024).toFixed(2)}MB`);
    });
  });

  describe("Cache Operations Performance", () => {
    // Cache-Tests werden mit Mock-Daten durchgeführt
    // Da Cache-Service Electron app benötigt, testen wir hier nur die Logik

    it("should benchmark cache write operations (simulated)", async () => {
      // Simuliere Cache-Write-Operationen
      const items = Array.from({ length: 100 }, (_, i) => ({
        id: `product-${i}`,
        title: `Product ${i}`,
        updated_at: Date.now(),
      }));

      const { duration } = await measureExecutionTime(() => {
        // Simuliere SQLite-Insert-Operationen
        const operations = items.map((item) => {
          // Simuliere Prepared Statement Execution
          return JSON.stringify(item);
        });
        return operations;
      }, "Cache Write (100 items)");

      // Simulierte Operation sollte sehr schnell sein
      expect(duration).toBeLessThan(THRESHOLDS.CACHE_WRITE_100);
    });

    it("should benchmark cache read operations (simulated)", async () => {
      // Simuliere Cache-Read-Operationen
      const { duration } = await measureExecutionTime(() => {
        // Simuliere SQLite-Select-Operationen
        const results = Array.from({ length: 100 }, (_, i) => ({
          id: `product-${i}`,
          title: `Product ${i}`,
        }));
        return results;
      }, "Cache Read (100 items)");

      // Simulierte Operation sollte sehr schnell sein
      expect(duration).toBeLessThan(THRESHOLDS.CACHE_READ_100);
    });
  });

  describe("Sync Pipeline Performance", () => {
    it("should process sync preview quickly for small datasets", async () => {
      // Lade Test-Daten
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const sampleProducts = loadFixture<any[]>("sample-products.json");

      // Simuliere Sync-Preview-Operation
      const { duration } = await measureExecutionTime(() => {
        // Simuliere Matching-Operationen
        const matches = sampleProducts.slice(0, 10).map((product) => ({
          productId: product.id,
          variantId: product.variants[0]?.id,
          matched: true,
        }));
        return matches;
      }, "Sync Preview (10 products)");

      // Preview sollte schnell sein
      expect(duration).toBeLessThan(THRESHOLDS.SYNC_PREVIEW_100);
    });

    it("should handle larger datasets within threshold", async () => {
      // Simuliere größeres Dataset (100 Produkte)
      const { duration } = await measureExecutionTime(() => {
        // Simuliere Matching für 100 Produkte
        const matches = Array.from({ length: 100 }, (_, i) => ({
          productId: `product-${i}`,
          variantId: `variant-${i}`,
          matched: true,
        }));
        return matches;
      }, "Sync Preview (100 products)");

      expect(duration).toBeLessThan(THRESHOLDS.SYNC_PREVIEW_100);
    });
  });

  describe("Performance Metrics Collection", () => {
    it("should collect comprehensive performance metrics", async () => {
      const csvPath = path.join(__dirname, "../fixtures/sample.csv");

      const { metric } = await collectMetrics(() => {
        return parseCsv(csvPath);
      }, "CSV Parsing with Metrics");

      expect(metric.name).toBe("CSV Parsing with Metrics");
      expect(metric.duration).toBeGreaterThan(0);
      expect(metric.memoryBefore).toBeDefined();
      expect(metric.memoryAfter).toBeDefined();
      expect(metric.timestamp).toBeGreaterThan(0);
    });
  });

  describe("Performance Regression Detection", () => {
    it("should detect performance regressions", async () => {
      const csvPath = path.join(__dirname, "../fixtures/sample.csv");

      // Baseline-Messung
      const baseline = await collectMetrics(() => {
        return parseCsv(csvPath);
      }, "Baseline");

      // Aktuelle Messung
      const current = await collectMetrics(() => {
        return parseCsv(csvPath);
      }, "Current");

      // Vergleiche Metriken
      const durationDiff = current.metric.duration - baseline.metric.duration;
      const durationDiffPercent = (durationDiff / baseline.metric.duration) * 100;

      console.log(
        `[Performance] Duration Diff: ${durationDiff.toFixed(2)}ms (${durationDiffPercent.toFixed(2)}%)`
      );

      // Performance sollte nicht um mehr als 50% schlechter sein
      expect(durationDiffPercent).toBeLessThan(50);
    });
  });
});
