import { extractRowValues, convertToCsvRows, type ColumnMapping } from "../../core/infra/csv/parser.js";
import { parseFilePreview } from "../../core/infra/file-parser/index.js";
import { indexToColumnLetter } from "../../core/utils/normalization.js";
import type { CsvRow } from "../../core/domain/types.js";
import type { FileParseResult } from "../../core/infra/file-parser/types.js";

/**
 * Datei-Preview-Ergebnis mit gemappten Zeilen (CSV/DBF).
 */
export interface CsvPreviewResult {
	headers: string[];
	encoding: string;
	totalRows: number;
	previewRows: CsvRow[];
	columnMapping: ColumnMapping;
	fileType: "csv" | "dbf";
}

/**
 * Erstellt ein Mapping von Spaltennamen zu Spaltenbuchstaben.
 * 
 * @param headers - Array von Header-Namen
 * @returns Mapping von Spaltenname zu Spaltenbuchstabe
 */
export function createColumnNameToLetterMap(headers: string[]): Map<string, string> {
	const map = new Map<string, string>();
	for (let i = 0; i < headers.length; i++) {
		const letter = indexToColumnLetter(i);
		map.set(headers[i], letter);
	}
	return map;
}

/**
 * Erstellt ein Mapping von Spaltenbuchstaben zu Spaltennamen.
 * 
 * @param headers - Array von Header-Namen
 * @returns Mapping von Spaltenbuchstabe zu Spaltenname
 */
export function createColumnLetterToNameMap(headers: string[]): Map<string, string> {
	const map = new Map<string, string>();
	for (let i = 0; i < headers.length; i++) {
		const letter = indexToColumnLetter(i);
		map.set(letter, headers[i]);
	}
	return map;
}

/**
 * Parst Datei (CSV/DBF) im Preview-Modus und wendet Mapping an.
 * 
 * @param filePath - Pfad zur Datei
 * @param mapping - Spalten-Mapping (Spaltenbuchstaben für CSV, Feldnamen für DBF)
 * @param maxRows - Maximale Anzahl von Vorschau-Zeilen (Standard: 200)
 * @returns Preview-Ergebnis mit gemappten Zeilen
 */
export async function previewCsvWithMapping(
	filePath: string,
	mapping: ColumnMapping,
	maxRows: number = 200
): Promise<CsvPreviewResult> {
	// Datei parsen (Preview-Modus) - automatische Dateityp-Erkennung
	const parseResult: FileParseResult = await parseFilePreview(filePath, maxRows);

	if (parseResult.headers.length === 0) {
		return {
			headers: [],
			encoding: parseResult.encoding,
			totalRows: 0,
			previewRows: [],
			columnMapping: mapping,
			fileType: parseResult.fileType,
		};
	}

	// Extrahiere Werte aus allen Zeilen mit Mapping
	const extractedRows = parseResult.rows
		.map((row) => extractRowValues(row, mapping, parseResult.headers))
		.filter((row): row is NonNullable<typeof row> => row !== null);

	// Konvertiere zu CsvRow (mit validiertem Stock)
	const csvRows = convertToCsvRows(extractedRows);

	return {
		headers: parseResult.headers,
		encoding: parseResult.encoding,
		totalRows: csvRows.length,
		previewRows: csvRows,
		columnMapping: mapping,
		fileType: parseResult.fileType,
	};
}

