/**
 * API-Version-Manager für Shopify GraphQL Admin API.
 * 
 * Zentrale Verwaltung der API-Version mit optionaler Kompatibilitätsprüfung.
 * 
 * Best Practice: API-Version in Config speichern, um einfache Updates ohne Code-Änderungen zu ermöglichen.
 */

export const SHOPIFY_API_VERSION = "2025-10";

/**
 * API-Version-Info.
 */
export interface ApiVersionInfo {
  current: string;
  latest?: string;
  isDeprecated: boolean;
  deprecationDate?: string;
  supportedVersions?: string[];
}

/**
 * Prüft die Kompatibilität der aktuellen API-Version.
 * 
 * Hinweis: Shopify veröffentlicht alle 3 Monate neue API-Versionen.
 * Alte Versionen werden nach 1 Jahr deprecated.
 * 
 * @param shopUrl - Shop-URL
 * @param accessToken - Access-Token
 * @returns API-Version-Info
 */
export async function checkApiVersionCompatibility(
  shopUrl: string,
  accessToken: string
): Promise<ApiVersionInfo> {
  // Aktuell: Statische Rückgabe, da Shopify keine öffentliche API für Version-Check bietet
  // In Zukunft könnte man:
  // 1. Shopify Admin API Versions-Endpoint nutzen (falls verfügbar)
  // 2. GraphQL Schema Introspection nutzen
  // 3. Deprecation-Warnungen aus GraphQL Responses extrahieren
  
  return {
    current: SHOPIFY_API_VERSION,
    isDeprecated: false,
  };
}

/**
 * Lädt die API-Version aus der Konfiguration.
 * Falls nicht vorhanden, wird die Standard-Version zurückgegeben.
 * 
 * @param config - App-Konfiguration
 * @returns API-Version
 */
export function getApiVersionFromConfig(config?: { apiVersion?: string }): string {
  return config?.apiVersion || SHOPIFY_API_VERSION;
}

/**
 * Validiert eine API-Version.
 * 
 * @param version - API-Version im Format "YYYY-MM"
 * @returns true wenn Format gültig
 */
export function validateApiVersion(version: string): boolean {
  // Format: YYYY-MM (z.B. "2025-10")
  const pattern = /^\d{4}-\d{2}$/;
  if (!pattern.test(version)) {
    return false;
  }

  const [year, month] = version.split("-").map(Number);
  
  // Validiere Jahr (sinnvolle Range)
  if (year < 2020 || year > 2100) {
    return false;
  }
  
  // Validiere Monat
  if (month < 1 || month > 12) {
    return false;
  }

  return true;
}

/**
 * Vergleicht zwei API-Versionen.
 * 
 * @param version1 - Erste Version
 * @param version2 - Zweite Version
 * @returns -1 wenn version1 < version2, 0 wenn gleich, 1 wenn version1 > version2
 */
export function compareApiVersions(version1: string, version2: string): number {
  const [year1, month1] = version1.split("-").map(Number);
  const [year2, month2] = version2.split("-").map(Number);

  if (year1 !== year2) {
    return year1 - year2;
  }

  return month1 - month2;
}

/**
 * Prüft, ob eine API-Version neuer ist als eine andere.
 * 
 * @param version - Zu prüfende Version
 * @param compareTo - Vergleichsversion
 * @returns true wenn version neuer ist
 */
export function isApiVersionNewer(version: string, compareTo: string): boolean {
  return compareApiVersions(version, compareTo) > 0;
}

