import { describe, it, expect, vi, beforeEach } from "vitest";
import { processCsvToUpdates, groupPriceUpdatesByProduct } from "../../../../core/domain/sync-pipeline.js";
import type { CsvRow, Product } from "../../../../core/domain/types.js";
import { createMockProduct, createMockVariant, createMockCsvRow } from "../../../helpers/test-utils.js";

describe("processCsvToUpdates", () => {
  let products: Product[];

  beforeEach(() => {
    products = [
      createMockProduct({
        id: "gid://shopify/Product/1",
        title: "Test Produkt 1",
        variants: [
          createMockVariant({
            id: "gid://shopify/ProductVariant/1",
            productId: "gid://shopify/Product/1",
            sku: "SKU-001",
            price: "10.00",
            inventoryItemId: "gid://shopify/InventoryItem/1",
          }),
        ],
      }),
      createMockProduct({
        id: "gid://shopify/Product/2",
        title: "Test Produkt 2",
        variants: [
          createMockVariant({
            id: "gid://shopify/ProductVariant/2",
            productId: "gid://shopify/Product/2",
            sku: "SKU-002",
            price: "8.99",
            inventoryItemId: "gid://shopify/InventoryItem/2",
          }),
        ],
      }),
    ];
  });

  describe("Preis-Updates generieren", () => {
    it("sollte Preis-Updates für gematchte Varianten generieren", () => {
      const csvRows: CsvRow[] = [
        createMockCsvRow({
          rowNumber: 1,
          sku: "SKU-001",
          name: "Test Produkt 1",
          price: "12.50",
          stock: 10,
        }),
      ];

      const result = processCsvToUpdates(csvRows, products, {
        updatePrices: true,
        updateInventory: false,
      });

      expect(result.priceUpdates).toHaveLength(1);
      expect(result.priceUpdates[0]).toEqual({
        productId: "gid://shopify/Product/1",
        variantId: "gid://shopify/ProductVariant/1",
        price: "12.50",
      });
    });

    it("sollte Preise normalisieren", () => {
      const csvRows: CsvRow[] = [
        createMockCsvRow({
          rowNumber: 1,
          sku: "SKU-001",
          name: "Test Produkt 1",
          price: "12,50", // Komma-Format
          stock: 10,
        }),
      ];

      const result = processCsvToUpdates(csvRows, products, {
        updatePrices: true,
        updateInventory: false,
      });

      expect(result.priceUpdates[0].price).toBe("12.50");
    });

    it("sollte keine Preis-Updates generieren wenn updatePrices false", () => {
      const csvRows: CsvRow[] = [
        createMockCsvRow({
          rowNumber: 1,
          sku: "SKU-001",
          name: "Test Produkt 1",
          price: "12.50",
          stock: 10,
        }),
      ];

      const result = processCsvToUpdates(csvRows, products, {
        updatePrices: false,
        updateInventory: true,
      });

      expect(result.priceUpdates).toHaveLength(0);
    });
  });

  describe("Inventory-Updates generieren", () => {
    it("sollte Inventory-Updates für gematchte Varianten generieren", () => {
      const csvRows: CsvRow[] = [
        createMockCsvRow({
          rowNumber: 1,
          sku: "SKU-001",
          name: "Test Produkt 1",
          price: "12.50",
          stock: 10,
        }),
      ];

      const result = processCsvToUpdates(csvRows, products, {
        updatePrices: false,
        updateInventory: true,
      });

      expect(result.inventoryUpdates).toHaveLength(1);
      expect(result.inventoryUpdates[0]).toEqual({
        inventoryItemId: "gid://shopify/InventoryItem/1",
        quantity: 10,
      });
    });

    it("sollte keine Inventory-Updates generieren wenn updateInventory false", () => {
      const csvRows: CsvRow[] = [
        createMockCsvRow({
          rowNumber: 1,
          sku: "SKU-001",
          name: "Test Produkt 1",
          price: "12.50",
          stock: 10,
        }),
      ];

      const result = processCsvToUpdates(csvRows, products, {
        updatePrices: true,
        updateInventory: false,
      });

      expect(result.inventoryUpdates).toHaveLength(0);
    });

    it("sollte Inventory-Updates koaleszieren (Duplikate entfernen)", () => {
      const csvRows: CsvRow[] = [
        createMockCsvRow({
          rowNumber: 1,
          sku: "SKU-001",
          name: "Test Produkt 1",
          price: "12.50",
          stock: 10,
        }),
        createMockCsvRow({
          rowNumber: 2,
          sku: "SKU-001", // Gleiche SKU
          name: "Test Produkt 1",
          price: "12.50",
          stock: 20, // Anderer Bestand
        }),
      ];

      const result = processCsvToUpdates(csvRows, products, {
        updatePrices: false,
        updateInventory: true,
      });

      // Sollte nur ein Update haben (Last-write-wins)
      expect(result.inventoryUpdates).toHaveLength(1);
      expect(result.inventoryUpdates[0].quantity).toBe(20);
    });
  });

  describe("MappedRows erstellen", () => {
    it("sollte MappedRows für erfolgreich gematchte Zeilen erstellen", () => {
      const csvRows: CsvRow[] = [
        createMockCsvRow({
          rowNumber: 1,
          sku: "SKU-001",
          name: "Test Produkt 1",
          price: "12.50",
          stock: 10,
        }),
      ];

      const result = processCsvToUpdates(csvRows, products, {
        updatePrices: true,
        updateInventory: true,
      });

      expect(result.mappedRows).toHaveLength(1);
      expect(result.mappedRows[0].csvRow).toEqual(csvRows[0]);
      expect(result.mappedRows[0].variantId).toBe("gid://shopify/ProductVariant/1");
      expect(result.mappedRows[0].matchMethod).toBe("sku");
      expect(result.mappedRows[0].matchConfidence).toBe("exact");
    });
  });

  describe("UnmatchedRows identifizieren", () => {
    it("sollte nicht-gematchte Zeilen als unmatchedRows markieren", () => {
      const csvRows: CsvRow[] = [
        createMockCsvRow({
          rowNumber: 1,
          sku: "UNKNOWN-SKU",
          name: "Unbekanntes Produkt",
          price: "12.50",
          stock: 10,
        }),
      ];

      const result = processCsvToUpdates(csvRows, products, {
        updatePrices: true,
        updateInventory: true,
      });

      expect(result.unmatchedRows).toHaveLength(1);
      expect(result.unmatchedRows[0]).toEqual(csvRows[0]);
    });

    it("sollte Zeilen ohne Preis als unmatchedRows markieren (wenn updatePrices true)", () => {
      const csvRows: CsvRow[] = [
        createMockCsvRow({
          rowNumber: 1,
          sku: "SKU-001",
          name: "Test Produkt 1",
          price: "", // Leerer Preis
          stock: 10,
        }),
      ];

      const consoleSpy = vi.spyOn(console, "warn").mockImplementation(() => {});
      const result = processCsvToUpdates(csvRows, products, {
        updatePrices: true,
        updateInventory: false,
      });

      expect(result.unmatchedRows).toHaveLength(1);
      expect(consoleSpy).toHaveBeenCalled();
      consoleSpy.mockRestore();
    });

    it("sollte Zeilen ohne Bestand als unmatchedRows markieren (wenn updateInventory true)", () => {
      const csvRows: CsvRow[] = [
        createMockCsvRow({
          rowNumber: 1,
          sku: "SKU-001",
          name: "Test Produkt 1",
          price: "12.50",
          stock: undefined as any, // Kein Bestand
        }),
      ];

      const consoleSpy = vi.spyOn(console, "warn").mockImplementation(() => {});
      const result = processCsvToUpdates(csvRows, products, {
        updatePrices: false,
        updateInventory: true,
      });

      expect(result.unmatchedRows).toHaveLength(1);
      expect(consoleSpy).toHaveBeenCalled();
      consoleSpy.mockRestore();
    });
  });

  describe("Validierung", () => {
    it("sollte Zeilen mit ungültigem Preis überspringen", () => {
      const csvRows: CsvRow[] = [
        createMockCsvRow({
          rowNumber: 1,
          sku: "SKU-001",
          name: "Test Produkt 1",
          price: "invalid-price",
          stock: 10,
        }),
      ];

      const consoleSpy = vi.spyOn(console, "warn").mockImplementation(() => {});
      const result = processCsvToUpdates(csvRows, products, {
        updatePrices: true,
        updateInventory: false,
      });

      expect(result.unmatchedRows).toHaveLength(1);
      expect(result.priceUpdates).toHaveLength(0);
      consoleSpy.mockRestore();
    });

    it("sollte Varianten ohne inventoryItemId überspringen", () => {
      const productsWithoutInventory: Product[] = [
        createMockProduct({
          id: "gid://shopify/Product/1",
          variants: [
            createMockVariant({
              id: "gid://shopify/ProductVariant/1",
              sku: "SKU-001",
              inventoryItemId: null, // Kein Inventory Item
            }),
          ],
        }),
      ];

      const csvRows: CsvRow[] = [
        createMockCsvRow({
          rowNumber: 1,
          sku: "SKU-001",
          name: "Test Produkt 1",
          price: "12.50",
          stock: 10,
        }),
      ];

      const consoleSpy = vi.spyOn(console, "warn").mockImplementation(() => {});
      const result = processCsvToUpdates(csvRows, productsWithoutInventory, {
        updatePrices: false,
        updateInventory: true,
      });

      expect(result.inventoryUpdates).toHaveLength(0);
      expect(consoleSpy).toHaveBeenCalled();
      consoleSpy.mockRestore();
    });
  });

  describe("Kombinierte Updates", () => {
    it("sollte sowohl Preis- als auch Inventory-Updates generieren", () => {
      const csvRows: CsvRow[] = [
        createMockCsvRow({
          rowNumber: 1,
          sku: "SKU-001",
          name: "Test Produkt 1",
          price: "12.50",
          stock: 10,
        }),
        createMockCsvRow({
          rowNumber: 2,
          sku: "SKU-002",
          name: "Test Produkt 2",
          price: "15.00",
          stock: 20,
        }),
      ];

      const result = processCsvToUpdates(csvRows, products, {
        updatePrices: true,
        updateInventory: true,
      });

      expect(result.priceUpdates).toHaveLength(2);
      expect(result.inventoryUpdates).toHaveLength(2);
      expect(result.mappedRows).toHaveLength(2);
      expect(result.unmatchedRows).toHaveLength(0);
    });
  });
});

describe("groupPriceUpdatesByProduct", () => {
  it("sollte Preis-Updates nach Produkt-ID gruppieren", () => {
    const priceUpdates = [
      { productId: "gid://shopify/Product/1", variantId: "gid://shopify/ProductVariant/1", price: "12.50" },
      { productId: "gid://shopify/Product/1", variantId: "gid://shopify/ProductVariant/2", price: "15.00" },
      { productId: "gid://shopify/Product/2", variantId: "gid://shopify/ProductVariant/3", price: "20.00" },
    ];

    const grouped = groupPriceUpdatesByProduct(priceUpdates);

    expect(grouped.size).toBe(2);
    expect(grouped.get("gid://shopify/Product/1")).toHaveLength(2);
    expect(grouped.get("gid://shopify/Product/2")).toHaveLength(1);
  });

  it("sollte leere Liste behandeln", () => {
    const grouped = groupPriceUpdatesByProduct([]);
    expect(grouped.size).toBe(0);
  });

  it("sollte mehrere Varianten pro Produkt korrekt gruppieren", () => {
    const priceUpdates = [
      { productId: "gid://shopify/Product/1", variantId: "variant1", price: "10.00" },
      { productId: "gid://shopify/Product/1", variantId: "variant2", price: "12.00" },
      { productId: "gid://shopify/Product/1", variantId: "variant3", price: "15.00" },
    ];

    const grouped = groupPriceUpdatesByProduct(priceUpdates);
    const product1Updates = grouped.get("gid://shopify/Product/1");

    expect(product1Updates).toHaveLength(3);
    expect(product1Updates?.map((u) => u.variantId)).toEqual(["variant1", "variant2", "variant3"]);
  });
});


