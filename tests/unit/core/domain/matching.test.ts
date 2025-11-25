import { describe, it, expect, vi } from "vitest";
import { buildVariantMaps, findVariantId } from "../../../../core/domain/matching.js";
import type { Product, Variant } from "../../../../core/domain/types.js";
import { createMockProduct, createMockVariant } from "../../../helpers/test-utils.js";

describe("buildVariantMaps", () => {
  describe("SKU-Map", () => {
    it("sollte SKU-Map erstellen", () => {
      const products: Product[] = [
        createMockProduct({
          id: "gid://shopify/Product/1",
          title: "Produkt 1",
          variants: [
            createMockVariant({
              id: "gid://shopify/ProductVariant/1",
              productId: "gid://shopify/Product/1",
              sku: "SKU-001",
            }),
          ],
        }),
      ];

      const maps = buildVariantMaps(products);
      expect(maps.skuToVariant.get("SKU-001")).toBe("gid://shopify/ProductVariant/1");
    });

    it("sollte mehrere SKUs korrekt mappen", () => {
      const products: Product[] = [
        createMockProduct({
          id: "gid://shopify/Product/1",
          variants: [
            createMockVariant({
              id: "gid://shopify/ProductVariant/1",
              sku: "SKU-001",
            }),
            createMockVariant({
              id: "gid://shopify/ProductVariant/2",
              sku: "SKU-002",
            }),
          ],
        }),
      ];

      const maps = buildVariantMaps(products);
      expect(maps.skuToVariant.get("SKU-001")).toBe("gid://shopify/ProductVariant/1");
      expect(maps.skuToVariant.get("SKU-002")).toBe("gid://shopify/ProductVariant/2");
    });

    it("sollte Varianten ohne SKU ignorieren", () => {
      const products: Product[] = [
        createMockProduct({
          variants: [
            createMockVariant({
              id: "gid://shopify/ProductVariant/1",
              sku: "SKU-001",
            }),
            createMockVariant({
              id: "gid://shopify/ProductVariant/2",
              sku: null,
            }),
          ],
        }),
      ];

      const maps = buildVariantMaps(products);
      expect(maps.skuToVariant.get("SKU-001")).toBe("gid://shopify/ProductVariant/1");
      expect(maps.skuToVariant.has("")).toBe(false);
    });

    it("sollte bei doppelten SKUs warnen und überschreiben", () => {
      const products: Product[] = [
        createMockProduct({
          variants: [
            createMockVariant({
              id: "gid://shopify/ProductVariant/1",
              sku: "SKU-001",
            }),
            createMockVariant({
              id: "gid://shopify/ProductVariant/2",
              sku: "SKU-001", // Doppelte SKU
            }),
          ],
        }),
      ];

      const consoleSpy = vi.spyOn(console, "warn").mockImplementation(() => {});
      const maps = buildVariantMaps(products);
      
      // Letzter Wert sollte gewinnen
      expect(maps.skuToVariant.get("SKU-001")).toBe("gid://shopify/ProductVariant/2");
      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining("Doppelte SKU: SKU-001")
      );
      
      consoleSpy.mockRestore();
    });
  });

  describe("Name-Map", () => {
    it("sollte Name-Map erstellen", () => {
      const products: Product[] = [
        createMockProduct({
          id: "gid://shopify/Product/1",
          title: "Test Produkt",
          variants: [
            createMockVariant({
              id: "gid://shopify/ProductVariant/1",
              productId: "gid://shopify/Product/1",
            }),
          ],
        }),
      ];

      const maps = buildVariantMaps(products);
      const variants = maps.nameToVariants.get("test produkt");
      expect(variants).toBeDefined();
      expect(variants).toContain("gid://shopify/ProductVariant/1");
    });

    it("sollte mehrere Varianten für denselben Produktnamen mappen", () => {
      const products: Product[] = [
        createMockProduct({
          title: "Test Produkt",
          variants: [
            createMockVariant({
              id: "gid://shopify/ProductVariant/1",
            }),
            createMockVariant({
              id: "gid://shopify/ProductVariant/2",
            }),
          ],
        }),
      ];

      const maps = buildVariantMaps(products);
      const variants = maps.nameToVariants.get("test produkt");
      expect(variants).toHaveLength(2);
      expect(variants).toContain("gid://shopify/ProductVariant/1");
      expect(variants).toContain("gid://shopify/ProductVariant/2");
    });
  });

  describe("Barcode-Map", () => {
    it("sollte Barcode-Map erstellen", () => {
      const products: Product[] = [
        createMockProduct({
          variants: [
            createMockVariant({
              id: "gid://shopify/ProductVariant/1",
              barcode: "123456789",
            }),
          ],
        }),
      ];

      const maps = buildVariantMaps(products);
      expect(maps.extraNameMap.get("123456789")).toBe("gid://shopify/ProductVariant/1");
    });

    it("sollte Varianten ohne Barcode ignorieren", () => {
      const products: Product[] = [
        createMockProduct({
          variants: [
            createMockVariant({
              id: "gid://shopify/ProductVariant/1",
              barcode: "123456789",
            }),
            createMockVariant({
              id: "gid://shopify/ProductVariant/2",
              barcode: null,
            }),
          ],
        }),
      ];

      const maps = buildVariantMaps(products);
      expect(maps.extraNameMap.get("123456789")).toBe("gid://shopify/ProductVariant/1");
      expect(maps.extraNameMap.has("")).toBe(false);
    });
  });

  describe("VariantToProduct-Map", () => {
    it("sollte VariantToProduct-Map erstellen", () => {
      const products: Product[] = [
        createMockProduct({
          id: "gid://shopify/Product/1",
          variants: [
            createMockVariant({
              id: "gid://shopify/ProductVariant/1",
              productId: "gid://shopify/Product/1",
            }),
            createMockVariant({
              id: "gid://shopify/ProductVariant/2",
              productId: "gid://shopify/Product/1",
            }),
          ],
        }),
      ];

      const maps = buildVariantMaps(products);
      expect(maps.variantToProduct.get("gid://shopify/ProductVariant/1")).toBe(
        "gid://shopify/Product/1"
      );
      expect(maps.variantToProduct.get("gid://shopify/ProductVariant/2")).toBe(
        "gid://shopify/Product/1"
      );
    });
  });

  describe("Kombinierter Name", () => {
    it("sollte kombinierte Namen (Product + Variant) mappen", () => {
      const products: Product[] = [
        createMockProduct({
          title: "Test Produkt",
          variants: [
            createMockVariant({
              id: "gid://shopify/ProductVariant/1",
              title: "Variante 1",
            }),
          ],
        }),
      ];

      const maps = buildVariantMaps(products);
      expect(maps.extraNameMap.get("test produkt variante 1")).toBe(
        "gid://shopify/ProductVariant/1"
      );
    });
  });
});

describe("findVariantId", () => {
  const products: Product[] = [
    createMockProduct({
      id: "gid://shopify/Product/1",
      title: "Test Produkt",
      variants: [
        createMockVariant({
          id: "gid://shopify/ProductVariant/1",
          productId: "gid://shopify/Product/1",
          sku: "SKU-001",
          barcode: "123456789",
          title: "Standard",
        }),
      ],
    }),
    createMockProduct({
      id: "gid://shopify/Product/2",
      title: "Anderes Produkt",
      variants: [
        createMockVariant({
          id: "gid://shopify/ProductVariant/2",
          productId: "gid://shopify/Product/2",
          sku: null,
          barcode: null,
          title: "Standard",
        }),
      ],
    }),
  ];

  const maps = buildVariantMaps(products);

  describe("SKU-Matching (höchste Priorität)", () => {
    it("sollte per SKU matchen", () => {
      const result = findVariantId("SKU-001", "Anderer Name", maps);
      expect(result.variantId).toBe("gid://shopify/ProductVariant/1");
      expect(result.method).toBe("sku");
      expect(result.confidence).toBe("exact");
    });

    it("sollte SKU-Matching auch bei falschem Namen durchführen", () => {
      const result = findVariantId("SKU-001", "Falscher Name", maps);
      expect(result.variantId).toBe("gid://shopify/ProductVariant/1");
      expect(result.method).toBe("sku");
    });
  });

  describe("Name-Matching", () => {
    it("sollte per exaktem Namen matchen", () => {
      const result = findVariantId("", "Test Produkt", maps);
      expect(result.variantId).toBe("gid://shopify/ProductVariant/1");
      expect(result.method).toBe("name");
      expect(result.confidence).toBe("exact");
    });

    it("sollte per Namen matchen wenn keine SKU vorhanden", () => {
      const result = findVariantId("", "Anderes Produkt", maps);
      expect(result.variantId).toBe("gid://shopify/ProductVariant/2");
      expect(result.method).toBe("name");
      expect(result.confidence).toBe("exact");
    });

    it("sollte Name-Matching case-insensitive sein", () => {
      const result = findVariantId("", "TEST PRODUKT", maps);
      expect(result.variantId).toBe("gid://shopify/ProductVariant/1");
      expect(result.method).toBe("name");
    });
  });

  describe("Name mit Kürzung", () => {
    it("sollte Namen nach '-' kürzen", () => {
      const productsWithDash: Product[] = [
        createMockProduct({
          title: "Test Produkt",
          variants: [
            createMockVariant({
              id: "gid://shopify/ProductVariant/1",
            }),
          ],
        }),
      ];

      const mapsWithDash = buildVariantMaps(productsWithDash);
      const result = findVariantId("", "Test Produkt - Variante", mapsWithDash);
      expect(result.variantId).toBe("gid://shopify/ProductVariant/1");
      expect(result.method).toBe("name");
      expect(result.confidence).toBe("partial");
    });

    it("sollte Namen nach '(' kürzen", () => {
      const productsWithParen: Product[] = [
        createMockProduct({
          title: "Test Produkt",
          variants: [
            createMockVariant({
              id: "gid://shopify/ProductVariant/1",
            }),
          ],
        }),
      ];

      const mapsWithParen = buildVariantMaps(productsWithParen);
      const result = findVariantId("", "Test Produkt (Variante)", mapsWithParen);
      expect(result.variantId).toBe("gid://shopify/ProductVariant/1");
      expect(result.method).toBe("name");
      expect(result.confidence).toBe("partial");
    });
  });

  describe("Prefix-Matching", () => {
    it("sollte Prefix-Matching durchführen wenn genau ein Kandidat", () => {
      const productsPrefix: Product[] = [
        createMockProduct({
          title: "Test Produkt Lang",
          variants: [
            createMockVariant({
              id: "gid://shopify/ProductVariant/1",
            }),
          ],
        }),
      ];

      const mapsPrefix = buildVariantMaps(productsPrefix);
      const result = findVariantId("", "Test Produkt", mapsPrefix);
      expect(result.variantId).toBe("gid://shopify/ProductVariant/1");
      expect(result.method).toBe("prefix");
      expect(result.confidence).toBe("low");
    });

    it("sollte kein Prefix-Matching wenn mehrere Kandidaten", () => {
      const productsMultiple: Product[] = [
        createMockProduct({
          title: "Test Produkt 1",
          variants: [
            createMockVariant({
              id: "gid://shopify/ProductVariant/1",
            }),
          ],
        }),
        createMockProduct({
          title: "Test Produkt 2",
          variants: [
            createMockVariant({
              id: "gid://shopify/ProductVariant/2",
            }),
          ],
        }),
      ];

      const mapsMultiple = buildVariantMaps(productsMultiple);
      const result = findVariantId("", "Test", mapsMultiple);
      // Sollte kein Match finden, da mehrere Kandidaten
      expect(result.variantId).toBeNull();
    });
  });

  describe("Barcode-Matching", () => {
    it("sollte per Barcode matchen", () => {
      const result = findVariantId("", "123456789", maps);
      expect(result.variantId).toBe("gid://shopify/ProductVariant/1");
      expect(result.method).toBe("barcode");
      expect(result.confidence).toBe("exact");
    });
  });

  describe("Kein Match", () => {
    it("sollte null zurückgeben wenn kein Match gefunden", () => {
      const result = findVariantId("UNKNOWN", "Unbekanntes Produkt", maps);
      expect(result.variantId).toBeNull();
      expect(result.method).toBeNull();
      expect(result.confidence).toBe("low");
    });

    it("sollte null zurückgeben bei leerer SKU und unbekanntem Namen", () => {
      const result = findVariantId("", "Nicht existierendes Produkt", maps);
      expect(result.variantId).toBeNull();
    });
  });

  describe("Priorität", () => {
    it("sollte SKU höchste Priorität haben", () => {
      // Produkt mit SKU, Name und Barcode
      const productsPriority: Product[] = [
        createMockProduct({
          title: "Test Produkt",
          variants: [
            createMockVariant({
              id: "gid://shopify/ProductVariant/1",
              sku: "SKU-001",
              barcode: "123456789",
            }),
          ],
        }),
      ];

      const mapsPriority = buildVariantMaps(productsPriority);
      
      // SKU sollte gewinnen, auch wenn Name und Barcode passen
      const result = findVariantId("SKU-001", "Test Produkt", mapsPriority);
      expect(result.method).toBe("sku");
    });
  });
});

