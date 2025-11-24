import axios, { AxiosError, AxiosResponse } from "axios";
import type { Product, Variant } from "../../domain/types";
import {
  GQL_PRODUCTS,
  GQL_LOCATIONS,
  GQL_VARIANTS_BULK_UPDATE,
  GQL_INVENTORY_SET,
} from "./queries";

/**
 * Shopify GraphQL Admin API Client.
 * 
 * Portiert von Python `gql()` und verwandten Funktionen.
 */

const API_VERSION = "2025-10"; // TODO: Bei Implementierung neueste Version prüfen
const DEFAULT_SLEEP_MS = 200;
const MAX_RETRIES = 5;
const BACKOFF_FACTOR = 1.5;

export interface ShopifyConfig {
  shopUrl: string;
  accessToken: string;
}

export interface RateLimitInfo {
  used: number;
  limit: number;
  remaining: number;
  percentage: number;
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
  const url = `${config.shopUrl}/admin/api/${API_VERSION}/graphql.json`;
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

      console.debug(
        `GraphQL Response: status=${response.status} | rate=${rateLimitHeader} | cost=${costHeader}`
      );

      // Rate-Limit-Sleep (wie im Python-Skript)
      await new Promise((resolve) => setTimeout(resolve, DEFAULT_SLEEP_MS));

      if (response.status !== 200) {
        const preview = JSON.stringify(response.data).substring(0, 800);
        throw new Error(`GraphQL HTTP ${response.status} | preview: ${preview}`);
      }

      const data = response.data;

      if (data.errors) {
        console.error("GraphQL top-level errors:", data.errors);
        throw new Error("GraphQL top-level errors");
      }

      if (!data.data) {
        throw new Error("GraphQL response has no data");
      }

      return data.data;
    } catch (error) {
      const axiosError = error as AxiosError<GraphQLResponse>;

      // Retry-Logik für 429 (Rate-Limit) und 5xx (Server-Fehler)
      if (
        axiosError.response &&
        (axiosError.response.status === 429 ||
          (axiosError.response.status >= 500 && axiosError.response.status < 600))
      ) {
        if (attempt >= MAX_RETRIES) {
          throw error;
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

      // Andere Fehler: nicht retryen
      throw error;
    }
  }
}

/**
 * Ruft alle Produkte mit Cursor-Pagination ab.
 * 
 * @param config - Shopify-Konfiguration
 * @returns Liste von Produkten
 */
export async function getAllProducts(config: ShopifyConfig): Promise<Product[]> {
  const products: Product[] = [];
  let after: string | null = null;
  let page = 0;

  while (true) {
    page++;
    const variables: Record<string, unknown> = { first: 250 };
    if (after) {
      variables.after = after;
    }

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
                  inventoryItem: { id: string } | null;
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
      const variants: Variant[] = node.variants.edges.map((vEdge) => ({
        id: vEdge.node.id,
        productId: node.id,
        sku: vEdge.node.sku,
        barcode: vEdge.node.barcode,
        title: vEdge.node.title,
        price: vEdge.node.price,
        inventoryItemId: vEdge.node.inventoryItem?.id || null,
      }));

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

  console.error(`Keine Location-ID für '${locationName}' gefunden.`);
  return null;
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
      reason: "correction",
      setQuantities: updates.map(({ inventoryItemId, quantity }) => ({
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

