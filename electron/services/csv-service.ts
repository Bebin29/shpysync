import { parseCsvPreview, extractRowValues, convertToCsvRows, type ColumnMapping } from "../../core/infra/csv/parser.js";
import { indexToColumnLetter } from "../../core/utils/normalization.js";
import type { CsvRow } from "../../core/domain/types.js";
import type { CsvParseResult } from "../../core/infra/csv/parser.js";

/**
 * CSV-Preview-Ergebnis mit gemappten Zeilen.
 */
export interface CsvPreviewResult {
	headers: string[];
	encoding: string;
	totalRows: number;
	previewRows: CsvRow[];
	columnMapping: ColumnMapping;
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
 * Parst CSV-Datei im Preview-Modus und wendet Mapping an.
 * 
 * @param filePath - Pfad zur CSV-Datei
 * @param mapping - Spalten-Mapping (Spaltenbuchstaben)
 * @param maxRows - Maximale Anzahl von Vorschau-Zeilen (Standard: 200)
 * @returns Preview-Ergebnis mit gemappten Zeilen
 */
export async function previewCsvWithMapping(
	filePath: string,
	mapping: ColumnMapping,
	maxRows: number = 200
): Promise<CsvPreviewResult> {
	// CSV parsen (Preview-Modus)
	const parseResult: CsvParseResult = await parseCsvPreview(filePath, maxRows);

	if (parseResult.headers.length === 0) {
		return {
			headers: [],
			encoding: parseResult.encoding,
			totalRows: 0,
			previewRows: [],
			columnMapping: mapping,
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
	};
}

