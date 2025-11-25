import { buildVariantMaps, findVariantId } from "./matching";
import { normalizePrice } from "./price-normalizer";
import { coalesceInventoryUpdates } from "./inventory-coalescing";
export function processCsvToUpdates(csvRows, products, options) {
    // Variant-Maps für effizientes Matching erstellen
    const variantMaps = buildVariantMaps(products);
    // Maps für schnellen Zugriff auf Variant-Daten
    const variantMap = new Map();
    for (const product of products) {
        for (const variant of product.variants) {
            variantMap.set(variant.id, variant);
        }
    }
    const priceUpdates = [];
    const inventoryUpdates = [];
    const mappedRows = [];
    const unmatchedRows = [];
    for (const csvRow of csvRows) {
        // Validierung: Preis und Bestand müssen vorhanden sein
        if (options.updatePrices && (!csvRow.price || csvRow.price.trim() === "")) {
            console.warn(`Zeile ${csvRow.rowNumber}: kein Preis angegeben – übersprungen (SKU='${csvRow.sku}', Name='${csvRow.name}')`);
            unmatchedRows.push(csvRow);
            continue;
        }
        if (options.updateInventory && (csvRow.stock === undefined || csvRow.stock === null)) {
            console.warn(`Zeile ${csvRow.rowNumber}: kein Bestand angegeben – übersprungen (SKU='${csvRow.sku}', Name='${csvRow.name}')`);
            unmatchedRows.push(csvRow);
            continue;
        }
        // Matching durchführen
        const matchResult = findVariantId(csvRow.sku, csvRow.name, variantMaps);
        if (!matchResult.variantId) {
            console.warn(`Zeile ${csvRow.rowNumber}: Keine Variant-ID für SKU='${csvRow.sku}' Name='${csvRow.name}' – übersprungen.`);
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
        // Preis-Update vorbereiten
        if (options.updatePrices && csvRow.price && csvRow.price.trim() !== "") {
            try {
                const normalizedPrice = normalizePrice(csvRow.price);
                priceUpdates.push({
                    productId,
                    variantId,
                    price: normalizedPrice,
                });
            }
            catch (error) {
                console.warn(`Zeile ${csvRow.rowNumber}: Preis konnte nicht normalisiert werden ('${csvRow.price}') – übersprungen: ${error}`);
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
        // Inventory-Update vorbereiten
        if (options.updateInventory && csvRow.stock !== undefined && csvRow.stock !== null) {
            const inventoryItemId = variant.inventoryItemId;
            if (inventoryItemId) {
                inventoryUpdates.push({
                    inventoryItemId,
                    quantity: csvRow.stock,
                });
            }
            else {
                console.warn(`Zeile ${csvRow.rowNumber}: inventoryItem-ID fehlt für Variant ${variantId} – Inventur-Update übersprungen.`);
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
    const priceUpdatesByProduct = new Map();
    for (const update of priceUpdates) {
        if (!priceUpdatesByProduct.has(update.productId)) {
            priceUpdatesByProduct.set(update.productId, []);
        }
        priceUpdatesByProduct.get(update.productId).push({
            variantId: update.variantId,
            price: update.price,
        });
    }
    // Flatten für Rückgabe (aber gruppiert nach Produkt für Bulk-Updates)
    const flattenedPriceUpdates = [];
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
export function groupPriceUpdatesByProduct(priceUpdates) {
    const grouped = new Map();
    for (const update of priceUpdates) {
        if (!grouped.has(update.productId)) {
            grouped.set(update.productId, []);
        }
        grouped.get(update.productId).push({
            variantId: update.variantId,
            price: update.price,
        });
    }
    return grouped;
}
