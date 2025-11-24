import type { ShopifyConfig } from "../../core/infra/shopify/client";
import {
  getAllProducts,
  getAllLocations,
  getLocationId,
  getLastRateLimitInfo,
} from "../../core/infra/shopify/client";
import type { Product } from "../../core/domain/types";
import { getApiVersionFromConfig } from "./api-version-manager";
import { getConfig } from "./config-service";

/**
 * Shopify Service für Electron Main Process.
 * 
 * Wrapper um den Core Shopify Client mit Electron-spezifischen Anpassungen.
 */

/**
 * Testet die Verbindung zu Shopify.
 * 
 * @param config - Shopify-Konfiguration
 * @returns Verbindungstest-Ergebnis
 */
export async function testConnection(
  config: ShopifyConfig
): Promise<{
  success: boolean;
  message: string;
  rateLimitInfo?: {
    used: number;
    limit: number;
    remaining: number;
    percentage: number;
  };
}> {
  try {
    // Lade API-Version aus Config
    const appConfig = getConfig();
    const apiVersion = getApiVersionFromConfig(appConfig);
    
    // Ergänze API-Version in Config
    const configWithVersion: ShopifyConfig = {
      ...config,
      apiVersion,
    };

    // Versuche, Locations abzurufen (leichter als alle Produkte)
    const locations = await getAllLocations(configWithVersion);

    // Rate-Limit-Info aus der letzten Anfrage abrufen
    const rateLimitInfo = getLastRateLimitInfo();

    return {
      success: true,
      message: `Verbindung erfolgreich (${locations.length} Location(s) gefunden)`,
      rateLimitInfo: rateLimitInfo
        ? {
            used: rateLimitInfo.used,
            limit: rateLimitInfo.limit,
            remaining: rateLimitInfo.remaining,
            percentage: rateLimitInfo.percentage,
          }
        : undefined,
    };
  } catch (error) {
    const errorMessage =
      error instanceof Error ? error.message : "Unbekannter Fehler";

    // Spezifische Fehlermeldungen
    if (errorMessage.includes("401") || errorMessage.includes("Unauthorized")) {
      return {
        success: false,
        message: "Access-Token ungültig oder abgelaufen",
      };
    }

    if (errorMessage.includes("403") || errorMessage.includes("Forbidden")) {
      return {
        success: false,
        message: "Zugriff verweigert. Prüfe die API-Scopes des Tokens",
      };
    }

    if (errorMessage.includes("404")) {
      return {
        success: false,
        message: "Shop-URL nicht gefunden",
      };
    }

    return {
      success: false,
      message: `Verbindungsfehler: ${errorMessage}`,
    };
  }
}

/**
 * Ruft alle Locations von Shopify ab.
 * 
 * @param config - Shopify-Konfiguration
 * @returns Liste von Locations
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
 * Ruft alle Produkte von Shopify ab.
 * 
 * @param config - Shopify-Konfiguration
 * @returns Liste von Produkten
 */
export async function fetchProducts(config: ShopifyConfig): Promise<Product[]> {
  // Lade API-Version aus Config
  const appConfig = getConfig();
  const apiVersion = getApiVersionFromConfig(appConfig);
  
  const configWithVersion: ShopifyConfig = {
    ...config,
    apiVersion,
  };
  
  return getAllProducts(configWithVersion);
}

