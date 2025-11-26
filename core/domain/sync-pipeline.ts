import type { CsvRow, Product, Variant, MatchResult, MappedRow } from "./types.js";
import { buildVariantMaps, findVariantId, type VariantMaps } from "./matching.js";
import { normalizePrice } from "./price-normalizer.js";
import { coalesceInventoryUpdates } from "./inventory-coalescing.js";

/**
 * Verarbeitet CSV-Zeilen zu Preis- und Inventory-Updates.
 * 
 * Portiert von Python `process_csv()` Funktion (Zeilen 450-543).
 * 
 * @param csvRows - Liste von CSV-Zeilen (bereits gemappt und extrahiert)
 * @param products - Liste von Shopify-Produkten
 * @param options - Update-Optionen
 * @returns Preis-Updates (gruppiert nach Produkt), Inventory-Updates und nicht-gematchte Zeilen
 */
export interface ProcessCsvToUpdatesResult {
  priceUpdates: Array<{ productId: string; variantId: string; price: string }>;
  inventoryUpdates: Array<{ inventoryItemId: string; quantity: number }>;
  mappedRows: MappedRow[];
  unmatchedRows: CsvRow[];
}

export function processCsvToUpdates(
  csvRows: CsvRow[],
  products: Product[],
  options: { updatePrices: boolean; updateInventory: boolean }
): ProcessCsvToUpdatesResult {
  // Variant-Maps für effizientes Matching erstellen
  const variantMaps = buildVariantMaps(products);

  // Maps für schnellen Zugriff auf Variant-Daten
  const variantMap = new Map<string, Variant>();
  for (const product of products) {
    for (const variant of product.variants) {
      variantMap.set(variant.id, variant);
    }
  }

  const priceUpdates: Array<{ productId: string; variantId: string; price: string }> = [];
  const inventoryUpdates: Array<{ inventoryItemId: string; quantity: number }> = [];
  const mappedRows: MappedRow[] = [];
  const unmatchedRows: CsvRow[] = [];

  for (const csvRow of csvRows) {
    // Validierung: Preis und Bestand müssen vorhanden sein
    if (options.updatePrices && (!csvRow.price || csvRow.price.trim() === "")) {
      console.warn(
        `Zeile ${csvRow.rowNumber}: kein Preis angegeben – übersprungen (SKU='${csvRow.sku}', Name='${csvRow.name}')`
      );
      unmatchedRows.push(csvRow);
      continue;
    }

    if (options.updateInventory && (csvRow.stock === undefined || csvRow.stock === null)) {
      console.warn(
        `Zeile ${csvRow.rowNumber}: kein Bestand angegeben – übersprungen (SKU='${csvRow.sku}', Name='${csvRow.name}')`
      );
      unmatchedRows.push(csvRow);
      continue;
    }

    // Matching durchführen
    const matchResult: MatchResult = findVariantId(csvRow.sku, csvRow.name, variantMaps);

    if (!matchResult.variantId) {
      console.warn(
        `Zeile ${csvRow.rowNumber}: Keine Variant-ID für SKU='${csvRow.sku}' Name='${csvRow.name}' – übersprungen.`
      );
      unmatchedRows.push(csvRow);
      mappedRows.push({
        csvRow,
        variantId: null,
        matchMethod: null,
        matchConfidence: "low",
      });
      continue;
    }

    const variantId = matchResult.variantId;
    const variant = variantMap.get(variantId);

    if (!variant) {
      console.warn(`Zeile ${csvRow.rowNumber}: Variant ${variantId} nicht gefunden – übersprungen.`);
      unmatchedRows.push(csvRow);
      mappedRows.push({
        csvRow,
        variantId: null,
        matchMethod: null,
        matchConfidence: "low",
      });
      continue;
    }

    // Produkt-ID aus Variant-Map holen
    const productId = variantMaps.variantToProduct.get(variantId);
    if (!productId) {
      console.warn(`Zeile ${csvRow.rowNumber}: Kein Produkt zu Variant ${variantId} – übersprungen.`);
      unmatchedRows.push(csvRow);
      mappedRows.push({
        csvRow,
        variantId: null,
        matchMethod: null,
        matchConfidence: "low",
      });
      continue;
    }

    // Preis-Update vorbereiten (nur wenn sich der Preis geändert hat)
    if (options.updatePrices && csvRow.price && csvRow.price.trim() !== "") {
      try {
        const normalizedPrice = normalizePrice(csvRow.price);
        const currentPrice = variant.price;
        
        // Nur updaten, wenn sich der Preis geändert hat
        if (normalizedPrice !== currentPrice) {
          priceUpdates.push({
            productId,
            variantId,
            price: normalizedPrice,
          });
        } else {
          // Preis unverändert - als gematcht markieren, aber kein Update
          console.debug(
            `Zeile ${csvRow.rowNumber}: Preis unverändert (${currentPrice}) – übersprungen.`
          );
        }
      } catch (error) {
        console.warn(
          `Zeile ${csvRow.rowNumber}: Preis konnte nicht normalisiert werden ('${csvRow.price}') – übersprungen: ${error}`
        );
        unmatchedRows.push(csvRow);
        mappedRows.push({
          csvRow,
          variantId: null,
          matchMethod: null,
          matchConfidence: "low",
        });
        continue;
      }
    }

    // Inventory-Update vorbereiten (nur wenn sich der Bestand geändert hat)
    if (options.updateInventory && csvRow.stock !== undefined && csvRow.stock !== null) {
      const inventoryItemId = variant.inventoryItemId;
      if (inventoryItemId) {
        const currentQuantity = variant.currentQuantity;
        
        // Nur updaten, wenn sich der Bestand geändert hat
        if (currentQuantity === undefined || currentQuantity !== csvRow.stock) {
          inventoryUpdates.push({
            inventoryItemId,
            quantity: csvRow.stock,
          });
        } else {
          // Bestand unverändert - als gematcht markieren, aber kein Update
          console.debug(
            `Zeile ${csvRow.rowNumber}: Bestand unverändert (${currentQuantity}) – übersprungen.`
          );
        }
      } else {
        console.warn(
          `Zeile ${csvRow.rowNumber}: inventoryItem-ID fehlt für Variant ${variantId} – Inventur-Update übersprungen.`
        );
      }
    }

    // Mapped Row hinzufügen
    mappedRows.push({
      csvRow,
      variantId,
      matchMethod: matchResult.method,
      matchConfidence: matchResult.confidence,
    });
  }

  // Inventory-Updates koaleszieren (Duplikate entfernen)
  const coalescedInventoryUpdates = coalesceInventoryUpdates(inventoryUpdates);

  // Preis-Updates nach Produkt gruppieren (für Bulk-Updates)
  const priceUpdatesByProduct = new Map<string, Array<{ variantId: string; price: string }>>();
  for (const update of priceUpdates) {
    if (!priceUpdatesByProduct.has(update.productId)) {
      priceUpdatesByProduct.set(update.productId, []);
    }
    priceUpdatesByProduct.get(update.productId)!.push({
      variantId: update.variantId,
      price: update.price,
    });
  }

  // Flatten für Rückgabe (aber gruppiert nach Produkt für Bulk-Updates)
  const flattenedPriceUpdates: Array<{ productId: string; variantId: string; price: string }> = [];
  for (const [productId, updates] of priceUpdatesByProduct.entries()) {
    for (const update of updates) {
      flattenedPriceUpdates.push({
        productId,
        variantId: update.variantId,
        price: update.price,
      });
    }
  }

  return {
    priceUpdates: flattenedPriceUpdates,
    inventoryUpdates: coalescedInventoryUpdates,
    mappedRows,
    unmatchedRows,
  };
}

/**
 * Gruppiert Preis-Updates nach Produkt-ID für Bulk-Updates.
 * 
 * @param priceUpdates - Liste von Preis-Updates
 * @returns Map von Produkt-ID zu Liste von Variant-Updates
 */
export function groupPriceUpdatesByProduct(
  priceUpdates: Array<{ productId: string; variantId: string; price: string }>
): Map<string, Array<{ variantId: string; price: string }>> {
  const grouped = new Map<string, Array<{ variantId: string; price: string }>>();

  for (const update of priceUpdates) {
    if (!grouped.has(update.productId)) {
      grouped.set(update.productId, []);
    }
    grouped.get(update.productId)!.push({
      variantId: update.variantId,
      price: update.price,
    });
  }

  return grouped;
}

