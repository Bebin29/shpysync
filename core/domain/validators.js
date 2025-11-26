"use strict";
/**
 * Validierungsfunktionen für CSV, Config und Shopify.
 *
 * Diese Funktionen werfen WawiError bei Validierungsfehlern.
 */
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.REQUIRED_SHOPIFY_SCOPES = void 0;
exports.validateCsvFile = validateCsvFile;
exports.validateCsvHeaders = validateCsvHeaders;
exports.validateColumnMapping = validateColumnMapping;
exports.validateShopUrl = validateShopUrl;
exports.validateAccessToken = validateAccessToken;
exports.validateShopConfig = validateShopConfig;
exports.validateLocationId = validateLocationId;
exports.validateShopifyScopes = validateShopifyScopes;
const fs = __importStar(require("fs"));
const errors_js_1 = require("./errors.js");
const normalization_js_1 = require("../utils/normalization.js");
/**
 * Validiert, ob eine CSV-Datei existiert und lesbar ist.
 */
function validateCsvFile(filePath) {
    if (!filePath || filePath.trim() === "") {
        throw errors_js_1.WawiError.csvError("CSV_FILE_NOT_FOUND", "Kein Dateipfad angegeben");
    }
    if (!fs.existsSync(filePath)) {
        throw errors_js_1.WawiError.csvError("CSV_FILE_NOT_FOUND", `Datei nicht gefunden: ${filePath}`, {
            filePath,
        });
    }
    const stats = fs.statSync(filePath);
    if (!stats.isFile()) {
        throw errors_js_1.WawiError.csvError("CSV_INVALID_FORMAT", `Pfad ist keine Datei: ${filePath}`, {
            filePath,
        });
    }
    if (stats.size === 0) {
        throw errors_js_1.WawiError.csvError("CSV_EMPTY", "Die CSV-Datei ist leer", {
            filePath,
        });
    }
}
/**
 * Validiert, ob CSV-Header vorhanden sind und nicht leer sind.
 */
function validateCsvHeaders(headers) {
    if (!headers || headers.length === 0) {
        throw errors_js_1.WawiError.csvError("CSV_EMPTY", "Die CSV-Datei enthält keine Header-Zeile");
    }
    // Prüfe auf leere Header-Namen
    const emptyHeaders = headers.filter((h) => !h || h.trim() === "");
    if (emptyHeaders.length > 0) {
        throw errors_js_1.WawiError.csvError("CSV_INVALID_FORMAT", `Die CSV-Datei enthält leere Header-Namen an Positionen: ${emptyHeaders.map((_, i) => i + 1).join(", ")}`);
    }
}
/**
 * Validiert, ob ein Spalten-Mapping gültig ist und alle referenzierten Spalten existieren.
 */
function validateColumnMapping(mapping, headers) {
    if (!mapping) {
        throw errors_js_1.WawiError.csvError("CSV_MAPPING_INVALID", "Kein Spalten-Mapping angegeben");
    }
    const requiredFields = ["sku", "name", "price", "stock"];
    const missingFields = [];
    for (const field of requiredFields) {
        if (!mapping[field] || mapping[field].trim() === "") {
            missingFields.push(field);
        }
    }
    if (missingFields.length > 0) {
        throw errors_js_1.WawiError.csvError("CSV_MAPPING_INVALID", `Fehlende Mapping-Felder: ${missingFields.join(", ")}`, { missingFields });
    }
    // Validiere, dass alle Spaltenbuchstaben gültig sind und existieren
    const errors = [];
    for (const field of requiredFields) {
        const columnLetter = mapping[field].trim().toUpperCase();
        let columnIndex;
        try {
            columnIndex = (0, normalization_js_1.columnLetterToIndex)(columnLetter);
        }
        catch (error) {
            errors.push(`${field}: Ungültiger Spaltenbuchstabe '${columnLetter}'`);
            continue;
        }
        if (columnIndex >= headers.length) {
            errors.push(`${field}: Spalte '${columnLetter}' (Index ${columnIndex}) existiert nicht. Die CSV hat nur ${headers.length} Spalten.`);
        }
    }
    if (errors.length > 0) {
        throw errors_js_1.WawiError.csvError("CSV_MAPPING_INVALID", errors.join("; "), {
            errors,
            mapping,
            headersCount: headers.length,
        });
    }
}
/**
 * Validiert eine Shop-URL.
 */
function validateShopUrl(url) {
    if (!url || url.trim() === "") {
        throw errors_js_1.WawiError.configError("CONFIG_SHOP_URL_INVALID", "Shop-URL ist leer");
    }
    try {
        let normalizedUrl = url.trim();
        if (!normalizedUrl.startsWith("http://") && !normalizedUrl.startsWith("https://")) {
            normalizedUrl = `https://${normalizedUrl}`;
        }
        const urlObj = new URL(normalizedUrl);
        if (!urlObj.hostname.endsWith(".myshopify.com")) {
            throw errors_js_1.WawiError.configError("CONFIG_SHOP_URL_INVALID", `Shop-URL muss auf '.myshopify.com' enden, aber war: ${urlObj.hostname}`, { url, hostname: urlObj.hostname });
        }
    }
    catch (error) {
        if (error instanceof errors_js_1.WawiError) {
            throw error;
        }
        throw errors_js_1.WawiError.configError("CONFIG_SHOP_URL_INVALID", `Ungültige URL: ${url}`, {
            url,
            originalError: error instanceof Error ? error.message : String(error),
        });
    }
}
/**
 * Validiert ein Access-Token-Format.
 *
 * @param strict - Wenn true, wird das Format streng geprüft. Wenn false, wird nur geprüft, ob das Token nicht leer ist.
 */
function validateAccessToken(token, strict = false) {
    if (!token || token.trim() === "") {
        throw errors_js_1.WawiError.configError("CONFIG_TOKEN_INVALID", "Access-Token ist leer");
    }
    const trimmedToken = token.trim();
    // Wenn strict=false, nur Mindestlänge prüfen
    if (!strict) {
        if (trimmedToken.length < 10) {
            throw errors_js_1.WawiError.configError("CONFIG_TOKEN_INVALID", "Access-Token ist zu kurz", { tokenLength: trimmedToken.length });
        }
        return; // Keine Format-Prüfung bei nicht-strikter Validierung
    }
    // Strikte Format-Prüfung (nur wenn strict=true)
    if (!trimmedToken.startsWith("shpat_") && !trimmedToken.startsWith("shpca_")) {
        throw errors_js_1.WawiError.configError("CONFIG_TOKEN_INVALID", `Access-Token muss mit 'shpat_' oder 'shpca_' beginnen, aber war: ${trimmedToken.substring(0, 10)}...`, { tokenPrefix: trimmedToken.substring(0, 10) });
    }
    // Mindestlänge prüfen (shpat_/shpca_ + mindestens 32 Zeichen)
    if (trimmedToken.length < 40) {
        throw errors_js_1.WawiError.configError("CONFIG_TOKEN_INVALID", "Access-Token ist zu kurz (muss mindestens 40 Zeichen lang sein)", { tokenLength: trimmedToken.length });
    }
}
/**
 * Validiert eine vollständige Shop-Konfiguration.
 */
function validateShopConfig(config, strictTokenValidation = false) {
    if (!config) {
        throw errors_js_1.WawiError.configError("CONFIG_INVALID", "Keine Shop-Konfiguration angegeben");
    }
    validateShopUrl(config.shopUrl);
    validateAccessToken(config.accessToken, strictTokenValidation); // strictTokenValidation als Parameter
    if (!config.locationId || config.locationId.trim() === "") {
        throw errors_js_1.WawiError.configError("CONFIG_LOCATION_MISSING", "Keine Location-ID angegeben");
    }
    if (!config.locationName || config.locationName.trim() === "") {
        throw errors_js_1.WawiError.configError("CONFIG_LOCATION_MISSING", "Kein Location-Name angegeben");
    }
}
/**
 * Validiert, ob eine Location-ID gültig ist (Shopify GID-Format).
 */
function validateLocationId(locationId) {
    if (!locationId || locationId.trim() === "") {
        throw errors_js_1.WawiError.configError("CONFIG_LOCATION_MISSING", "Location-ID ist leer");
    }
    // Shopify GID-Format: gid://shopify/Location/123456789
    if (!locationId.startsWith("gid://shopify/Location/")) {
        throw errors_js_1.WawiError.configError("CONFIG_LOCATION_MISSING", `Ungültiges Location-ID-Format: ${locationId}`, { locationId });
    }
}
/**
 * Erforderliche Shopify API-Scopes für die App.
 *
 * Diese Scopes müssen beim Erstellen des Access-Tokens aktiviert sein.
 */
exports.REQUIRED_SHOPIFY_SCOPES = [
    "read_products", // Produkte und Varianten lesen
    "write_products", // Preise aktualisieren
    "read_inventory", // Bestände lesen
    "write_inventory", // Bestände aktualisieren
    "read_locations", // Locations lesen
];
/**
 * Validiert, ob alle erforderlichen Shopify API-Scopes vorhanden sind.
 *
 * @param availableScopes - Liste der verfügbaren Scopes (vom Token)
 * @throws WawiError mit Code SHOPIFY_INSUFFICIENT_SCOPES wenn Scopes fehlen
 */
function validateShopifyScopes(availableScopes) {
    const missingScopes = [];
    for (const requiredScope of exports.REQUIRED_SHOPIFY_SCOPES) {
        if (!availableScopes.includes(requiredScope)) {
            missingScopes.push(requiredScope);
        }
    }
    if (missingScopes.length > 0) {
        throw errors_js_1.WawiError.shopifyError("SHOPIFY_INSUFFICIENT_SCOPES", `Fehlende API-Scopes: ${missingScopes.join(", ")}`, {
            missingScopes,
            requiredScopes: exports.REQUIRED_SHOPIFY_SCOPES,
            availableScopes,
        });
    }
}
