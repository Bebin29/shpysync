import Store from "electron-store";
import type { ShopConfig, ShopConfigStored, AppConfig, ColumnMapping } from "../types/ipc.js";
import { storeToken, loadToken, updateToken, deleteToken, tokenExists } from "./token-store.js";
import { appConfigSchema, shopConfigStoredSchema, shopConfigSchema } from "../lib/validators.js";
import { SHOPIFY_API_VERSION } from "./api-version-manager.js";
import { WawiError } from "../../core/domain/errors.js";
import { validateShopConfig as validateShopConfigCore } from "../../core/domain/validators.js";

/**
 * Config Service für Persistierung von App-Einstellungen.
 * 
 * Nutzt electron-store für sichere Speicherung (verschlüsselt).
 * Tokens werden separat im Token-Store gespeichert.
 */

const store = new Store<AppConfig>({
  name: "config",
  defaults: {
    shop: null,
    defaultColumnMapping: null,
    apiVersion: SHOPIFY_API_VERSION,
    autoSync: {
      enabled: false,
    },
  },
  encryptionKey: "wawisync-config-key", // TODO: In Produktion aus sicherer Quelle laden
});

/**
 * Migriert alte Config-Struktur (mit accessToken) zu neuer Struktur (mit accessTokenRef).
 * 
 * @param config - Alte Config-Struktur
 * @returns Migrierte Config oder null bei Fehler
 */
function migrateOldConfig(config: any): AppConfig | null {
	if (!config.shop) {
		return config as AppConfig;
	}

	// Prüfe ob alte Struktur (mit accessToken direkt)
	const shop = config.shop;
	if (shop.accessToken && !shop.accessTokenRef) {
		console.log("Migriere alte Config-Struktur (accessToken → accessTokenRef)");
		
		try {
			// Token in Token-Store verschieben
			const tokenRef = storeToken(shop.accessToken);
			
			// Neue Struktur erstellen
			const migrated: AppConfig = {
				...config,
				shop: {
					shopUrl: shop.shopUrl,
					accessTokenRef: tokenRef,
					locationId: shop.locationId,
					locationName: shop.locationName,
				},
			};
			
			// Migrierte Config speichern
			for (const [key, value] of Object.entries(migrated)) {
				(store as any).set(key, value);
			}
			
			return migrated;
		} catch (error) {
			console.error("Fehler bei Config-Migration:", error);
			return null;
		}
	}

	return config as AppConfig;
}

/**
 * Lädt die gesamte App-Konfiguration.
 * Validiert gegen Zod-Schema und migriert alte Strukturen.
 */
export function getConfig(): AppConfig {
	const config = (store as any).store as any;
	
	// Migration von alter Struktur
	const migrated = migrateOldConfig(config);
	const configToValidate = migrated || config;
	
	// Validierung gegen Zod-Schema
	const result = appConfigSchema.safeParse(configToValidate);
	if (!result.success) {
		console.error("Config-Validierungsfehler:", result.error);
		// Fallback auf Defaults bei ungültiger Config
		return {
			shop: null,
			defaultColumnMapping: null,
			apiVersion: SHOPIFY_API_VERSION,
			autoSync: { enabled: false },
		};
	}
	
	return result.data;
}

/**
 * Speichert die gesamte App-Konfiguration.
 * Validiert gegen Zod-Schema.
 */
export function setConfig(config: AppConfig): void {
	// Validierung gegen Zod-Schema
	const result = appConfigSchema.safeParse(config);
	if (!result.success) {
		throw new Error(`Ungültige Config: ${result.error.message}`);
	}
	
	for (const [key, value] of Object.entries(result.data)) {
		(store as any).set(key, value);
	}
}

/**
 * Lädt die Shop-Konfiguration mit Access-Token.
 * Lädt Token aus Token-Store basierend auf accessTokenRef.
 * 
 * @returns ShopConfig mit accessToken oder null
 */
export function getShopConfig(): ShopConfig | null {
	const stored = (store as any).get("shop") as ShopConfigStored | null;
	if (!stored) {
		return null;
	}

	// Validierung gegen Zod-Schema
	const validationResult = shopConfigStoredSchema.safeParse(stored);
	if (!validationResult.success) {
		console.error("Shop-Config-Validierungsfehler:", validationResult.error);
		return null;
	}

	// Token aus Token-Store laden
	const token = loadToken(stored.accessTokenRef);
	if (!token) {
		console.error(`Token nicht gefunden für Referenz: ${stored.accessTokenRef}`);
		return null;
	}

	// ShopConfig mit Token zurückgeben
	return {
		shopUrl: stored.shopUrl,
		accessToken: token,
		locationId: stored.locationId,
		locationName: stored.locationName,
	};
}

/**
 * Speichert die Shop-Konfiguration.
 * Speichert Token im Token-Store und erstellt/aktualisiert accessTokenRef.
 * 
 * @param shopConfig - ShopConfig mit accessToken (wird in Token-Store verschoben)
 */
export function setShopConfig(shopConfig: ShopConfig | null): void {
	if (!shopConfig) {
		// Beim Löschen: Token auch löschen falls vorhanden
		const stored = (store as any).get("shop") as ShopConfigStored | null;
		if (stored?.accessTokenRef) {
			deleteToken(stored.accessTokenRef);
		}
		(store as any).set("shop", null);
		return;
	}

	// Validierung gegen Zod-Schema
	const validationResult = shopConfigSchema.safeParse(shopConfig);
	if (!validationResult.success) {
		const errors = validationResult.error.errors.map((err) => {
			const path = err.path.join(".");
			return `${path}: ${err.message}`;
		});
		throw WawiError.configError("CONFIG_INVALID", `Ungültige Shop-Config: ${errors.join(", ")}`, {
			errors,
		});
	}

	// Zusätzliche Validierung mit Core-Validatoren (nicht-strikt für Token-Format)
	try {
		validateShopConfigCore(shopConfig, false); // false = nicht-strikt für Token-Format
	} catch (error) {
		if (error instanceof WawiError) {
			throw error;
		}
		throw WawiError.configError("CONFIG_INVALID", `Validierungsfehler: ${error instanceof Error ? error.message : String(error)}`);
	}

	// Prüfe ob bereits eine Config existiert
	const existing = (store as any).get("shop") as ShopConfigStored | null;
	let tokenRef: string;

	if (existing?.accessTokenRef && tokenExists(existing.accessTokenRef)) {
		// Token aktualisieren
		tokenRef = existing.accessTokenRef;
		updateToken(tokenRef, shopConfig.accessToken);
	} else {
		// Neuen Token speichern
		tokenRef = storeToken(shopConfig.accessToken);
	}

	// ShopConfigStored speichern (ohne Token)
	const stored: ShopConfigStored = {
		shopUrl: shopConfig.shopUrl,
		accessTokenRef: tokenRef,
		locationId: shopConfig.locationId,
		locationName: shopConfig.locationName,
	};

	(store as any).set("shop", stored);
}

/**
 * Lädt das Standard-Spalten-Mapping.
 */
export function getDefaultColumnMapping(): ColumnMapping | null {
  return ((store as any).get("defaultColumnMapping") as ColumnMapping | null) ?? null;
}

/**
 * Speichert das Standard-Spalten-Mapping.
 */
export function setDefaultColumnMapping(mapping: ColumnMapping | null): void {
  (store as any).set("defaultColumnMapping", mapping);
}

/**
 * Validiert eine Shop-URL.
 * 
 * @param url - Shop-URL zum Validieren
 * @returns true wenn gültig
 */
export function validateShopUrl(url: string): boolean {
  try {
    // Ergänze https:// falls fehlt
    let normalizedUrl = url.trim();
    if (!normalizedUrl.startsWith("http://") && !normalizedUrl.startsWith("https://")) {
      normalizedUrl = `https://${normalizedUrl}`;
    }
    const urlObj = new URL(normalizedUrl);
    return urlObj.hostname.endsWith(".myshopify.com");
  } catch {
    return false;
  }
}

/**
 * Normalisiert eine Shop-URL (ergänzt https:// falls fehlt).
 * 
 * @param url - Shop-URL zum Normalisieren
 * @returns Normalisierte URL
 */
export function normalizeShopUrl(url: string): string {
  let normalizedUrl = url.trim();
  if (!normalizedUrl.startsWith("http://") && !normalizedUrl.startsWith("https://")) {
    normalizedUrl = `https://${normalizedUrl}`;
  }
  return normalizedUrl;
}

/**
 * Validiert einen Access-Token.
 * 
 * @param token - Access-Token zum Validieren
 * @returns true wenn Format gültig
 */
export function validateAccessToken(token: string): boolean {
  // Shopify Access-Token beginnen mit "shpat_" (Private App) oder "shpca_" (Custom App)
  return token.startsWith("shpat_") || token.startsWith("shpca_");
}

/**
 * Lädt die Auto-Sync-Konfiguration.
 * 
 * @returns Auto-Sync-Konfiguration
 */
export function getAutoSyncConfig(): AppConfig["autoSync"] {
	const config = getConfig();
	return config.autoSync;
}

/**
 * Speichert die Auto-Sync-Konfiguration.
 * Validiert CSV-Pfad falls vorhanden.
 * 
 * @param autoSyncConfig - Auto-Sync-Konfiguration
 * @throws Error wenn CSV-Pfad ungültig ist
 */
export function setAutoSyncConfig(autoSyncConfig: AppConfig["autoSync"]): void {
	// Validierung: CSV-Pfad muss existieren wenn enabled
	if (autoSyncConfig.enabled) {
		if (!autoSyncConfig.csvPath) {
			throw new Error("CSV-Pfad ist erforderlich wenn Auto-Sync aktiviert ist");
		}

		if (!autoSyncConfig.interval || autoSyncConfig.interval <= 0) {
			throw new Error("Intervall muss größer als 0 sein");
		}

		// Prüfe ob CSV-Datei existiert
		const { existsSync } = require("fs");
		if (!existsSync(autoSyncConfig.csvPath)) {
			throw new Error(`CSV-Datei nicht gefunden: ${autoSyncConfig.csvPath}`);
		}
	}

	// Speichere Config
	const currentConfig = getConfig();
	const updatedConfig: AppConfig = {
		...currentConfig,
		autoSync: autoSyncConfig,
	};
	setConfig(updatedConfig);
}

/**
 * Validiert eine Shop-Konfiguration (mit Zod).
 * 
 * @param config - Shop-Konfiguration zum Validieren
 * @returns Validierungs-Ergebnis
 */
export function validateShopConfig(config: ShopConfig): {
	valid: boolean;
	errors: string[];
} {
	try {
		// Zod-Validierung
		const result = shopConfigSchema.safeParse(config);
		
		if (!result.success) {
			const errors = result.error.errors.map((err) => {
				const path = err.path.join(".");
				return `${path}: ${err.message}`;
			});
			return {
				valid: false,
				errors,
			};
		}

		// Core-Validierung (nicht-strikt für Token-Format, da API-Verbindung der beste Test ist)
		validateShopConfigCore(config, false); // false = nicht-strikt für Token-Format
		
		return { valid: true, errors: [] };
	} catch (error) {
		if (error instanceof WawiError) {
			return {
				valid: false,
				errors: [error.getUserMessage()],
			};
		}
		return {
			valid: false,
			errors: [error instanceof Error ? error.message : String(error)],
		};
	}
}

