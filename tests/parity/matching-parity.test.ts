import { describe, it, expect, beforeAll } from "vitest";
import { buildVariantMaps, findVariantId } from "../../../core/domain/matching.js";
import type { Product } from "../../../core/domain/types.js";
import { loadFixture } from "../helpers/test-utils.js";

describe("Matching Parity", () => {
  let products: Product[];

  beforeAll(() => {
    // Lade Produkte aus Fixture
    products = loadFixture<Product[]>("sample-products.json");
  });

  describe("Erwartete Matches aus expected-outputs.json", () => {
    it("sollte alle erwarteten Matches erfüllen", () => {
      const expectedOutputs = loadFixture<{
        matching: Array<{
          csvRow: { sku: string; name: string };
          expectedMatch: {
            variantId: string;
            method: string;
            confidence: string;
          };
        }>;
      }>("expected-outputs.json");

      const maps = buildVariantMaps(products);

      for (const testCase of expectedOutputs.matching) {
        const result = findVariantId(
          testCase.csvRow.sku,
          testCase.csvRow.name,
          maps
        );

        expect(result.variantId).toBe(testCase.expectedMatch.variantId);
        expect(result.method).toBe(testCase.expectedMatch.method);
        expect(result.confidence).toBe(testCase.expectedMatch.confidence);
      }
    });
  });

  describe("SKU-Matching", () => {
    it("sollte per SKU matchen (höchste Priorität)", () => {
      const maps = buildVariantMaps(products);
      const result = findVariantId("SKU-001", "Anderer Name", maps);

      expect(result.variantId).toBe("gid://shopify/ProductVariant/1");
      expect(result.method).toBe("sku");
      expect(result.confidence).toBe("exact");
    });

    it("sollte SKU-002 korrekt matchen", () => {
      const maps = buildVariantMaps(products);
      const result = findVariantId("SKU-002", "Test Produkt 2", maps);

      expect(result.variantId).toBe("gid://shopify/ProductVariant/2");
      expect(result.method).toBe("sku");
    });
  });

  describe("Name-Matching (entfernt)", () => {
    it("sollte kein Match finden wenn nur Name vorhanden (keine SKU)", () => {
      const maps = buildVariantMaps(products);
      const result = findVariantId("", "Produkt ohne SKU", maps);

      expect(result.variantId).toBeNull();
      expect(result.method).toBeNull();
      expect(result.confidence).toBe("low");
    });

    it("sollte kein Match finden bei Name-Matching ohne SKU", () => {
      const maps = buildVariantMaps(products);
      const result = findVariantId("", "PRODUKT OHNE SKU", maps);

      expect(result.variantId).toBeNull();
      expect(result.method).toBeNull();
    });
  });

  describe("Barcode-Matching (entfernt)", () => {
    it("sollte kein Match finden bei Barcode ohne SKU", () => {
      const maps = buildVariantMaps(products);
      const result = findVariantId("", "987654321", maps);

      expect(result.variantId).toBeNull();
      expect(result.method).toBeNull();
      expect(result.confidence).toBe("low");
    });
  });

  describe("Nur SKU-Matching", () => {
    it("sollte nur per SKU matchen können", () => {
      const maps = buildVariantMaps(products);
      
      // Produkt mit SKU, Name und Barcode
      const result = findVariantId("SKU-002", "Test Produkt 2", maps);
      
      // Nur SKU sollte funktionieren
      expect(result.method).toBe("sku");
      expect(result.variantId).toBe("gid://shopify/ProductVariant/2");
      
      // Name sollte nicht funktionieren
      const resultName = findVariantId("", "Test Produkt 2", maps);
      expect(resultName.variantId).toBeNull();
    });
  });

  describe("Kein Match", () => {
    it("sollte null zurückgeben wenn kein Match gefunden", () => {
      const maps = buildVariantMaps(products);
      const result = findVariantId("UNKNOWN", "Unbekanntes Produkt", maps);

      expect(result.variantId).toBeNull();
      expect(result.method).toBeNull();
      expect(result.confidence).toBe("low");
    });
  });
});

