import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { SyncEngine } from "../../../electron/services/sync-engine.js";
import type { ShopConfig, ColumnMapping, SyncStartConfig } from "../../../electron/types/ipc.js";
import { createMockProduct, createMockVariant } from "../helpers/test-utils.js";
import * as fs from "fs";
import * as path from "path";
import * as os from "os";

// Mock File Parser (für CSV und DBF)
vi.mock("../../../core/infra/file-parser/index.js", async () => {
  const actual = await vi.importActual("../../../core/infra/file-parser/index.js");
  const fs = require("fs");
  const path = require("path");
  
  return {
    ...actual,
    parseFileStream: vi.fn(async (filePath: string, fileType?: string) => {
      // Wenn Datei nicht existiert, Fehler werfen
      if (!fs.existsSync(filePath)) {
        const { WawiError } = await import("../../../core/domain/errors.js");
        throw WawiError.csvError("CSV_FILE_NOT_FOUND", `Datei nicht gefunden: ${filePath}`, {
          filePath,
        });
      }
      
      // Erkenne Dateityp basierend auf Endung
      const ext = path.extname(filePath).toLowerCase();
      const detectedType = ext === ".dbf" ? "dbf" : "csv";
      
      // Erstelle AsyncGenerator für rows
      async function* generateRows() {
        yield {
          rowNumber: 2,
          data: {
            SKU: "SKU-001",
            Name: "Test Produkt 1",
            Preis: "12.50",
            Bestand: "10",
          },
        };
        yield {
          rowNumber: 3,
          data: {
            SKU: "SKU-002",
            Name: "Test Produkt 2",
            Preis: "8.99",
            Bestand: "5",
          },
        };
      }
      
      return {
        headers: ["SKU", "Name", "Preis", "Bestand"],
        encoding: "utf-8",
        fileType: detectedType,
        rows: generateRows(),
      };
    }),
  };
});

// Mock Shopify Services
vi.mock("../../../electron/services/shopify-product-service.js", () => ({
  getAllProductsWithVariants: vi.fn(),
  updateVariantPrices: vi.fn(),
}));

vi.mock("../../../electron/services/shopify-inventory-service.js", () => ({
  setInventoryQuantities: vi.fn(),
}));

vi.mock("../../../electron/services/logger.js", () => ({
  getLogger: vi.fn(() => ({
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
    setMainWindow: vi.fn(),
  })),
}));

describe("Sync Flow Integration", () => {
  let syncEngine: SyncEngine;
  let tempDir: string;
  let csvPath: string;
  const mockShopConfig: ShopConfig = {
    shopUrl: "https://test.myshopify.com",
    accessToken: "test-token",
    locationId: "gid://shopify/Location/1",
    locationName: "Test Location",
  };

  beforeEach(() => {
    syncEngine = new SyncEngine();
    tempDir = fs.mkdtempSync(path.join(os.tmpdir(), "sync-integration-test-"));
    
    // Erstelle Test-CSV
    const csvContent = "SKU;Name;Preis;Bestand\nSKU-001;Test Produkt 1;12.50;10\nSKU-002;Test Produkt 2;8.99;5";
    csvPath = path.join(tempDir, "test.csv");
    fs.writeFileSync(csvPath, csvContent, "utf-8");

    vi.clearAllMocks();
  });

  afterEach(() => {
    // Cleanup
    if (fs.existsSync(tempDir)) {
      fs.rmSync(tempDir, { recursive: true, force: true });
    }
  });

  describe("Vollständiger Sync-Workflow", () => {
    it("sollte vollständigen Sync-Workflow durchführen", async () => {
      const { getAllProductsWithVariants } = await import("../../../electron/services/shopify-product-service.js");
      const { updateVariantPrices } = await import("../../../electron/services/shopify-product-service.js");
      const { setInventoryQuantities } = await import("../../../electron/services/shopify-inventory-service.js");

      const mockProducts = [
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

      vi.mocked(getAllProductsWithVariants).mockResolvedValue(mockProducts);
      vi.mocked(updateVariantPrices).mockResolvedValue({
        success: true,
        updatedCount: 2,
      });
      vi.mocked(setInventoryQuantities).mockResolvedValue({
        success: true,
        updatedCount: 2,
      });

      const config: SyncStartConfig = {
        csvPath,
        columnMapping: {
          sku: "A",
          name: "B",
          price: "C",
          stock: "D",
        },
        shopConfig: mockShopConfig,
        options: {
          updatePrices: true,
          updateInventory: true,
          dryRun: false,
        },
      };

      const result = await syncEngine.startSync(config);

      expect(result.totalPlanned).toBeGreaterThan(0);
      expect(result.totalExecuted).toBeGreaterThanOrEqual(0);
      expect(getAllProductsWithVariants).toHaveBeenCalled();
    });
  });

  describe("Fehler-Szenarien", () => {
    it("sollte bei ungültiger CSV einen Fehler behandeln", async () => {
      const invalidCsvPath = path.join(tempDir, "non-existent.csv");

      const config: SyncStartConfig = {
        csvPath: invalidCsvPath,
        columnMapping: {
          sku: "A",
          name: "B",
          price: "C",
          stock: "D",
        },
        shopConfig: mockShopConfig,
        options: {
          updatePrices: true,
          updateInventory: true,
          dryRun: false,
        },
      };

      await expect(syncEngine.startSync(config)).rejects.toThrow();
    });

    it("sollte bei API-Fehler einen Fehler behandeln", async () => {
      const { getAllProductsWithVariants } = await import("../../../electron/services/shopify-product-service.js");

      vi.mocked(getAllProductsWithVariants).mockRejectedValue(new Error("API Error"));

      const config: SyncStartConfig = {
        csvPath,
        columnMapping: {
          sku: "A",
          name: "B",
          price: "C",
          stock: "D",
        },
        shopConfig: mockShopConfig,
        options: {
          updatePrices: true,
          updateInventory: true,
          dryRun: false,
        },
      };

      await expect(syncEngine.startSync(config)).rejects.toThrow();
    });
  });

  describe("DBF-Datei-Unterstützung", () => {
    it("sollte DBF-Datei erkennen und parsen", async () => {
      const dbfPath = path.join(tempDir, "test.dbf");
      fs.writeFileSync(dbfPath, "dummy content"); // Mock-Datei

      const syncEngine = new SyncEngine();
      const shopConfig: ShopConfig = {
        shopUrl: "https://test.myshopify.com",
        accessToken: "shpat_test123",
        locationId: "gid://shopify/Location/1",
        locationName: "Test Location",
      };

      const columnMapping: ColumnMapping = {
        sku: "SKU",
        name: "Name",
        price: "Preis",
        stock: "Bestand",
      };

      const syncConfig: SyncStartConfig = {
        csvPath: dbfPath,
        columnMapping,
        shopConfig,
        options: {
          updatePrices: true,
          updateInventory: true,
          dryRun: false,
        },
      };

      // Mock Shopify-API
      vi.spyOn(syncEngine as any, "loadProducts").mockResolvedValue([
        createMockProduct({
          id: "gid://shopify/Product/1",
          title: "Test Produkt 1",
          variants: [
            createMockVariant({
              id: "gid://shopify/ProductVariant/1",
              productId: "gid://shopify/Product/1",
              sku: "SKU-001",
            }),
          ],
        }),
      ]);

      vi.spyOn(syncEngine as any, "updatePrices").mockResolvedValue([]);
      vi.spyOn(syncEngine as any, "updateInventory").mockResolvedValue([]);

      const result = await syncEngine.startSync(syncConfig);

      expect(result.totalPlanned).toBeGreaterThan(0);
      expect(result.operations.length).toBeGreaterThan(0);
    });
  });

  describe("Partial-Success", () => {
    it("sollte Partial-Success behandeln (einige Updates fehlgeschlagen)", async () => {
      const { getAllProductsWithVariants } = await import("../../../electron/services/shopify-product-service.js");
      const { updateVariantPrices } = await import("../../../electron/services/shopify-product-service.js");

      const mockProducts = [
        createMockProduct({
          id: "gid://shopify/Product/1",
          variants: [
            createMockVariant({
              sku: "SKU-001",
              inventoryItemId: "gid://shopify/InventoryItem/1",
            }),
          ],
        }),
      ];

      vi.mocked(getAllProductsWithVariants).mockResolvedValue(mockProducts);
      // Ein Update schlägt fehl
      vi.mocked(updateVariantPrices).mockResolvedValue({
        success: false,
        updatedCount: 0,
        errors: ["Update fehlgeschlagen"],
      });

      const config: SyncStartConfig = {
        csvPath,
        columnMapping: {
          sku: "A",
          name: "B",
          price: "C",
          stock: "D",
        },
        shopConfig: mockShopConfig,
        options: {
          updatePrices: true,
          updateInventory: false,
          dryRun: false,
        },
      };

      const result = await syncEngine.startSync(config);

      // Sollte trotzdem ein Ergebnis zurückgeben (Partial-Success)
      expect(result).toBeDefined();
      expect(result.totalPlanned).toBeGreaterThan(0);
    });
  });
});

