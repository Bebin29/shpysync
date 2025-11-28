/**
 * Validierungsfunktionen für CSV, Config und Shopify.
 * 
 * Diese Funktionen werfen WawiError bei Validierungsfehlern.
 */

import * as fs from "fs";
import * as path from "path";
import type { ColumnMapping } from "../infra/csv/parser.js";
import { WawiError } from "./errors.js";
import { columnLetterToIndex } from "../utils/normalization.js";

/**
 * Unterstützte Dateitypen.
 */
export type FileType = "csv" | "dbf";

/**
 * Validiert, ob eine CSV-Datei existiert und lesbar ist.
 */
export function validateCsvFile(filePath: string): void {
	if (!filePath || filePath.trim() === "") {
		throw WawiError.csvError("CSV_FILE_NOT_FOUND", "Kein Dateipfad angegeben");
	}

	if (!fs.existsSync(filePath)) {
		throw WawiError.csvError("CSV_FILE_NOT_FOUND", `Datei nicht gefunden: ${filePath}`, {
			filePath,
		});
	}

	const stats = fs.statSync(filePath);
	if (!stats.isFile()) {
		throw WawiError.csvError("CSV_INVALID_FORMAT", `Pfad ist keine Datei: ${filePath}`, {
			filePath,
		});
	}

	if (stats.size === 0) {
		throw WawiError.csvError("CSV_EMPTY", "Die CSV-Datei ist leer", {
			filePath,
		});
	}
}

/**
 * Normalisiert CSV-Header, indem leere Header automatisch benannt werden.
 * 
 * @param headers - Array von Header-Namen
 * @returns Normalisierte Header (leere Header werden als "Column_N" benannt)
 */
function normalizeCsvHeaders(headers: string[]): string[] {
	return headers.map((header, index) => {
		if (!header || header.trim() === "") {
			return `Column_${index + 1}`;
		}
		return header.trim();
	});
}

/**
 * Validiert, ob CSV-Header vorhanden sind und normalisiert leere Header automatisch.
 * 
 * Leere Header werden automatisch als "Column_N" benannt (z.B. "Column_1", "Column_2").
 * Die Funktion modifiziert das übergebene Array direkt.
 * 
 * @param headers - Array von Header-Namen (wird modifiziert)
 * @throws WawiError wenn keine Header vorhanden sind
 */
export function validateCsvHeaders(headers: string[]): void {
	if (!headers || headers.length === 0) {
		throw WawiError.csvError("CSV_EMPTY", "Die CSV-Datei enthält keine Header-Zeile");
	}

	// Normalisiere leere Header automatisch
	const normalizedHeaders = normalizeCsvHeaders(headers);
	
	// Ersetze die ursprünglichen Header durch normalisierte
	for (let i = 0; i < headers.length; i++) {
		headers[i] = normalizedHeaders[i];
	}
}

/**
 * Validiert, ob eine DBF-Datei existiert und lesbar ist.
 */
export function validateDbfFile(filePath: string): void {
	if (!filePath || filePath.trim() === "") {
		throw WawiError.csvError("CSV_FILE_NOT_FOUND", "Kein Dateipfad angegeben");
	}

	if (!fs.existsSync(filePath)) {
		throw WawiError.csvError("CSV_FILE_NOT_FOUND", `Datei nicht gefunden: ${filePath}`, {
			filePath,
		});
	}

	const stats = fs.statSync(filePath);
	if (!stats.isFile()) {
		throw WawiError.csvError("CSV_INVALID_FORMAT", `Pfad ist keine Datei: ${filePath}`, {
			filePath,
		});
	}

	if (stats.size === 0) {
		throw WawiError.csvError("CSV_EMPTY", "Die DBF-Datei ist leer", {
			filePath,
		});
	}

	// Prüfe DBF-Magic Bytes (erstes Byte sollte 0x03, 0x83, 0x8B, 0x30, 0x31, 0x32, 0xF5 sein)
	const buffer = Buffer.alloc(1);
	const fd = fs.openSync(filePath, "r");
	fs.readSync(fd, buffer, 0, 1, 0);
	fs.closeSync(fd);

	const magicByte = buffer[0];
	const validMagicBytes = [0x03, 0x83, 0x8B, 0x30, 0x31, 0x32, 0xF5]; // dBASE III/IV/VII, FoxPro, etc.
	
	if (!validMagicBytes.includes(magicByte)) {
		throw WawiError.csvError(
			"CSV_INVALID_FORMAT",
			`Die Datei scheint keine gültige DBF-Datei zu sein (Magic Byte: 0x${magicByte.toString(16).toUpperCase()})`,
			{ filePath, magicByte }
		);
	}
}

/**
 * Normalisiert DBF-Header, indem leere Header automatisch benannt werden.
 * 
 * @param headers - Array von Header-Namen
 * @returns Normalisierte Header (leere Header werden als "Field_N" benannt)
 */
function normalizeDbfHeaders(headers: string[]): string[] {
	return headers.map((header, index) => {
		if (!header || header.trim() === "") {
			return `Field_${index + 1}`;
		}
		return header.trim();
	});
}

/**
 * Validiert, ob DBF-Header (Feldnamen) vorhanden sind und normalisiert leere Header automatisch.
 * 
 * Leere Header werden automatisch als "Field_N" benannt (z.B. "Field_1", "Field_2").
 * Die Funktion modifiziert das übergebene Array direkt.
 * 
 * @param headers - Array von Header-Namen (wird modifiziert)
 * @throws WawiError wenn keine Header vorhanden sind
 */
export function validateDbfHeaders(headers: string[]): void {
	if (!headers || headers.length === 0) {
		throw WawiError.csvError("CSV_EMPTY", "Die DBF-Datei enthält keine Felder");
	}

	// Normalisiere leere Header automatisch
	const normalizedHeaders = normalizeDbfHeaders(headers);
	
	// Ersetze die ursprünglichen Header durch normalisierte
	for (let i = 0; i < headers.length; i++) {
		headers[i] = normalizedHeaders[i];
	}
}

/**
 * Erkennt den Dateityp basierend auf der Dateiendung.
 * 
 * @param filePath - Pfad zur Datei
 * @returns Erkanntes Dateiformat
 */
export function detectFileType(filePath: string): FileType {
	const ext = path.extname(filePath).toLowerCase();
	if (ext === ".dbf") {
		return "dbf";
	}
	return "csv"; // Default
}

/**
 * Validiert eine Datei (CSV oder DBF) generisch.
 * 
 * @param filePath - Pfad zur Datei
 * @param fileType - Optional: Dateityp (wird automatisch erkannt, falls nicht angegeben)
 */
export function validateFile(filePath: string, fileType?: FileType): void {
	const detectedType = fileType || detectFileType(filePath);
	
	if (detectedType === "dbf") {
		validateDbfFile(filePath);
	} else {
		validateCsvFile(filePath);
	}
}

/**
 * Validiert, ob ein Spalten-Mapping gültig ist und alle referenzierten Spalten existieren.
 */
export function validateColumnMapping(
	mapping: ColumnMapping,
	headers: string[]
): void {
	if (!mapping) {
		throw WawiError.csvError("CSV_MAPPING_INVALID", "Kein Spalten-Mapping angegeben");
	}

	const requiredFields: Array<keyof ColumnMapping> = ["sku", "name", "price", "stock"];
	const missingFields: string[] = [];

	for (const field of requiredFields) {
		if (!mapping[field] || mapping[field].trim() === "") {
			missingFields.push(field);
		}
	}

	if (missingFields.length > 0) {
		throw WawiError.csvError(
			"CSV_MAPPING_INVALID",
			`Fehlende Mapping-Felder: ${missingFields.join(", ")}`,
			{ missingFields }
		);
	}

	// Validiere, dass alle Spaltenbuchstaben gültig sind und existieren
	const errors: string[] = [];

	for (const field of requiredFields) {
		const columnLetter = mapping[field].trim().toUpperCase();
		let columnIndex: number;

		try {
			columnIndex = columnLetterToIndex(columnLetter);
		} catch (error) {
			errors.push(`${field}: Ungültiger Spaltenbuchstabe '${columnLetter}'`);
			continue;
		}

		if (columnIndex >= headers.length) {
			errors.push(
				`${field}: Spalte '${columnLetter}' (Index ${columnIndex}) existiert nicht. Die CSV hat nur ${headers.length} Spalten.`
			);
		}
	}

	if (errors.length > 0) {
		throw WawiError.csvError("CSV_MAPPING_INVALID", errors.join("; "), {
			errors,
			mapping,
			headersCount: headers.length,
		});
	}
}

/**
 * Validiert eine Shop-URL.
 */
export function validateShopUrl(url: string): void {
	if (!url || url.trim() === "") {
		throw WawiError.configError("CONFIG_SHOP_URL_INVALID", "Shop-URL ist leer");
	}

	try {
		let normalizedUrl = url.trim();
		if (!normalizedUrl.startsWith("http://") && !normalizedUrl.startsWith("https://")) {
			normalizedUrl = `https://${normalizedUrl}`;
		}

		const urlObj = new URL(normalizedUrl);
		if (!urlObj.hostname.endsWith(".myshopify.com")) {
			throw WawiError.configError(
				"CONFIG_SHOP_URL_INVALID",
				`Shop-URL muss auf '.myshopify.com' enden, aber war: ${urlObj.hostname}`,
				{ url, hostname: urlObj.hostname }
			);
		}
	} catch (error) {
		if (error instanceof WawiError) {
			throw error;
		}
		throw WawiError.configError("CONFIG_SHOP_URL_INVALID", `Ungültige URL: ${url}`, {
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
export function validateAccessToken(token: string, strict: boolean = false): void {
	if (!token || token.trim() === "") {
		throw WawiError.configError("CONFIG_TOKEN_INVALID", "Access-Token ist leer");
	}

	const trimmedToken = token.trim();

	// Wenn strict=false, nur Mindestlänge prüfen
	if (!strict) {
		if (trimmedToken.length < 10) {
			throw WawiError.configError(
				"CONFIG_TOKEN_INVALID",
				"Access-Token ist zu kurz",
				{ tokenLength: trimmedToken.length }
			);
		}
		return; // Keine Format-Prüfung bei nicht-strikter Validierung
	}

	// Strikte Format-Prüfung (nur wenn strict=true)
	if (!trimmedToken.startsWith("shpat_") && !trimmedToken.startsWith("shpca_")) {
		throw WawiError.configError(
			"CONFIG_TOKEN_INVALID",
			`Access-Token muss mit 'shpat_' oder 'shpca_' beginnen, aber war: ${trimmedToken.substring(0, 10)}...`,
			{ tokenPrefix: trimmedToken.substring(0, 10) }
		);
	}

	// Mindestlänge prüfen (shpat_/shpca_ + mindestens 32 Zeichen)
	if (trimmedToken.length < 40) {
		throw WawiError.configError(
			"CONFIG_TOKEN_INVALID",
			"Access-Token ist zu kurz (muss mindestens 40 Zeichen lang sein)",
			{ tokenLength: trimmedToken.length }
		);
	}
}

/**
 * Validiert eine vollständige Shop-Konfiguration.
 */
export function validateShopConfig(config: {
	shopUrl: string;
	accessToken: string;
	locationId: string;
	locationName: string;
}, strictTokenValidation: boolean = false): void {
	if (!config) {
		throw WawiError.configError("CONFIG_INVALID", "Keine Shop-Konfiguration angegeben");
	}

	validateShopUrl(config.shopUrl);
	validateAccessToken(config.accessToken, strictTokenValidation); // strictTokenValidation als Parameter

	if (!config.locationId || config.locationId.trim() === "") {
		throw WawiError.configError("CONFIG_LOCATION_MISSING", "Keine Location-ID angegeben");
	}

	if (!config.locationName || config.locationName.trim() === "") {
		throw WawiError.configError("CONFIG_LOCATION_MISSING", "Kein Location-Name angegeben");
	}
}

/**
 * Validiert, ob eine Location-ID gültig ist (Shopify GID-Format).
 */
export function validateLocationId(locationId: string): void {
	if (!locationId || locationId.trim() === "") {
		throw WawiError.configError("CONFIG_LOCATION_MISSING", "Location-ID ist leer");
	}

	// Shopify GID-Format: gid://shopify/Location/123456789
	if (!locationId.startsWith("gid://shopify/Location/")) {
		throw WawiError.configError(
			"CONFIG_LOCATION_MISSING",
			`Ungültiges Location-ID-Format: ${locationId}`,
			{ locationId }
		);
	}
}

/**
 * Erforderliche Shopify API-Scopes für die App.
 * 
 * Diese Scopes müssen beim Erstellen des Access-Tokens aktiviert sein.
 */
export const REQUIRED_SHOPIFY_SCOPES = [
	"read_products",    // Produkte und Varianten lesen
	"write_products",   // Preise aktualisieren
	"read_inventory",  // Bestände lesen
	"write_inventory", // Bestände aktualisieren
	"read_locations",  // Locations lesen
] as const;

/**
 * Validiert, ob alle erforderlichen Shopify API-Scopes vorhanden sind.
 * 
 * @param availableScopes - Liste der verfügbaren Scopes (vom Token)
 * @throws WawiError mit Code SHOPIFY_INSUFFICIENT_SCOPES wenn Scopes fehlen
 */
export function validateShopifyScopes(availableScopes: string[]): void {
	const missingScopes: string[] = [];

	for (const requiredScope of REQUIRED_SHOPIFY_SCOPES) {
		if (!availableScopes.includes(requiredScope)) {
			missingScopes.push(requiredScope);
		}
	}

	if (missingScopes.length > 0) {
		throw WawiError.shopifyError(
			"SHOPIFY_INSUFFICIENT_SCOPES",
			`Fehlende API-Scopes: ${missingScopes.join(", ")}`,
			{
				missingScopes,
				requiredScopes: REQUIRED_SHOPIFY_SCOPES,
				availableScopes,
			}
		);
	}
}

