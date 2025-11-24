import Store from "electron-store";
import type { ShopConfig, AppConfig, ColumnMapping } from "../types/ipc";

/**
 * Config Service für Persistierung von App-Einstellungen.
 * 
 * Nutzt electron-store für sichere Speicherung (verschlüsselt).
 */
import { SHOPIFY_API_VERSION } from "./api-version-manager";

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
 * Lädt die gesamte App-Konfiguration.
 */
export function getConfig(): AppConfig {
  return store.store as AppConfig;
}

/**
 * Speichert die gesamte App-Konfiguration.
 */
export function setConfig(config: AppConfig): void {
  Object.assign(store.store, config);
}

/**
 * Lädt die Shop-Konfiguration.
 */
export function getShopConfig(): ShopConfig | null {
  return (store.get("shop") as ShopConfig | null) ?? null;
}

/**
 * Speichert die Shop-Konfiguration.
 */
export function setShopConfig(shopConfig: ShopConfig | null): void {
  store.set("shop", shopConfig);
}

/**
 * Lädt das Standard-Spalten-Mapping.
 */
export function getDefaultColumnMapping(): ColumnMapping | null {
  return (store.get("defaultColumnMapping") as ColumnMapping | null) ?? null;
}

/**
 * Speichert das Standard-Spalten-Mapping.
 */
export function setDefaultColumnMapping(mapping: ColumnMapping | null): void {
  store.set("defaultColumnMapping", mapping);
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
 * Validiert eine Shop-Konfiguration.
 * 
 * @param config - Shop-Konfiguration zum Validieren
 * @returns Validierungs-Ergebnis
 */
export function validateShopConfig(config: ShopConfig): {
  valid: boolean;
  errors: string[];
} {
  const errors: string[] = [];

  if (!validateShopUrl(config.shopUrl)) {
    errors.push("Shop-URL muss auf .myshopify.com enden");
  }

  if (!validateAccessToken(config.accessToken)) {
    errors.push("Access-Token muss mit 'shpat_' oder 'shpca_' beginnen");
  }

  if (!config.locationId || !config.locationName) {
    errors.push("Location-ID und Name müssen angegeben werden");
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}

