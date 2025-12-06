import * as fs from "fs";
import * as path from "path";

/**
 * Lädt eine Test-Fixture-Datei.
 *
 * @param filename - Dateiname der Fixture (z.B. "sample.csv" oder "sample-products.json")
 * @returns Dateiinhalt als String (für CSV) oder geparstes JSON
 */
export function loadFixture<T = unknown>(filename: string): T {
  const fixturePath = path.join(__dirname, "../fixtures", filename);

  if (!fs.existsSync(fixturePath)) {
    throw new Error(`Fixture nicht gefunden: ${fixturePath}`);
  }

  const content = fs.readFileSync(fixturePath, "utf-8");

  // JSON-Dateien automatisch parsen
  if (filename.endsWith(".json")) {
    return JSON.parse(content) as T;
  }

  // Andere Dateien als String zurückgeben
  return content as unknown as T;
}

// Re-export Mock-Generatoren für Rückwärtskompatibilität
export {
  createMockProduct,
  createMockVariant,
  createMockCsvRow,
  createMockProducts,
  createMockCsvRows,
  createMockProductWithVariants,
  createMockProductEdgeCase,
  createMockCsvRowWithPriceFormat,
  createMockShopifyProducts,
  createMockSyncTestData,
} from "./mock-generators.js";
