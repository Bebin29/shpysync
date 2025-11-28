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
    defaultCsvPath: undefined,
    defaultDbfPath: undefined,
    update: {
      autoCheckEnabled: true,
      autoCheckInterval: 24, // Standard: 24 Stunden
    },
  },
  encryptionKey: "wawisync-config-key", // TODO: In Produktion aus sicherer Quelle laden
});

/**
 * Type Guard: Prüft, ob ein Wert ein Objekt ist.
 */
function isObject(value: unknown): value is Record<string, unknown> {
	return typeof value === "object" && value !== null && !Array.isArray(value);
}

/**
 * Type Guard: Prüft, ob ein Wert ein ColumnMapping ist.
 */
function isColumnMapping(value: unknown): value is ColumnMapping {
	if (!isObject(value)) {
		return false;
	}
	return (
		typeof value.sku === "string" &&
		typeof value.name === "string" &&
		typeof value.price === "string" &&
		typeof value.stock === "string"
	);
}

/**
 * Migriert alte Config-Struktur (mit accessToken) zu neuer Struktur (mit accessTokenRef).
 * 
 * @param config - Alte Config-Struktur
 * @returns Migrierte Config oder null bei Fehler
 */
function migrateOldConfig(config: unknown): AppConfig | null {
	// Prüfe, ob config ein Objekt ist
	if (!isObject(config)) {
		return null;
	}

	// Erstelle eine vollständige AppConfig-Struktur
	const appConfig: AppConfig = {
		shop: null,
		defaultColumnMapping: null,
		apiVersion: typeof config.apiVersion === "string" ? config.apiVersion : SHOPIFY_API_VERSION,
		autoSync: isObject(config.autoSync) ? (config.autoSync as AppConfig["autoSync"]) : { enabled: false },
		defaultCsvPath: typeof config.defaultCsvPath === "string" ? config.defaultCsvPath : undefined,
		defaultDbfPath: typeof config.defaultDbfPath === "string" ? config.defaultDbfPath : undefined,
		update: isObject(config.update)
			? (config.update as AppConfig["update"])
			: {
					autoCheckEnabled: true,
					autoCheckInterval: 24,
				},
	};

	// Prüfe, ob shop vorhanden ist
	if (config.shop && isObject(config.shop)) {
		const shop = config.shop as Record<string, unknown>;
		
		// Prüfe ob alte Struktur (mit accessToken direkt)
		if (typeof shop.accessToken === "string" && !shop.accessTokenRef) {
			console.log("Migriere alte Config-Struktur (accessToken → accessTokenRef)");
			
			try {
				// Token in Token-Store verschieben
				const tokenRef = storeToken(shop.accessToken);
				
				// Neue Struktur erstellen
				appConfig.shop = {
					shopUrl: typeof shop.shopUrl === "string" ? shop.shopUrl : "",
					accessTokenRef: tokenRef,
					locationId: typeof shop.locationId === "string" ? shop.locationId : "",
					locationName: typeof shop.locationName === "string" ? shop.locationName : "",
				};
				
				// Migrierte Config speichern
				(store as unknown as { set: (key: string, value: unknown) => void }).set("shop", appConfig.shop);
				(store as unknown as { set: (key: string, value: unknown) => void }).set("defaultColumnMapping", appConfig.defaultColumnMapping);
				if (appConfig.apiVersion) {
					(store as unknown as { set: (key: string, value: unknown) => void }).set("apiVersion", appConfig.apiVersion);
				}
				(store as unknown as { set: (key: string, value: unknown) => void }).set("autoSync", appConfig.autoSync);
				
				return appConfig;
			} catch (error) {
				console.error("Fehler bei Config-Migration:", error);
				return null;
			}
		} else if (typeof shop.shopUrl === "string" && typeof shop.accessTokenRef === "string") {
			// Neue Struktur (mit accessTokenRef)
			appConfig.shop = {
				shopUrl: shop.shopUrl,
				accessTokenRef: shop.accessTokenRef,
				locationId: typeof shop.locationId === "string" ? shop.locationId : "",
				locationName: typeof shop.locationName === "string" ? shop.locationName : "",
			};
		}
	}

	// DefaultColumnMapping setzen
	if (isColumnMapping(config.defaultColumnMapping)) {
		appConfig.defaultColumnMapping = config.defaultColumnMapping;
	} else if (config.defaultColumnMapping === null) {
		appConfig.defaultColumnMapping = null;
	}

	return appConfig;
}

/**
 * Lädt die gesamte App-Konfiguration.
 * Validiert gegen Zod-Schema und migriert alte Strukturen.
 */
export function getConfig(): AppConfig {
	// Lade alle Config-Werte
	const storeTyped = store as unknown as { get: (key: string) => unknown };
	const config: unknown = {
		shop: storeTyped.get("shop"),
		defaultColumnMapping: storeTyped.get("defaultColumnMapping"),
		apiVersion: storeTyped.get("apiVersion"),
		autoSync: storeTyped.get("autoSync"),
		defaultCsvPath: storeTyped.get("defaultCsvPath"),
		defaultDbfPath: storeTyped.get("defaultDbfPath"),
		update: storeTyped.get("update"),
	};
	
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
			defaultCsvPath: undefined,
			defaultDbfPath: undefined,
			update: {
				autoCheckEnabled: true,
				autoCheckInterval: 24,
			},
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
	
	const storeTyped = store as unknown as { 
		set: (key: string, value: unknown) => void;
		delete: (key: string) => void;
	};
	storeTyped.set("shop", result.data.shop);
	storeTyped.set("defaultColumnMapping", result.data.defaultColumnMapping);
	if (result.data.apiVersion) {
		storeTyped.set("apiVersion", result.data.apiVersion);
	} else {
		storeTyped.delete("apiVersion");
	}
	storeTyped.set("autoSync", result.data.autoSync);
	// Standard-Pfade speichern oder löschen
	if (result.data.defaultCsvPath) {
		storeTyped.set("defaultCsvPath", result.data.defaultCsvPath);
	} else {
		storeTyped.delete("defaultCsvPath");
	}
	if (result.data.defaultDbfPath) {
		storeTyped.set("defaultDbfPath", result.data.defaultDbfPath);
	} else {
		storeTyped.delete("defaultDbfPath");
	}
}

/**
 * Lädt die Shop-Konfiguration mit Access-Token.
 * Lädt Token aus Token-Store basierend auf accessTokenRef.
 * 
 * @returns ShopConfig mit accessToken oder null
 */
export function getShopConfig(): ShopConfig | null {
	const stored = (store as unknown as { get: (key: string) => unknown }).get("shop") as ShopConfigStored | null;
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
		const stored = (store as unknown as { get: (key: string) => unknown }).get("shop") as ShopConfigStored | null;
		if (stored?.accessTokenRef) {
			deleteToken(stored.accessTokenRef);
		}
		(store as unknown as { set: (key: string, value: unknown) => void }).set("shop", null);
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
	const existing = (store as unknown as { get: (key: string) => unknown }).get("shop") as ShopConfigStored | null;
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

	(store as unknown as { set: (key: string, value: unknown) => void }).set("shop", stored);
}

/**
 * Lädt das Standard-Spalten-Mapping.
 */
export function getDefaultColumnMapping(): ColumnMapping | null {
  return ((store as unknown as { get: (key: string) => unknown }).get("defaultColumnMapping") as ColumnMapping | null) ?? null;
}

/**
 * Speichert das Standard-Spalten-Mapping.
 */
export function setDefaultColumnMapping(mapping: ColumnMapping | null): void {
  (store as unknown as { set: (key: string, value: unknown) => void }).set("defaultColumnMapping", mapping);
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
	// Validierung: Entweder CSV- oder DBF-Pfad muss existieren wenn enabled
	if (autoSyncConfig.enabled) {
		if (!autoSyncConfig.csvPath && !autoSyncConfig.dbfPath) {
			throw new Error("CSV- oder DBF-Pfad ist erforderlich wenn Auto-Sync aktiviert ist");
		}

		if (!autoSyncConfig.interval || autoSyncConfig.interval <= 0) {
			throw new Error("Intervall muss größer als 0 sein");
		}

		// Prüfe ob Datei existiert
		const { existsSync } = require("fs");
		const filePath = autoSyncConfig.dbfPath || autoSyncConfig.csvPath;
		if (filePath && !existsSync(filePath)) {
			const fileType = autoSyncConfig.dbfPath ? "DBF" : "CSV";
			throw new Error(`${fileType}-Datei nicht gefunden: ${filePath}`);
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
 * Setzt den Standard-CSV-Pfad für manuelle Sync.
 * 
 * @param csvPath - Pfad zur CSV-Datei (optional, null zum Löschen)
 */
export function setDefaultCsvPath(csvPath: string | null): void {
	const storeTyped = store as unknown as { 
		set: (key: string, value: unknown) => void;
		delete: (key: string) => void;
	};
	if (csvPath) {
		storeTyped.set("defaultCsvPath", csvPath);
	} else {
		storeTyped.delete("defaultCsvPath");
	}
}

/**
 * Setzt den Standard-DBF-Pfad für manuelle Sync.
 * 
 * @param dbfPath - Pfad zur DBF-Datei (optional, null zum Löschen)
 */
export function setDefaultDbfPath(dbfPath: string | null): void {
	const storeTyped = store as unknown as { 
		set: (key: string, value: unknown) => void;
		delete: (key: string) => void;
	};
	if (dbfPath) {
		storeTyped.set("defaultDbfPath", dbfPath);
	} else {
		storeTyped.delete("defaultDbfPath");
	}
}

/**
 * Gibt den Standard-Dateipfad zurück (DBF wird bevorzugt, falls gesetzt).
 * 
 * @returns Dateipfad oder null, wenn keiner gesetzt ist
 */
export function getDefaultFilePath(): string | null {
	const config = getConfig();
	// DBF wird bevorzugt, wenn gesetzt
	if (config.defaultDbfPath) {
		return config.defaultDbfPath;
	}
	return config.defaultCsvPath || null;
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

/**
 * Lädt die Update-Konfiguration.
 * 
 * @returns Update-Konfiguration
 */
export function getUpdateConfig(): AppConfig["update"] {
	const config = getConfig();
	return config.update;
}

/**
 * Speichert die Update-Konfiguration.
 * 
 * @param updateConfig - Update-Konfiguration
 * @throws Error wenn Konfiguration ungültig ist
 */
export function setUpdateConfig(updateConfig: AppConfig["update"]): void {
	// Validierung
	if (updateConfig.autoCheckInterval <= 0) {
		throw new Error("Update-Prüfungs-Intervall muss größer als 0 sein");
	}

	// Speichere Config
	const currentConfig = getConfig();
	const updatedConfig: AppConfig = {
		...currentConfig,
		update: updateConfig,
	};
	setConfig(updatedConfig);
}

