/**
 * Mock-Daten-Generatoren für Tests
 *
 * Diese Datei enthält Factory-Funktionen zur Generierung von Mock-Daten
 * für verschiedene Test-Szenarien.
 */

import type { Product, Variant, CsvRow } from "../../core/domain/types.js";

/**
 * Erstellt ein Mock-Produkt mit Standard-Werten.
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
 * Erstellt eine Mock-Variante mit Standard-Werten.
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
 * Erstellt eine Mock-CSV-Zeile mit Standard-Werten.
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
    rawData: overrides?.rawData ?? defaultRow.rawData,
  };
}

/**
 * Erstellt mehrere Mock-Produkte.
 *
 * @param count - Anzahl der Produkte
 * @param baseOverrides - Basis-Überschreibungen für alle Produkte
 * @returns Array von Mock-Produkten
 */
export function createMockProducts(count: number, baseOverrides?: Partial<Product>): Product[] {
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

/**
 * Erstellt mehrere Mock-CSV-Zeilen.
 *
 * @param count - Anzahl der Zeilen
 * @param baseOverrides - Basis-Überschreibungen für alle Zeilen
 * @returns Array von Mock-CSV-Zeilen
 */
export function createMockCsvRows(count: number, baseOverrides?: Partial<CsvRow>): CsvRow[] {
  return Array.from({ length: count }, (_, index) => {
    return createMockCsvRow({
      ...baseOverrides,
      rowNumber: index + 1,
      sku: `SKU-${String(index + 1).padStart(3, "0")}`,
      name: `Test Produkt ${index + 1}`,
      rawData: {
        SKU: `SKU-${String(index + 1).padStart(3, "0")}`,
        Name: `Test Produkt ${index + 1}`,
        Preis: "12.50",
        Bestand: "10",
      },
    });
  });
}

/**
 * Erstellt ein Produkt mit mehreren Varianten.
 *
 * @param variantCount - Anzahl der Varianten
 * @param productOverrides - Optionale Überschreibungen für das Produkt
 * @returns Produkt mit mehreren Varianten
 */
export function createMockProductWithVariants(
  variantCount: number,
  productOverrides?: Partial<Product>
): Product {
  const productId = productOverrides?.id ?? "gid://shopify/Product/1";
  const variants = Array.from({ length: variantCount }, (_, index) => {
    return createMockVariant({
      productId,
      id: `gid://shopify/ProductVariant/${index + 1}`,
      sku: `SKU-VAR-${String(index + 1).padStart(3, "0")}`,
      title: `Variante ${index + 1}`,
    });
  });

  return createMockProduct({
    ...productOverrides,
    id: productId,
    variants,
  });
}

/**
 * Erstellt ein Produkt mit Edge-Case-Daten (leere Werte, Sonderzeichen, etc.).
 *
 * @param type - Typ des Edge-Cases
 * @returns Produkt mit Edge-Case-Daten
 */
export function createMockProductEdgeCase(
  type: "empty-sku" | "empty-name" | "special-chars" | "long-name" | "unicode"
): Product {
  switch (type) {
    case "empty-sku":
      return createMockProduct({
        title: "Produkt ohne SKU",
        variants: [
          createMockVariant({
            sku: null,
            barcode: null,
          }),
        ],
      });

    case "empty-name":
      return createMockProduct({
        title: "",
        variants: [createMockVariant()],
      });

    case "special-chars":
      return createMockProduct({
        title: "Produkt mit Sonderzeichen: !@#$%^&*()",
        variants: [
          createMockVariant({
            sku: "SKU-!@#",
          }),
        ],
      });

    case "long-name":
      return createMockProduct({
        title: "A".repeat(500), // Sehr langer Name
        variants: [createMockVariant()],
      });

    case "unicode":
      return createMockProduct({
        title: "Produkt mit Unicode: 测试 🚀 ñáéíóú",
        variants: [
          createMockVariant({
            sku: "SKU-测试",
          }),
        ],
      });

    default:
      return createMockProduct();
  }
}

/**
 * Erstellt eine CSV-Zeile mit verschiedenen Preisformaten.
 *
 * @param priceFormat - Format des Preises
 * @returns CSV-Zeile mit formatiertem Preis
 */
export function createMockCsvRowWithPriceFormat(
  priceFormat: "comma" | "dot" | "currency" | "whitespace" | "invalid"
): CsvRow {
  const priceMap: Record<string, string> = {
    comma: "12,50",
    dot: "12.50",
    currency: "12,50 €",
    whitespace: "  12,50  ",
    invalid: "invalid-price",
  };

  return createMockCsvRow({
    price: priceMap[priceFormat],
    rawData: {
      SKU: "SKU-001",
      Name: "Test Produkt",
      Preis: priceMap[priceFormat],
      Bestand: "10",
    },
  });
}

/**
 * Erstellt ein Shopify-Produkt-Array für GraphQL-Responses.
 *
 * @param count - Anzahl der Produkte
 * @returns Array von Shopify-Produkten
 */
export function createMockShopifyProducts(count: number): Product[] {
  return createMockProducts(count);
}

/**
 * Erstellt Mock-Daten für einen vollständigen Sync-Test.
 *
 * @param productCount - Anzahl der Produkte
 * @param csvRowCount - Anzahl der CSV-Zeilen
 * @returns Objekt mit Produkten und CSV-Zeilen
 */
export function createMockSyncTestData(
  productCount: number = 5,
  csvRowCount: number = 5
): {
  products: Product[];
  csvRows: CsvRow[];
} {
  return {
    products: createMockProducts(productCount),
    csvRows: createMockCsvRows(csvRowCount),
  };
}
