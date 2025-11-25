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

  describe("Name-Matching", () => {
    it("sollte per exaktem Namen matchen", () => {
      const maps = buildVariantMaps(products);
      const result = findVariantId("", "Produkt ohne SKU", maps);

      expect(result.variantId).toBe("gid://shopify/ProductVariant/3");
      expect(result.method).toBe("name");
      expect(result.confidence).toBe("exact");
    });

    it("sollte Name-Matching case-insensitive sein", () => {
      const maps = buildVariantMaps(products);
      const result = findVariantId("", "PRODUKT OHNE SKU", maps);

      expect(result.variantId).toBe("gid://shopify/ProductVariant/3");
      expect(result.method).toBe("name");
    });
  });

  describe("Barcode-Matching", () => {
    it("sollte per Barcode matchen", () => {
      const maps = buildVariantMaps(products);
      const result = findVariantId("", "987654321", maps);

      expect(result.variantId).toBe("gid://shopify/ProductVariant/4");
      expect(result.method).toBe("barcode");
      expect(result.confidence).toBe("exact");
    });
  });

  describe("Priorität", () => {
    it("sollte SKU höchste Priorität haben", () => {
      const maps = buildVariantMaps(products);
      
      // Produkt mit SKU, Name und Barcode
      const result = findVariantId("SKU-002", "Test Produkt 2", maps);
      
      // SKU sollte gewinnen, auch wenn Name passt
      expect(result.method).toBe("sku");
      expect(result.variantId).toBe("gid://shopify/ProductVariant/2");
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

