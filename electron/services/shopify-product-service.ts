import type { ShopifyConfig } from "../../core/infra/shopify/client.js";
import { getAllProducts, updatePricesBulk } from "../../core/infra/shopify/client.js";
import type { Product } from "../../core/domain/types.js";
import type { UserError } from "../../core/infra/shopify/client.js";
import { getApiVersionFromConfig } from "./api-version-manager.js";
import { getConfig } from "./config-service.js";

/**
 * Shopify Product Service für Electron Main Process.
 * 
 * Domain-Service für Produkt-bezogene Operationen.
 * Kapselt die Low-Level Client-Funktionen mit Electron-spezifischen Anpassungen.
 */

/**
 * Ruft alle Produkte mit Varianten von Shopify ab.
 * 
 * Nutzt Cursor-Pagination (max 250 Varianten pro Produkt).
 * 
 * @param config - Shopify-Konfiguration (ohne API-Version, wird aus Config geladen)
 * @returns Liste von Produkten mit allen Varianten
 */
export async function getAllProductsWithVariants(
	config: ShopifyConfig
): Promise<Product[]> {
	// Lade API-Version aus Config
	const appConfig = getConfig();
	const apiVersion = getApiVersionFromConfig(appConfig);

	const configWithVersion: ShopifyConfig = {
		...config,
		apiVersion,
	};

	return getAllProducts(configWithVersion);
}

/**
 * Aktualisiert Preise für Varianten (Bulk-Update pro Produkt).
 * 
 * @param config - Shopify-Konfiguration (ohne API-Version, wird aus Config geladen)
 * @param productId - Product GID
 * @param updates - Liste von (variantId, price)-Paaren
 * @returns Erfolg-Status und UserErrors
 */
export async function updateVariantPrices(
	config: ShopifyConfig,
	productId: string,
	updates: Array<{ variantId: string; price: string }>
): Promise<{ success: boolean; userErrors: UserError[] }> {
	// Lade API-Version aus Config
	const appConfig = getConfig();
	const apiVersion = getApiVersionFromConfig(appConfig);

	const configWithVersion: ShopifyConfig = {
		...config,
		apiVersion,
	};

	return updatePricesBulk(configWithVersion, productId, updates);
}

