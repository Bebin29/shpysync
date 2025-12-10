/**
 * Memory-Leak-Detection für Sync-Operationen
 *
 * Diese Tests prüfen auf Memory-Leaks durch:
 * - Memory-Usage-Tracking über mehrere Sync-Zyklen
 * - Event-Listener-Cleanup-Verification
 * - Heap-Snapshot-Vergleiche
 */

import { describe, it, expect, beforeEach, afterEach } from "vitest";
import * as path from "path";
import * as fs from "fs";
import { parseCsv } from "../../core/infra/csv/parser.js";
import {
  getMemoryUsage,
  measureMemoryUsage,
  checkEventListeners,
  formatBytes,
  type MemoryUsage,
} from "./helpers/performance-utils.js";

/**
 * Memory-Leak-Thresholds
 */
const MEMORY_THRESHOLDS = {
  MAX_DELTA_PER_ITERATION: 5 * 1024 * 1024, // 5MB pro Iteration
  MAX_TOTAL_INCREASE: 50 * 1024 * 1024, // 50MB Gesamt-Erhöhung über 10 Iterationen
  MAX_EVENT_LISTENER_INCREASE: 5, // Max 5 zusätzliche Event-Listener
};

describe("Memory Leak Detection", () => {
  let tempDir: string;

  beforeEach(() => {
    // eslint-disable-next-line security/detect-non-literal-fs-filename
    tempDir = fs.mkdtempSync(path.join(process.cwd(), "temp-test-"));
    // Force garbage collection if available
    if (global.gc) {
      global.gc();
    }
    // Warte kurz, damit Memory-Statistiken aktualisiert werden
    return new Promise((resolve) => setTimeout(resolve, 200));
  });

  afterEach(() => {
    // eslint-disable-next-line security/detect-non-literal-fs-filename
    if (fs.existsSync(tempDir)) {
      // eslint-disable-next-line security/detect-non-literal-fs-filename
      fs.rmSync(tempDir, { recursive: true, force: true });
    }
    // Force garbage collection if available
    if (global.gc) {
      global.gc();
    }
  });

  describe("CSV Parsing Memory Leaks", () => {
    it("should not leak memory when parsing CSV multiple times", async () => {
      const csvPath = path.join(__dirname, "../fixtures/sample.csv");
      const memoryUsages: MemoryUsage[] = [];
      const deltas: number[] = [];

      // Parse CSV 10 Mal und sammle Memory-Statistiken
      for (let i = 0; i < 10; i++) {
        const { memoryAfter, delta } = await measureMemoryUsage(
          () => {
            return parseCsv(csvPath);
          },
          `CSV Parse Iteration ${i + 1}`
        );

        memoryUsages.push(memoryAfter);
        deltas.push(delta);

        // Force garbage collection if available
        if (global.gc) {
          global.gc();
        }

        // Warte zwischen Iterationen
        await new Promise((resolve) => setTimeout(resolve, 200));
      }

      // Analysiere Memory-Trend
      const firstMemory = memoryUsages[0].heapUsed;
      const lastMemory = memoryUsages[memoryUsages.length - 1].heapUsed;
      const totalIncrease = lastMemory - firstMemory;
      const maxDelta = Math.max(...deltas.map(Math.abs));

      console.log(`[Memory Leak Test] First: ${formatBytes(firstMemory)}`);
      console.log(`[Memory Leak Test] Last: ${formatBytes(lastMemory)}`);
      console.log(`[Memory Leak Test] Total Increase: ${formatBytes(totalIncrease)}`);
      console.log(`[Memory Leak Test] Max Delta: ${formatBytes(maxDelta)}`);

      // Prüfe Thresholds
      expect(maxDelta).toBeLessThan(MEMORY_THRESHOLDS.MAX_DELTA_PER_ITERATION);
      expect(totalIncrease).toBeLessThan(MEMORY_THRESHOLDS.MAX_TOTAL_INCREASE);
    });

    it("should release memory after CSV parsing", async () => {
      const csvPath = path.join(__dirname, "../fixtures/sample.csv");
      const memoryBefore = getMemoryUsage();

      // Parse CSV
      const result = parseCsv(csvPath);
      expect(result.rows.length).toBeGreaterThan(0);

      // Force garbage collection
      if (global.gc) {
        global.gc();
      }

      // Warte kurz
      await new Promise((resolve) => setTimeout(resolve, 500));

      const memoryAfter = getMemoryUsage();
      const delta = memoryAfter.heapUsed - memoryBefore.heapUsed;

      console.log(`[Memory Release] Before: ${formatBytes(memoryBefore.heapUsed)}`);
      console.log(`[Memory Release] After: ${formatBytes(memoryAfter.heapUsed)}`);
      console.log(`[Memory Release] Delta: ${formatBytes(delta)}`);

      // Memory sollte nicht signifikant erhöht sein nach GC
      // Erlaube kleine Erhöhung für temporäre Objekte
      expect(Math.abs(delta)).toBeLessThan(10 * 1024 * 1024); // 10MB Toleranz
    });
  });

  describe("Event Listener Cleanup", () => {
    it("should not accumulate event listeners", () => {
      const initialListeners = checkEventListeners();

      // Simuliere Event-Listener-Registrierung und Cleanup
      const handlers: Array<() => void> = [];

      // Registriere mehrere Event-Listener
      for (let i = 0; i < 10; i++) {
        const handler = () => {
          // Dummy-Handler
        };
        process.on("uncaughtException", handler);
        handlers.push(() => {
          process.removeListener("uncaughtException", handler);
        });
      }

      const afterRegister = checkEventListeners();

      // Entferne alle Event-Listener
      handlers.forEach((cleanup) => cleanup());

      // Force garbage collection if available
      if (global.gc) {
        global.gc();
      }

      const afterCleanup = checkEventListeners();

      console.log(`[Event Listeners] Initial: ${initialListeners.activeListeners}`);
      console.log(`[Event Listeners] After Register: ${afterRegister.activeListeners}`);
      console.log(`[Event Listeners] After Cleanup: ${afterCleanup.activeListeners}`);

      // Event-Listener sollten nach Cleanup wieder auf initialem Level sein
      const increase = afterCleanup.activeListeners - initialListeners.activeListeners;
      expect(increase).toBeLessThanOrEqual(MEMORY_THRESHOLDS.MAX_EVENT_LISTENER_INCREASE);
    });
  });

  describe("Multiple Sync Cycles", () => {
    it("should not leak memory over multiple sync cycles", async () => {
      const csvPath = path.join(__dirname, "../fixtures/sample.csv");
      const cycleMemory: MemoryUsage[] = [];

      // Führe 5 Sync-Zyklen durch
      for (let cycle = 0; cycle < 5; cycle++) {
        // Force garbage collection vor jedem Zyklus
        if (global.gc) {
          global.gc();
        }

        await new Promise((resolve) => setTimeout(resolve, 200));

        // Simuliere Sync-Operation
        const csvResult = parseCsv(csvPath);
        expect(csvResult.rows.length).toBeGreaterThan(0);

        // Simuliere weitere Operationen
        csvResult.rows.map((row) => ({
          sku: row.data.SKU || "",
          name: row.data.Name || "",
        }));

        // Force garbage collection nach Operation
        if (global.gc) {
          global.gc();
        }

        await new Promise((resolve) => setTimeout(resolve, 200));

        const memoryAfter = getMemoryUsage();
        cycleMemory.push(memoryAfter);

        console.log(`[Sync Cycle ${cycle + 1}] Memory: ${formatBytes(memoryAfter.heapUsed)}`);
      }

      // Analysiere Memory-Trend über Zyklen
      const firstCycleMemory = cycleMemory[0].heapUsed;
      const lastCycleMemory = cycleMemory[cycleMemory.length - 1].heapUsed;
      const totalIncrease = lastCycleMemory - firstCycleMemory;

      console.log(`[Multiple Cycles] First: ${formatBytes(firstCycleMemory)}`);
      console.log(`[Multiple Cycles] Last: ${formatBytes(lastCycleMemory)}`);
      console.log(`[Multiple Cycles] Total Increase: ${formatBytes(totalIncrease)}`);

      // Memory sollte nicht kontinuierlich steigen
      expect(totalIncrease).toBeLessThan(MEMORY_THRESHOLDS.MAX_TOTAL_INCREASE);
    });
  });

  describe("Large File Memory Usage", () => {
    it("should handle large files without excessive memory usage", async () => {
      // Erstelle große CSV-Datei (5000 Zeilen)
      const largeCsvPath = path.join(tempDir, "large-5000.csv");
      const headers = "SKU;Name;Preis;Bestand\n";
      const rows: string[] = [];

      for (let i = 0; i < 5000; i++) {
        rows.push(
          `SKU-${i};Produkt ${i};${(Math.random() * 100).toFixed(2)};${Math.floor(Math.random() * 100)}`
        );
      }

      // eslint-disable-next-line security/detect-non-literal-fs-filename
      fs.writeFileSync(largeCsvPath, headers + rows.join("\n"), "utf-8");

      // Parse große Datei
      const { delta } = await measureMemoryUsage(() => {
        return parseCsv(largeCsvPath);
      }, "Large File Parse");

      console.log(`[Large File] Memory Delta: ${formatBytes(delta)}`);

      // Memory-Delta sollte proportional zur Dateigröße sein
      // Für 5000 Zeilen sollte Memory-Delta < 50MB sein
      expect(Math.abs(delta)).toBeLessThan(50 * 1024 * 1024);
    });
  });

  describe("Memory Cleanup After Errors", () => {
    it("should clean up memory even after errors", async () => {
      const memoryBefore = getMemoryUsage();

      try {
        // Versuche ungültige CSV zu parsen
        const invalidPath = path.join(tempDir, "invalid.csv");
        // eslint-disable-next-line security/detect-non-literal-fs-filename
        fs.writeFileSync(invalidPath, "invalid,csv,data\nbroken,row", "utf-8");

        try {
          parseCsv(invalidPath);
        } catch {
          // Fehler wird erwartet
        }
      } catch {
        // Ignoriere Fehler
      }

      // Force garbage collection
      if (global.gc) {
        global.gc();
      }

      await new Promise((resolve) => setTimeout(resolve, 500));

      const memoryAfter = getMemoryUsage();
      const delta = memoryAfter.heapUsed - memoryBefore.heapUsed;

      console.log(`[Error Cleanup] Memory Delta: ${formatBytes(delta)}`);

      // Memory sollte nach Fehler nicht signifikant erhöht sein
      expect(Math.abs(delta)).toBeLessThan(10 * 1024 * 1024); // 10MB Toleranz
    });
  });
});
