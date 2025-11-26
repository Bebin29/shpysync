"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.parseRateLimitHeader = parseRateLimitHeader;
exports.getLastRateLimitInfo = getLastRateLimitInfo;
exports.getLastRequestCost = getLastRequestCost;
exports.getCostTrackingInfo = getCostTrackingInfo;
exports.getAllProducts = getAllProducts;
exports.getAllLocations = getAllLocations;
exports.getLocationId = getLocationId;
exports.getAccessScopes = getAccessScopes;
exports.updatePricesBulk = updatePricesBulk;
exports.setInventory = setInventory;
const axios_1 = __importDefault(require("axios"));
const queries_js_1 = require("./queries.js");
const errors_js_1 = require("../../domain/errors.js");
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
function parseRateLimitHeader(rateLimitHeader) {
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
function getLastRateLimitInfo() {
    const header = globalThis.__lastRateLimitInfo;
    return parseRateLimitHeader(header);
}
/**
 * Ruft die letzte Request-Cost ab (von der letzten GraphQL-Anfrage).
 *
 * @returns Cost als Number oder null
 */
function getLastRequestCost() {
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
function getCostTrackingInfo() {
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
            const response = await axios_1.default.post(url, { query, variables }, { headers });
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
                // Konvertiere HTTP-Status zu WawiError
                if (response.status === 401) {
                    throw errors_js_1.WawiError.shopifyError("SHOPIFY_UNAUTHORIZED", "Authentifizierung fehlgeschlagen", {
                        status: response.status,
                        preview,
                    });
                }
                else if (response.status === 403) {
                    throw errors_js_1.WawiError.shopifyError("SHOPIFY_FORBIDDEN", "Zugriff verweigert", {
                        status: response.status,
                        preview,
                    });
                }
                else if (response.status >= 500 && response.status < 600) {
                    throw errors_js_1.WawiError.shopifyError("SHOPIFY_SERVER_ERROR", `Server-Fehler: ${response.status}`, {
                        status: response.status,
                        preview,
                    });
                }
                else {
                    throw errors_js_1.WawiError.shopifyError("SHOPIFY_SERVER_ERROR", `HTTP ${response.status}`, {
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
                    throw errors_js_1.WawiError.shopifyError("SHOPIFY_UNAUTHORIZED", firstError.message || "Authentifizierung fehlgeschlagen", {
                        errors: data.errors,
                    });
                }
                else if (errorCode === "FORBIDDEN") {
                    throw errors_js_1.WawiError.shopifyError("SHOPIFY_FORBIDDEN", firstError.message || "Zugriff verweigert", {
                        errors: data.errors,
                    });
                }
                else {
                    throw errors_js_1.WawiError.shopifyError("SHOPIFY_SERVER_ERROR", "GraphQL-Fehler", {
                        errors: data.errors,
                    });
                }
            }
            if (!data.data) {
                throw errors_js_1.WawiError.shopifyError("SHOPIFY_SERVER_ERROR", "GraphQL-Response enthält keine Daten");
            }
            return data.data;
        }
        catch (error) {
            // Wenn bereits ein WawiError, weiterwerfen
            if (error instanceof errors_js_1.WawiError) {
                // Rate-Limit-Fehler können retryt werden
                if (error.code === "SHOPIFY_RATE_LIMIT" || error.code === "SHOPIFY_SERVER_ERROR") {
                    if (attempt >= MAX_RETRIES) {
                        throw error;
                    }
                    const axiosError = error.details;
                    const retryAfter = axiosError?.retryAfter;
                    let waitTime;
                    if (retryAfter) {
                        waitTime = Math.max(parseFloat(retryAfter) * 1000, 1000); // in ms
                    }
                    else {
                        waitTime = 1000 * Math.pow(BACKOFF_FACTOR, attempt); // Exponential Backoff
                    }
                    console.warn(`${error.code} – Retry in ${waitTime / 1000}s (Versuch ${attempt + 1}/${MAX_RETRIES})`);
                    await new Promise((resolve) => setTimeout(resolve, waitTime));
                    attempt++;
                    continue;
                }
                // Andere Fehler: nicht retryen
                throw error;
            }
            const axiosError = error;
            // Retry-Logik für 429 (Rate-Limit) und 5xx (Server-Fehler)
            if (axiosError.response &&
                (axiosError.response.status === 429 ||
                    (axiosError.response.status >= 500 && axiosError.response.status < 600))) {
                if (attempt >= MAX_RETRIES) {
                    // Konvertiere zu WawiError
                    if (axiosError.response.status === 429) {
                        throw errors_js_1.WawiError.shopifyError("SHOPIFY_RATE_LIMIT", "Rate-Limit überschritten", {
                            status: axiosError.response.status,
                            retryAfter: axiosError.response.headers["retry-after"],
                        });
                    }
                    else {
                        throw errors_js_1.WawiError.shopifyError("SHOPIFY_SERVER_ERROR", `Server-Fehler: ${axiosError.response.status}`, {
                            status: axiosError.response.status,
                        });
                    }
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
            // Netzwerk-Fehler
            if (axiosError.code === "ECONNREFUSED" || axiosError.code === "ETIMEDOUT" || axiosError.code === "ENOTFOUND") {
                throw errors_js_1.WawiError.networkError(`Netzwerk-Fehler: ${axiosError.message}`, {
                    code: axiosError.code,
                    message: axiosError.message,
                });
            }
            // Andere Fehler: zu WawiError konvertieren
            throw errors_js_1.WawiError.fromError(error, "SHOPIFY_SERVER_ERROR");
        }
    }
}
/**
 * Ruft alle Produkte mit Cursor-Pagination ab.
 *
 * @param config - Shopify-Konfiguration
 * @returns Liste von Produkten
 */
async function getAllProducts(config) {
    const products = [];
    let after = null;
    let page = 0;
    while (true) {
        page++;
        const variables = { first: 250 };
        if (after) {
            variables.after = after;
        }
        const data = await executeGraphQL(config, queries_js_1.GQL_PRODUCTS, variables);
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
async function getAllLocations(config) {
    const locations = [];
    let after = null;
    let page = 0;
    while (true) {
        page++;
        const variables = { first: 250 };
        if (after) {
            variables.after = after;
        }
        const data = await executeGraphQL(config, queries_js_1.GQL_LOCATIONS, variables);
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
async function getLocationId(config, locationName) {
    let after = null;
    let page = 0;
    while (true) {
        page++;
        const variables = { first: 250 };
        if (after) {
            variables.after = after;
        }
        const data = await executeGraphQL(config, queries_js_1.GQL_LOCATIONS, variables);
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
    throw errors_js_1.WawiError.shopifyError("SHOPIFY_LOCATION_NOT_FOUND", `Location '${locationName}' nicht gefunden`, {
        locationName,
    });
}
/**
 * Ruft die Access-Scopes des aktuellen Tokens ab.
 *
 * @param config - Shopify-Konfiguration
 * @returns Liste von Scope-Handles (z.B. ["read_products", "write_products"])
 */
async function getAccessScopes(config) {
    try {
        const data = await executeGraphQL(config, queries_js_1.GQL_SHOP_ACCESS_SCOPES);
        return data.shop.accessScopes.map((scope) => scope.handle);
    }
    catch (error) {
        // Wenn die Query fehlschlägt (z.B. weil der Scope nicht verfügbar ist),
        // werfen wir einen Fehler
        if (error instanceof errors_js_1.WawiError) {
            throw error;
        }
        throw errors_js_1.WawiError.shopifyError("SHOPIFY_INSUFFICIENT_SCOPES", "Konnte Access-Scopes nicht abrufen", { originalError: error instanceof Error ? error.message : String(error) });
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
async function updatePricesBulk(config, productId, updates) {
    const variants = updates.map(({ variantId, price }) => ({
        id: variantId,
        price,
    }));
    const data = await executeGraphQL(config, queries_js_1.GQL_VARIANTS_BULK_UPDATE, {
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
async function setInventory(config, locationId, updates) {
    const data = await executeGraphQL(config, queries_js_1.GQL_INVENTORY_SET, {
        input: {
            name: "available", // 'available' oder 'on_hand'
            reason: "correction",
            ignoreCompareQuantity: true, // CAS aus -> direkt absolut setzen
            quantities: updates.map(({ inventoryItemId, quantity }) => ({
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
