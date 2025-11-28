import axios, { AxiosError, AxiosResponse } from "axios";
import type { Product, Variant } from "../../domain/types.js";
import {
  GQL_PRODUCTS,
  GQL_LOCATIONS,
  GQL_VARIANTS_BULK_UPDATE,
  GQL_INVENTORY_SET,
  GQL_SHOP_ACCESS_SCOPES,
} from "./queries.js";
import { WawiError } from "../../domain/errors.js";

/**
 * Shopify GraphQL Admin API Client.
 * 
 * Portiert von Python `gql()` und verwandten Funktionen.
 */

// API-Version wird als Parameter übergeben oder aus Config geladen
// Standard-Version für Fallback
const DEFAULT_API_VERSION = "2025-10";
const DEFAULT_SLEEP_MS = 200;
const MAX_RETRIES = 5;
const BACKOFF_FACTOR = 1.5;

export interface ShopifyConfig {
  shopUrl: string;
  accessToken: string;
  apiVersion?: string; // Optional: API-Version (Standard: "2025-10")
}

/**
 * Erweiterte globalThis-Interface für Debug-Properties.
 */
interface GlobalThisWithShopifyDebug {
  __lastRateLimitInfo?: string;
  __lastRequestCost?: string;
}

export interface RateLimitInfo {
  used: number;
  limit: number;
  remaining: number;
  percentage: number;
}

/**
 * Parst Rate-Limit-Header-String zu RateLimitInfo.
 * 
 * @param rateLimitHeader - Header-String im Format "40/40" (used/limit)
 * @returns RateLimitInfo oder null bei ungültigem Format
 */
export function parseRateLimitHeader(rateLimitHeader: string | undefined): RateLimitInfo | null {
  if (!rateLimitHeader) {
    return null;
  }

  const parts = rateLimitHeader.split("/");
  if (parts.length !== 2) {
    return null;
  }

  const used = parseInt(parts[0], 10);
  const limit = parseInt(parts[1], 10);

  if (isNaN(used) || isNaN(limit) || limit === 0) {
    return null;
  }

  return {
    used,
    limit,
    remaining: limit - used,
    percentage: (used / limit) * 100,
  };
}

/**
 * Ruft die letzte Rate-Limit-Info ab (von der letzten GraphQL-Anfrage).
 * 
 * @returns RateLimitInfo oder null
 */
export function getLastRateLimitInfo(): RateLimitInfo | null {
  const header = (globalThis as GlobalThisWithShopifyDebug).__lastRateLimitInfo;
  return parseRateLimitHeader(header);
}

/**
 * Ruft die letzte Request-Cost ab (von der letzten GraphQL-Anfrage).
 * 
 * @returns Cost als Number oder null
 */
export function getLastRequestCost(): number | null {
  const costHeader = (globalThis as GlobalThisWithShopifyDebug).__lastRequestCost;
  if (!costHeader) {
    return null;
  }

  const cost = parseFloat(costHeader);
  if (isNaN(cost)) {
    return null;
  }

  return cost;
}

/**
 * Cost-Tracking-Info für Monitoring.
 */
export interface CostTrackingInfo {
  lastRequestCost: number | null;
  totalCost?: number; // Optional: Kumulierte Cost (wenn Tracking aktiviert)
}

/**
 * Ruft Cost-Tracking-Info ab.
 * 
 * @returns Cost-Tracking-Info
 */
export function getCostTrackingInfo(): CostTrackingInfo {
  return {
    lastRequestCost: getLastRequestCost(),
  };
}

export interface GraphQLResponse<T = unknown> {
  data?: T;
  errors?: Array<{
    message: string;
    locations?: Array<{ line: number; column: number }>;
    path?: Array<string | number>;
    extensions?: {
      code: string;
      [key: string]: unknown;
    };
  }>;
}

export interface UserError {
  field: string[];
  message: string;
  code?: string;
}

/**
 * Führt GraphQL-Query/Mutation mit Retry-Logik aus.
 * 
 * @param config - Shopify-Konfiguration
 * @param query - GraphQL Query/Mutation String
 * @param variables - GraphQL Variables
 * @returns GraphQL Response Data
 */
async function executeGraphQL<T = unknown>(
  config: ShopifyConfig,
  query: string,
  variables: Record<string, unknown> = {}
): Promise<T> {
  const apiVersion = config.apiVersion || DEFAULT_API_VERSION;
  const url = `${config.shopUrl}/admin/api/${apiVersion}/graphql.json`;
  const headers = {
    "X-Shopify-Access-Token": config.accessToken,
    "Content-Type": "application/json",
  };

  let attempt = 0;

  while (true) {
    try {
      const response: AxiosResponse<GraphQLResponse<T>> = await axios.post(
        url,
        { query, variables },
        { headers }
      );

      const rateLimitHeader = response.headers["x-shopify-shop-api-call-limit"];
      const costHeader = response.headers["x-request-cost"];

      // Rate-Limit-Info für spätere Verwendung speichern (global)
      if (rateLimitHeader) {
        (globalThis as GlobalThisWithShopifyDebug).__lastRateLimitInfo = rateLimitHeader;
      }

      // Cost-Info für spätere Verwendung speichern (global)
      if (costHeader) {
        (globalThis as GlobalThisWithShopifyDebug).__lastRequestCost = costHeader;
      }

      console.debug(
        `GraphQL Response: status=${response.status} | rate=${rateLimitHeader} | cost=${costHeader}`
      );

      // Rate-Limit-Sleep (wie im Python-Skript)
      await new Promise((resolve) => setTimeout(resolve, DEFAULT_SLEEP_MS));

      if (response.status !== 200) {
        const preview = JSON.stringify(response.data).substring(0, 800);
        
        // Konvertiere HTTP-Status zu WawiError
        if (response.status === 401) {
          throw WawiError.shopifyError("SHOPIFY_UNAUTHORIZED", "Authentifizierung fehlgeschlagen", {
            status: response.status,
            preview,
          });
        } else if (response.status === 403) {
          throw WawiError.shopifyError("SHOPIFY_FORBIDDEN", "Zugriff verweigert", {
            status: response.status,
            preview,
          });
        } else if (response.status >= 500 && response.status < 600) {
          throw WawiError.shopifyError("SHOPIFY_SERVER_ERROR", `Server-Fehler: ${response.status}`, {
            status: response.status,
            preview,
          });
        } else {
          throw WawiError.shopifyError("SHOPIFY_SERVER_ERROR", `HTTP ${response.status}`, {
            status: response.status,
            preview,
          });
        }
      }

      const data = response.data;

      if (data.errors) {
        console.error("GraphQL top-level errors:", data.errors);
        
        // Prüfe auf spezifische Fehlercodes
        const firstError = data.errors[0];
        const errorCode = firstError?.extensions?.code;
        
        if (errorCode === "UNAUTHORIZED" || errorCode === "UNAUTHENTICATED") {
          throw WawiError.shopifyError("SHOPIFY_UNAUTHORIZED", firstError.message || "Authentifizierung fehlgeschlagen", {
            errors: data.errors,
          });
        } else if (errorCode === "FORBIDDEN") {
          throw WawiError.shopifyError("SHOPIFY_FORBIDDEN", firstError.message || "Zugriff verweigert", {
            errors: data.errors,
          });
        } else {
          throw WawiError.shopifyError("SHOPIFY_SERVER_ERROR", "GraphQL-Fehler", {
            errors: data.errors,
          });
        }
      }

      if (!data.data) {
        throw WawiError.shopifyError("SHOPIFY_SERVER_ERROR", "GraphQL-Response enthält keine Daten");
      }

      return data.data;
    } catch (error) {
      // Wenn bereits ein WawiError, weiterwerfen
      if (error instanceof WawiError) {
        // Rate-Limit-Fehler können retryt werden
        if (error.code === "SHOPIFY_RATE_LIMIT" || error.code === "SHOPIFY_SERVER_ERROR") {
          if (attempt >= MAX_RETRIES) {
            throw error;
          }

          const axiosError = error.details as { status?: number; retryAfter?: string } | undefined;
          const retryAfter = axiosError?.retryAfter;
          let waitTime: number;

          if (retryAfter) {
            waitTime = Math.max(parseFloat(retryAfter) * 1000, 1000); // in ms
          } else {
            waitTime = 1000 * Math.pow(BACKOFF_FACTOR, attempt); // Exponential Backoff
          }

          console.warn(
            `${error.code} – Retry in ${waitTime / 1000}s (Versuch ${attempt + 1}/${MAX_RETRIES})`
          );

          await new Promise((resolve) => setTimeout(resolve, waitTime));
          attempt++;
          continue;
        }
        
        // Andere Fehler: nicht retryen
        throw error;
      }

      const axiosError = error as AxiosError<GraphQLResponse>;

      // Retry-Logik für 429 (Rate-Limit) und 5xx (Server-Fehler)
      if (
        axiosError.response &&
        (axiosError.response.status === 429 ||
          (axiosError.response.status >= 500 && axiosError.response.status < 600))
      ) {
        if (attempt >= MAX_RETRIES) {
          // Konvertiere zu WawiError
          if (axiosError.response.status === 429) {
            throw WawiError.shopifyError("SHOPIFY_RATE_LIMIT", "Rate-Limit überschritten", {
              status: axiosError.response.status,
              retryAfter: axiosError.response.headers["retry-after"],
            });
          } else {
            throw WawiError.shopifyError("SHOPIFY_SERVER_ERROR", `Server-Fehler: ${axiosError.response.status}`, {
              status: axiosError.response.status,
            });
          }
        }

        const retryAfter = axiosError.response.headers["retry-after"];
        let waitTime: number;

        if (retryAfter) {
          waitTime = Math.max(parseFloat(retryAfter) * 1000, 1000); // in ms
        } else {
          waitTime = 1000 * Math.pow(BACKOFF_FACTOR, attempt); // Exponential Backoff
        }

        console.warn(
          `HTTP ${axiosError.response.status} – Retry in ${waitTime / 1000}s (Versuch ${attempt + 1}/${MAX_RETRIES})`
        );

        await new Promise((resolve) => setTimeout(resolve, waitTime));
        attempt++;
        continue;
      }

      // Netzwerk-Fehler
      if (axiosError.code === "ECONNREFUSED" || axiosError.code === "ETIMEDOUT" || axiosError.code === "ENOTFOUND") {
        throw WawiError.networkError(`Netzwerk-Fehler: ${axiosError.message}`, {
          code: axiosError.code,
          message: axiosError.message,
        });
      }

      // Andere Fehler: zu WawiError konvertieren
      throw WawiError.fromError(error, "SHOPIFY_SERVER_ERROR");
    }
  }
}

/**
 * Ruft alle Produkte mit Cursor-Pagination ab.
 * 
 * @param config - Shopify-Konfiguration
 * @param locationId - Optional: Location-ID für Inventory-Levels
 * @returns Liste von Produkten
 */
export async function getAllProducts(
  config: ShopifyConfig,
  locationId?: string
): Promise<Product[]> {
  const products: Product[] = [];
  let after: string | null = null;
  let page = 0;

  while (true) {
    page++;
    const variables: Record<string, unknown> = { first: 250 };
    if (after) {
      variables.after = after;
    }
    // locationId wird nicht mehr in der Query verwendet, sondern beim Filtern der Ergebnisse

    const data = await executeGraphQL<{
      products: {
        pageInfo: { hasNextPage: boolean; endCursor: string | null };
        edges: Array<{
          node: {
            id: string;
            title: string;
            variants: {
              edges: Array<{
                node: {
                  id: string;
                  sku: string | null;
                  barcode: string | null;
                  price: string;
                  title: string;
                  inventoryItem: {
                    id: string;
                    inventoryLevels: {
                      edges: Array<{
                        node: {
                          quantities: Array<{
                            name: string;
                            quantity: number;
                          }>;
                          location: {
                            id: string;
                          };
                        };
                      }>;
                    };
                  } | null;
                };
              }>;
            };
          };
        }>;
      };
    }>(config, GQL_PRODUCTS, variables);

    const connection = data.products;
    const count = connection.edges.length;

    console.log(
      `[products] Seite ${page}: edges=${count} hasNext=${connection.pageInfo.hasNextPage}`
    );

    for (const edge of connection.edges) {
      const node = edge.node;
      const variants: Variant[] = node.variants.edges.map((vEdge) => {
        const inventoryItem = vEdge.node.inventoryItem;
        const inventoryLevels = inventoryItem?.inventoryLevels?.edges;
        
        // Extrahiere die verfügbare Menge aus quantities
        let currentQuantity: number | undefined = undefined;
        if (inventoryLevels && inventoryLevels.length > 0) {
          // Wenn locationId angegeben ist, filtere nach dieser Location
          const relevantLevel = locationId
            ? inventoryLevels.find(level => level.node.location.id === locationId)
            : inventoryLevels[0];
          
          if (relevantLevel) {
            // Finde die "available" Quantity
            const availableQuantity = relevantLevel.node.quantities.find(
              q => q.name === "available"
            );
            currentQuantity = availableQuantity?.quantity;
          }
        }

        return {
          id: vEdge.node.id,
          productId: node.id,
          sku: vEdge.node.sku,
          barcode: vEdge.node.barcode,
          title: vEdge.node.title,
          price: vEdge.node.price,
          inventoryItemId: inventoryItem?.id || null,
          currentQuantity,
        };
      });

      products.push({
        id: node.id,
        title: node.title,
        variants,
      });
    }

    if (!connection.pageInfo.hasNextPage) {
      break;
    }

    after = connection.pageInfo.endCursor;
  }

  console.log(`Gesamt Produkte geladen: ${products.length}`);
  return products;
}

/**
 * Ruft alle Locations von Shopify ab.
 * 
 * @param config - Shopify-Konfiguration
 * @returns Liste von Locations
 */
export async function getAllLocations(
  config: ShopifyConfig
): Promise<Array<{ id: string; name: string }>> {
  const locations: Array<{ id: string; name: string }> = [];
  let after: string | null = null;
  let page = 0;

  while (true) {
    page++;
    const variables: Record<string, unknown> = { first: 250 };
    if (after) {
      variables.after = after;
    }

    const data = await executeGraphQL<{
      locations: {
        pageInfo: { hasNextPage: boolean; endCursor: string | null };
        edges: Array<{
          node: {
            id: string;
            name: string;
          };
        }>;
      };
    }>(config, GQL_LOCATIONS, variables);

    const connection = data.locations;
    console.log(`[locations] Seite ${page}: edges=${connection.edges.length}`);

    for (const edge of connection.edges) {
      locations.push({
        id: edge.node.id,
        name: edge.node.name,
      });
    }

    if (!connection.pageInfo.hasNextPage) {
      break;
    }

    after = connection.pageInfo.endCursor;
  }

  return locations;
}

/**
 * Ruft Location-ID anhand des Namens ab.
 * 
 * @param config - Shopify-Konfiguration
 * @param locationName - Name der Location
 * @returns Location-ID (GID) oder null
 */
export async function getLocationId(
  config: ShopifyConfig,
  locationName: string
): Promise<string | null> {
  let after: string | null = null;
  let page = 0;

  while (true) {
    page++;
    const variables: Record<string, unknown> = { first: 250 };
    if (after) {
      variables.after = after;
    }

    const data = await executeGraphQL<{
      locations: {
        pageInfo: { hasNextPage: boolean; endCursor: string | null };
        edges: Array<{
          node: {
            id: string;
            name: string;
          };
        }>;
      };
    }>(config, GQL_LOCATIONS, variables);

    const connection = data.locations;
    console.log(`[locations] Seite ${page}: edges=${connection.edges.length}`);

    for (const edge of connection.edges) {
      if (edge.node.name === locationName) {
        return edge.node.id;
      }
    }

    if (!connection.pageInfo.hasNextPage) {
      break;
    }

    after = connection.pageInfo.endCursor;
  }

  // Location nicht gefunden - werfe Fehler
  throw WawiError.shopifyError("SHOPIFY_LOCATION_NOT_FOUND", `Location '${locationName}' nicht gefunden`, {
    locationName,
  });
}

/**
 * Ruft die Access-Scopes des aktuellen Tokens ab.
 * 
 * @param config - Shopify-Konfiguration
 * @returns Liste von Scope-Handles (z.B. ["read_products", "write_products"])
 */
export async function getAccessScopes(
  config: ShopifyConfig
): Promise<string[]> {
  try {
    const data = await executeGraphQL<{
      shop: {
        accessScopes: Array<{
          handle: string;
        }>;
      };
    }>(config, GQL_SHOP_ACCESS_SCOPES);

    return data.shop.accessScopes.map((scope) => scope.handle);
  } catch (error) {
    // Wenn die Query fehlschlägt (z.B. weil der Scope nicht verfügbar ist),
    // werfen wir einen Fehler
    if (error instanceof WawiError) {
      throw error;
    }
    throw WawiError.shopifyError(
      "SHOPIFY_INSUFFICIENT_SCOPES",
      "Konnte Access-Scopes nicht abrufen",
      { originalError: error instanceof Error ? error.message : String(error) }
    );
  }
}

/**
 * Aktualisiert Preise für Varianten (Bulk-Update pro Produkt).
 * 
 * @param config - Shopify-Konfiguration
 * @param productId - Product GID
 * @param updates - Liste von (variantId, price)-Paaren
 * @returns true bei Erfolg, false bei Fehler
 */
export async function updatePricesBulk(
  config: ShopifyConfig,
  productId: string,
  updates: Array<{ variantId: string; price: string }>
): Promise<{ success: boolean; userErrors: UserError[] }> {
  const variants = updates.map(({ variantId, price }) => ({
    id: variantId,
    price,
  }));

  const data = await executeGraphQL<{
    productVariantsBulkUpdate: {
      productVariants: Array<{ id: string }>;
      userErrors: UserError[];
    };
  }>(config, GQL_VARIANTS_BULK_UPDATE, {
    productId,
    variants,
  });

  const result = data.productVariantsBulkUpdate;

  if (result.userErrors.length > 0) {
    console.error("UserErrors bei Preis-Update:", result.userErrors);
    return { success: false, userErrors: result.userErrors };
  }

  return { success: true, userErrors: [] };
}

/**
 * Setzt Inventory-Mengen für eine Location.
 * 
 * @param config - Shopify-Konfiguration
 * @param locationId - Location GID
 * @param updates - Liste von (inventoryItemId, quantity)-Paaren
 * @returns true bei Erfolg, false bei Fehler
 */
export async function setInventory(
  config: ShopifyConfig,
  locationId: string,
  updates: Array<{ inventoryItemId: string; quantity: number }>
): Promise<{ success: boolean; userErrors: UserError[] }> {
  const data = await executeGraphQL<{
    inventorySetQuantities: {
      inventoryAdjustmentGroup: {
        createdAt: string;
        reason: string;
        referenceDocumentUri: string | null;
        changes: Array<{
          name: string;
          delta: number;
          quantityAfterChange: number;
        }>;
      } | null;
      userErrors: UserError[];
    };
  }>(config, GQL_INVENTORY_SET, {
    input: {
      name: "available", // 'available' oder 'on_hand'
      reason: "correction",
      ignoreCompareQuantity: true, // CAS aus -> direkt absolut setzen
      quantities: updates.map(({ inventoryItemId, quantity }) => ({ // <<< WICHTIG: 'quantities', nicht 'setQuantities'
        inventoryItemId,
        locationId,
        quantity,
      })),
    },
  });

  const result = data.inventorySetQuantities;

  if (result.userErrors.length > 0) {
    console.error("UserErrors bei Inventory-Update:", result.userErrors);
    return { success: false, userErrors: result.userErrors };
  }

  return { success: true, userErrors: [] };
}

