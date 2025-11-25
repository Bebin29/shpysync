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
 * Portiert von Python `find_variant_id()` Funktion.
 * Matching-Priorität:
 * 1. SKU (exakt)
 * 2. Name exakt (normalisiert)
 * 3. Name mit Kürzung (nach "-" oder "(")
 * 4. Prefix-Matching (vorsichtig)
 * 5. Kombinierter Name oder Barcode
 * 
 * @param rowSku - SKU aus CSV-Zeile
 * @param rowName - Name aus CSV-Zeile
 * @param maps - Variant-Maps
 * @returns Match-Ergebnis
 */
export function findVariantId(
  rowSku: string,
  rowName: string,
  maps: VariantMaps
): MatchResult {
  // 1) SKU-Matching (höchste Priorität)
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

  // 2) Name exakt (normalisiert)
  const nameNorm = normalizeString(rowName);
  const variants = maps.nameToVariants.get(nameNorm);
  if (variants && variants.length > 0) {
    return {
      variantId: variants[0],
      method: "name",
      confidence: "exact",
    };
  }

  // 3) Name mit Kürzung ("Product - Variant" / "Product (…)" kürzen)
  const baseMatch = rowName.match(/^([^-\n(]+)/);
  if (baseMatch) {
    const base = baseMatch[1].trim();
    const baseNorm = normalizeString(base);
    const baseVariants = maps.nameToVariants.get(baseNorm);
    if (baseVariants && baseVariants.length > 0) {
      return {
        variantId: baseVariants[0],
        method: "name",
        confidence: "partial",
      };
    }
  }

  // 4) Prefix-Matching (vorsichtig - nur wenn genau ein Kandidat)
  const candidates: string[] = [];
  for (const [key, variantIds] of maps.nameToVariants.entries()) {
    if (nameNorm.startsWith(key) || key.startsWith(nameNorm)) {
      candidates.push(key);
    }
  }
  if (candidates.length === 1) {
    const variantIds = maps.nameToVariants.get(candidates[0])!;
    return {
      variantId: variantIds[0],
      method: "prefix",
      confidence: "low",
    };
  }

  // 5) Kombinierter Name oder Barcode
  const variantId = maps.extraNameMap.get(nameNorm);
  if (variantId) {
    return {
      variantId,
      method: "barcode", // Könnte auch kombinierter Name sein, aber wir unterscheiden nicht
      confidence: "exact",
    };
  }

  // Kein Match gefunden
  return {
    variantId: null,
    method: null,
    confidence: "low",
  };
}

