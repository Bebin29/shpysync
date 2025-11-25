import * as fs from "fs";
import * as path from "path";
import type { Product, Variant, CsvRow } from "../../core/domain/types.js";

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

/**
 * Erstellt ein Mock-Produkt für Tests.
 * 
 * @param overrides - Optionale Überschreibungen für Standard-Werte
 * @returns Mock-Produkt
 */
export function createMockProduct(overrides?: Partial<Product>): Product {
  const defaultProduct: Product = {
    id: "gid://shopify/Product/1",
    title: "Test Produkt",
    variants: [
      createMockVariant({
        productId: "gid://shopify/Product/1",
      }),
    ],
  };

  return {
    ...defaultProduct,
    ...overrides,
    variants: overrides?.variants ?? defaultProduct.variants,
  };
}

/**
 * Erstellt eine Mock-Variante für Tests.
 * 
 * @param overrides - Optionale Überschreibungen für Standard-Werte
 * @returns Mock-Variante
 */
export function createMockVariant(overrides?: Partial<Variant>): Variant {
  const defaultVariant: Variant = {
    id: "gid://shopify/ProductVariant/1",
    productId: "gid://shopify/Product/1",
    sku: "SKU-001",
    barcode: null,
    title: "Standard",
    price: "10.00",
    inventoryItemId: "gid://shopify/InventoryItem/1",
  };

  return {
    ...defaultVariant,
    ...overrides,
  };
}

/**
 * Erstellt eine Mock-CSV-Zeile für Tests.
 * 
 * @param overrides - Optionale Überschreibungen für Standard-Werte
 * @returns Mock-CSV-Zeile
 */
export function createMockCsvRow(overrides?: Partial<CsvRow>): CsvRow {
  const defaultRow: CsvRow = {
    rowNumber: 1,
    sku: "SKU-001",
    name: "Test Produkt",
    price: "12.50",
    stock: 10,
    rawData: {
      SKU: "SKU-001",
      Name: "Test Produkt",
      Preis: "12.50",
      Bestand: "10",
    },
  };

  return {
    ...defaultRow,
    ...overrides,
  };
}

/**
 * Erstellt mehrere Mock-Produkte für Tests.
 * 
 * @param count - Anzahl der Produkte
 * @param baseOverrides - Basis-Überschreibungen für alle Produkte
 * @returns Array von Mock-Produkten
 */
export function createMockProducts(
  count: number,
  baseOverrides?: Partial<Product>
): Product[] {
  return Array.from({ length: count }, (_, index) => {
    return createMockProduct({
      ...baseOverrides,
      id: `gid://shopify/Product/${index + 1}`,
      title: `Test Produkt ${index + 1}`,
      variants: [
        createMockVariant({
          productId: `gid://shopify/Product/${index + 1}`,
          id: `gid://shopify/ProductVariant/${index + 1}`,
          sku: `SKU-${String(index + 1).padStart(3, "0")}`,
        }),
      ],
    });
  });
}


