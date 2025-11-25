import type { ShopifyConfig } from "../../core/infra/shopify/client.js";
import { getAllLocations, setInventory } from "../../core/infra/shopify/client.js";
import type { UserError } from "../../core/infra/shopify/client.js";
import { getApiVersionFromConfig } from "./api-version-manager.js";
import { getConfig } from "./config-service.js";

/**
 * Shopify Inventory Service für Electron Main Process.
 * 
 * Domain-Service für Inventory-bezogene Operationen.
 * Kapselt die Low-Level Client-Funktionen mit Electron-spezifischen Anpassungen.
 */

/**
 * Ruft alle Locations von Shopify ab.
 * 
 * @param config - Shopify-Konfiguration (ohne API-Version, wird aus Config geladen)
 * @returns Liste von Locations mit id und name
 */
export async function getLocations(
	config: ShopifyConfig
): Promise<Array<{ id: string; name: string }>> {
	// Lade API-Version aus Config
	const appConfig = getConfig();
	const apiVersion = getApiVersionFromConfig(appConfig);

	const configWithVersion: ShopifyConfig = {
		...config,
		apiVersion,
	};

	return getAllLocations(configWithVersion);
}

/**
 * Setzt Inventory-Mengen für eine Location.
 * 
 * Unterstützt Batches von bis zu 250 Updates pro Call.
 * 
 * @param config - Shopify-Konfiguration (ohne API-Version, wird aus Config geladen)
 * @param locationId - Location GID
 * @param updates - Liste von (inventoryItemId, quantity)-Paaren (max 250 pro Batch)
 * @returns Erfolg-Status und UserErrors
 */
export async function setInventoryQuantities(
	config: ShopifyConfig,
	locationId: string,
	updates: Array<{ inventoryItemId: string; quantity: number }>
): Promise<{ success: boolean; userErrors: UserError[] }> {
	// Lade API-Version aus Config
	const appConfig = getConfig();
	const apiVersion = getApiVersionFromConfig(appConfig);

	const configWithVersion: ShopifyConfig = {
		...config,
		apiVersion,
	};

	return setInventory(configWithVersion, locationId, updates);
}

