import axios from "axios";
import { GQL_PRODUCTS, GQL_LOCATIONS, GQL_VARIANTS_BULK_UPDATE, GQL_INVENTORY_SET, } from "./queries";
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
/**
 * Parst Rate-Limit-Header-String zu RateLimitInfo.
 *
 * @param rateLimitHeader - Header-String im Format "40/40" (used/limit)
 * @returns RateLimitInfo oder null bei ungültigem Format
 */
export function parseRateLimitHeader(rateLimitHeader) {
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
export function getLastRateLimitInfo() {
    const header = globalThis.__lastRateLimitInfo;
    return parseRateLimitHeader(header);
}
/**
 * Ruft die letzte Request-Cost ab (von der letzten GraphQL-Anfrage).
 *
 * @returns Cost als Number oder null
 */
export function getLastRequestCost() {
    const costHeader = globalThis.__lastRequestCost;
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
 * Ruft Cost-Tracking-Info ab.
 *
 * @returns Cost-Tracking-Info
 */
export function getCostTrackingInfo() {
    return {
        lastRequestCost: getLastRequestCost(),
    };
}
/**
 * Führt GraphQL-Query/Mutation mit Retry-Logik aus.
 *
 * @param config - Shopify-Konfiguration
 * @param query - GraphQL Query/Mutation String
 * @param variables - GraphQL Variables
 * @returns GraphQL Response Data
 */
async function executeGraphQL(config, query, variables = {}) {
    const apiVersion = config.apiVersion || DEFAULT_API_VERSION;
    const url = `${config.shopUrl}/admin/api/${apiVersion}/graphql.json`;
    const headers = {
        "X-Shopify-Access-Token": config.accessToken,
        "Content-Type": "application/json",
    };
    let attempt = 0;
    while (true) {
        try {
            const response = await axios.post(url, { query, variables }, { headers });
            const rateLimitHeader = response.headers["x-shopify-shop-api-call-limit"];
            const costHeader = response.headers["x-request-cost"];
            // Rate-Limit-Info für spätere Verwendung speichern (global)
            if (rateLimitHeader) {
                globalThis.__lastRateLimitInfo = rateLimitHeader;
            }
            // Cost-Info für spätere Verwendung speichern (global)
            if (costHeader) {
                globalThis.__lastRequestCost = costHeader;
            }
            console.debug(`GraphQL Response: status=${response.status} | rate=${rateLimitHeader} | cost=${costHeader}`);
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
        }
        catch (error) {
            const axiosError = error;
            // Retry-Logik für 429 (Rate-Limit) und 5xx (Server-Fehler)
            if (axiosError.response &&
                (axiosError.response.status === 429 ||
                    (axiosError.response.status >= 500 && axiosError.response.status < 600))) {
                if (attempt >= MAX_RETRIES) {
                    throw error;
                }
                const retryAfter = axiosError.response.headers["retry-after"];
                let waitTime;
                if (retryAfter) {
                    waitTime = Math.max(parseFloat(retryAfter) * 1000, 1000); // in ms
                }
                else {
                    waitTime = 1000 * Math.pow(BACKOFF_FACTOR, attempt); // Exponential Backoff
                }
                console.warn(`HTTP ${axiosError.response.status} – Retry in ${waitTime / 1000}s (Versuch ${attempt + 1}/${MAX_RETRIES})`);
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
export async function getAllProducts(config) {
    const products = [];
    let after = null;
    let page = 0;
    while (true) {
        page++;
        const variables = { first: 250 };
        if (after) {
            variables.after = after;
        }
        const data = await executeGraphQL(config, GQL_PRODUCTS, variables);
        const connection = data.products;
        const count = connection.edges.length;
        console.log(`[products] Seite ${page}: edges=${count} hasNext=${connection.pageInfo.hasNextPage}`);
        for (const edge of connection.edges) {
            const node = edge.node;
            const variants = node.variants.edges.map((vEdge) => ({
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
 * Ruft alle Locations von Shopify ab.
 *
 * @param config - Shopify-Konfiguration
 * @returns Liste von Locations
 */
export async function getAllLocations(config) {
    const locations = [];
    let after = null;
    let page = 0;
    while (true) {
        page++;
        const variables = { first: 250 };
        if (after) {
            variables.after = after;
        }
        const data = await executeGraphQL(config, GQL_LOCATIONS, variables);
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
export async function getLocationId(config, locationName) {
    let after = null;
    let page = 0;
    while (true) {
        page++;
        const variables = { first: 250 };
        if (after) {
            variables.after = after;
        }
        const data = await executeGraphQL(config, GQL_LOCATIONS, variables);
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
export async function updatePricesBulk(config, productId, updates) {
    const variants = updates.map(({ variantId, price }) => ({
        id: variantId,
        price,
    }));
    const data = await executeGraphQL(config, GQL_VARIANTS_BULK_UPDATE, {
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
export async function setInventory(config, locationId, updates) {
    const data = await executeGraphQL(config, GQL_INVENTORY_SET, {
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
