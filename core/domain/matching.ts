import type { Product, Variant, MatchResult } from "./types.js";
import type { VariantMaps } from "./types.js";
import { normalizeString } from "../utils/normalization.js";

// Export VariantMaps für Verwendung in anderen Modulen
export type { VariantMaps };

/**
 * Erstellt Variant-Maps für effizientes Matching.
 * 
 * Portiert von Python `build_variant_maps()` Funktion.
 * 
 * @param products - Liste von Shopify-Produkten
 * @returns Variant-Maps für Matching
 */
export function buildVariantMaps(products: Product[]): VariantMaps {
  const skuToVariant = new Map<string, string>();
  const nameToVariants = new Map<string, string[]>();
  const extraNameMap = new Map<string, string>();
  const variantToProduct = new Map<string, string>();

  for (const product of products) {
    const productId = product.id;
    const productTitle = product.title || "";
    const productTitleNorm = normalizeString(productTitle);

    // Initialisiere nameToVariants für dieses Produkt
    if (!nameToVariants.has(productTitleNorm)) {
      nameToVariants.set(productTitleNorm, []);
    }

    for (const variant of product.variants) {
      const variantId = variant.id;
      variantToProduct.set(variantId, productId);

      // SKU-Mapping
      const sku = (variant.sku || "").trim();
      if (sku) {
        if (skuToVariant.has(sku) && skuToVariant.get(sku) !== variantId) {
          console.warn(`Doppelte SKU: ${sku} – überschreibe Mapping.`);
        }
        skuToVariant.set(sku, variantId);
      }

      // Name-Mapping (Product-Title)
      const variantsForName = nameToVariants.get(productTitleNorm)!;
      variantsForName.push(variantId);

      // Kombinierter Name (Product + Variant)
      const variantTitle = variant.title || "";
      const comboKey = normalizeString(`${productTitle} ${variantTitle}`);
      extraNameMap.set(comboKey, variantId);

      // Barcode-Mapping
      const barcode = (variant.barcode || "").trim();
      if (barcode) {
        extraNameMap.set(barcode, variantId);
      }
    }
  }

  return {
    skuToVariant,
    nameToVariants,
    extraNameMap,
    variantToProduct,
  };
}

/**
 * Findet Variant-ID für eine CSV-Zeile.
 * 
 * Verwendet nur noch SKU-Matching (exakt) für höchste Genauigkeit.
 * Alle anderen Matching-Methoden wurden entfernt, um Fehlmatches zu vermeiden.
 * 
 * @param rowSku - SKU aus CSV-Zeile
 * @param rowName - Name aus CSV-Zeile (wird nicht mehr verwendet, bleibt für API-Kompatibilität)
 * @param maps - Variant-Maps
 * @returns Match-Ergebnis
 */
export function findVariantId(
  rowSku: string,
  rowName: string,
  maps: VariantMaps
): MatchResult {
  // Nur SKU-Matching (exakt)
  if (rowSku) {
    const variantId = maps.skuToVariant.get(rowSku);
    if (variantId) {
      return {
        variantId,
        method: "sku",
        confidence: "exact",
      };
    }
  }

  // Kein Match gefunden
  return {
    variantId: null,
    method: null,
    confidence: "low",
  };
}

