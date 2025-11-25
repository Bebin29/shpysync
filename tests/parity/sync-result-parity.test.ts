import { describe, it, expect, beforeAll } from "vitest";
import { processCsvToUpdates, type ProcessCsvToUpdatesResult } from "../../../core/domain/sync-pipeline.js";
import type { CsvRow, Product, MappedRow } from "../../../core/domain/types.js";
import { loadFixture } from "../helpers/test-utils.js";

describe("Sync Result Parity", () => {
  let products: Product[];
  let csvRows: CsvRow[];

  beforeAll(() => {
    // Lade Produkte aus Fixture
    products = loadFixture<Product[]>("sample-products.json");

    // Erstelle CSV-Rows aus Sample-CSV
    // Für Paritäts-Tests verwenden wir einfache Test-Daten
    csvRows = [
      {
        rowNumber: 1,
        sku: "SKU-001",
        name: "Test Produkt 1",
        price: "12,50",
        stock: 10,
        rawData: {
          SKU: "SKU-001",
          Name: "Test Produkt 1",
          Preis: "12,50",
          Bestand: "10",
        },
      },
      {
        rowNumber: 2,
        sku: "SKU-002",
        name: "Test Produkt 2",
        price: "8.99",
        stock: 5,
        rawData: {
          SKU: "SKU-002",
          Name: "Test Produkt 2",
          Preis: "8.99",
          Bestand: "5",
        },
      },
      {
        rowNumber: 3,
        sku: "",
        name: "Produkt ohne SKU",
        price: "15.00",
        stock: 20,
        rawData: {
          SKU: "",
          Name: "Produkt ohne SKU",
          Preis: "15.00",
          Bestand: "20",
        },
      },
    ];
  });

  describe("Preis-Updates", () => {
    it("sollte Preis-Updates korrekt generieren", () => {
      const result = processCsvToUpdates(csvRows, products, {
        updatePrices: true,
        updateInventory: false,
      });

      expect(result.priceUpdates.length).toBeGreaterThan(0);
      
      // Prüfe, dass Preise normalisiert wurden
      const priceUpdate = result.priceUpdates.find(
        (u: { productId: string; variantId: string; price: string }) => u.variantId === "gid://shopify/ProductVariant/1"
      );
      expect(priceUpdate).toBeDefined();
      expect(priceUpdate?.price).toBe("12.50"); // Normalisiert von "12,50"
    });

    it("sollte Preise in Shopify-Format normalisieren (2 Dezimalstellen)", () => {
      const result = processCsvToUpdates(csvRows, products, {
        updatePrices: true,
        updateInventory: false,
      });

      for (const update of result.priceUpdates) {
        // Prüfe, dass alle Preise im Format "XX.XX" sind
        expect(update.price).toMatch(/^\d+\.\d{2}$/);
      }
    });
  });

  describe("Inventory-Updates", () => {
    it("sollte Inventory-Updates korrekt generieren", () => {
      const result = processCsvToUpdates(csvRows, products, {
        updatePrices: false,
        updateInventory: true,
      });

      expect(result.inventoryUpdates.length).toBeGreaterThan(0);
      
      // Prüfe, dass Inventory-Updates korrekte Quantitäten haben
      const inventoryUpdate = result.inventoryUpdates.find(
        (u: { inventoryItemId: string; quantity: number }) => u.inventoryItemId === "gid://shopify/InventoryItem/1"
      );
      expect(inventoryUpdate).toBeDefined();
      expect(inventoryUpdate?.quantity).toBe(10);
    });

    it("sollte Inventory-Updates koaleszieren (Duplikate entfernen)", () => {
      // Erstelle CSV-Rows mit Duplikaten
      const duplicateRows: CsvRow[] = [
        {
          rowNumber: 1,
          sku: "SKU-001",
          name: "Test Produkt 1",
          price: "12.50",
          stock: 10,
          rawData: {},
        },
        {
          rowNumber: 2,
          sku: "SKU-001", // Gleiche SKU
          name: "Test Produkt 1",
          price: "12.50",
          stock: 20, // Anderer Bestand
          rawData: {},
        },
      ];

      const result = processCsvToUpdates(duplicateRows, products, {
        updatePrices: false,
        updateInventory: true,
      });

      // Sollte nur ein Update haben (Last-write-wins)
      expect(result.inventoryUpdates.length).toBe(1);
      expect(result.inventoryUpdates[0].quantity).toBe(20);
    });
  });

  describe("MappedRows", () => {
    it("sollte MappedRows für erfolgreich gematchte Zeilen erstellen", () => {
      const result = processCsvToUpdates(csvRows, products, {
        updatePrices: true,
        updateInventory: true,
      });

      expect(result.mappedRows.length).toBeGreaterThan(0);
      
      // Prüfe, dass gematchte Zeilen korrekte Variant-IDs haben
      const mappedRow = result.mappedRows.find(
        (m: MappedRow) => m.csvRow.sku === "SKU-001"
      );
      expect(mappedRow).toBeDefined();
      expect(mappedRow?.variantId).toBe("gid://shopify/ProductVariant/1");
      expect(mappedRow?.matchMethod).toBe("sku");
    });
  });

  describe("UnmatchedRows", () => {
    it("sollte nicht-gematchte Zeilen als unmatchedRows markieren", () => {
      const unmatchedRows: CsvRow[] = [
        {
          rowNumber: 1,
          sku: "UNKNOWN-SKU",
          name: "Unbekanntes Produkt",
          price: "12.50",
          stock: 10,
          rawData: {},
        },
      ];

      const result = processCsvToUpdates(unmatchedRows, products, {
        updatePrices: true,
        updateInventory: true,
      });

      expect(result.unmatchedRows.length).toBe(1);
      expect(result.unmatchedRows[0].sku).toBe("UNKNOWN-SKU");
    });
  });

  describe("Kombinierte Updates", () => {
    it("sollte sowohl Preis- als auch Inventory-Updates generieren", () => {
      const result = processCsvToUpdates(csvRows, products, {
        updatePrices: true,
        updateInventory: true,
      });

      expect(result.priceUpdates.length).toBeGreaterThan(0);
      expect(result.inventoryUpdates.length).toBeGreaterThan(0);
      expect(result.mappedRows.length).toBeGreaterThan(0);
    });
  });

  describe("Validierung", () => {
    it("sollte Zeilen ohne Preis als unmatchedRows markieren (wenn updatePrices true)", () => {
      const rowsWithoutPrice: CsvRow[] = [
        {
          rowNumber: 1,
          sku: "SKU-001",
          name: "Test Produkt 1",
          price: "", // Leerer Preis
          stock: 10,
          rawData: {},
        },
      ];

      const result = processCsvToUpdates(rowsWithoutPrice, products, {
        updatePrices: true,
        updateInventory: false,
      });

      expect(result.unmatchedRows.length).toBe(1);
    });

    it("sollte Zeilen ohne Bestand als unmatchedRows markieren (wenn updateInventory true)", () => {
      const rowsWithoutStock: Array<Omit<CsvRow, "stock"> & { stock?: number }> = [
        {
          rowNumber: 1,
          sku: "SKU-001",
          name: "Test Produkt 1",
          price: "12.50",
          stock: undefined, // Kein Bestand
          rawData: {},
        },
      ];

      const result = processCsvToUpdates(rowsWithoutStock as CsvRow[], products, {
        updatePrices: false,
        updateInventory: true,
      });

      expect(result.unmatchedRows.length).toBe(1);
    });
  });
});

