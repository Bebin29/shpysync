import { describe, it, expect, beforeEach, vi } from "vitest";
import type { BrowserWindow } from "electron";
import { SyncEngine } from "../../../../electron/services/sync-engine.js";
import type { ShopConfig, ColumnMapping, SyncPreviewRequest, SyncStartConfig } from "../../../../electron/types/ipc.js";
import { createMockProduct, createMockVariant } from "../../../helpers/test-utils.js";
import * as fs from "fs";
import * as path from "path";
import * as os from "os";

// Mock CSV Parser
vi.mock("../../../../core/infra/csv/parser.js", async () => {
  const actual = await vi.importActual("../../../../core/infra/csv/parser.js");
  return {
    ...actual,
    parseCsvStream: vi.fn(async () => {
      // Erstelle AsyncGenerator für rows
      async function* generateRows() {
        yield {
          rowNumber: 2,
          data: {
            SKU: "SKU-001",
            Name: "Test Produkt",
            Preis: "12.50",
            Bestand: "10",
          },
        };
      }
      
      return {
        headers: ["SKU", "Name", "Preis", "Bestand"],
        encoding: "utf-8",
        rows: generateRows(),
      };
    }),
  };
});

// Mock Shopify Services
vi.mock("../../../../electron/services/shopify-product-service.js", () => ({
  getAllProductsWithVariants: vi.fn(),
  updateVariantPrices: vi.fn(),
}));

vi.mock("../../../../electron/services/shopify-inventory-service.js", () => ({
  setInventoryQuantities: vi.fn(),
}));

vi.mock("../../../../electron/services/logger.js", () => ({
  getLogger: vi.fn(() => ({
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
    setMainWindow: vi.fn(),
  })),
}));

describe("SyncEngine", () => {
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
    tempDir = fs.mkdtempSync(path.join(os.tmpdir(), "sync-test-"));
    
    // Erstelle Test-CSV
    const csvContent = "SKU;Name;Preis;Bestand\nSKU-001;Test Produkt;12.50;10";
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

  describe("generatePreview", () => {
    it("sollte Vorschau ohne Ausführung generieren", async () => {
      const { getAllProductsWithVariants } = await import("../../../../electron/services/shopify-product-service.js");

      const mockProducts = [
        createMockProduct({
          id: "gid://shopify/Product/1",
          title: "Test Produkt",
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
      ];

      vi.mocked(getAllProductsWithVariants).mockResolvedValue(mockProducts);

      const config: SyncPreviewRequest = {
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
        },
      };

      const result = await syncEngine.generatePreview(config);

      expect(result.planned.length).toBeGreaterThan(0);
      expect(result.unmatchedRows).toBeDefined();
      expect(getAllProductsWithVariants).toHaveBeenCalled();
    });

    it("sollte nur Preis-Updates in Vorschau enthalten wenn updateInventory false", async () => {
      const { getAllProductsWithVariants } = await import("../../../../electron/services/shopify-product-service.js");

      const mockProducts = [
        createMockProduct({
          variants: [
            createMockVariant({
              sku: "SKU-001",
              inventoryItemId: "gid://shopify/InventoryItem/1",
            }),
          ],
        }),
      ];

      vi.mocked(getAllProductsWithVariants).mockResolvedValue(mockProducts);

      const config: SyncPreviewRequest = {
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
        },
      };

      const result = await syncEngine.generatePreview(config);

      // Sollte nur Preis-Updates enthalten
      const priceOps = result.planned.filter((op) => op.type === "price");
      const inventoryOps = result.planned.filter((op) => op.type === "inventory");
      
      expect(priceOps.length).toBeGreaterThan(0);
      expect(inventoryOps.length).toBe(0);
    });
  });

  describe("cancel", () => {
    it("sollte Sync abbrechen können", () => {
      syncEngine.cancel();
      // Prüfe, dass cancel() ohne Fehler aufgerufen werden kann
      expect(() => syncEngine.cancel()).not.toThrow();
    });
  });

  describe("setMainWindow", () => {
    it("sollte MainWindow setzen können", () => {
      const mockWindow = {
        webContents: {
          send: vi.fn(),
        },
      } as unknown as BrowserWindow;

      expect(() => syncEngine.setMainWindow(mockWindow)).not.toThrow();
    });

    it("sollte MainWindow auf null setzen können", () => {
      expect(() => syncEngine.setMainWindow(null)).not.toThrow();
    });
  });
});

