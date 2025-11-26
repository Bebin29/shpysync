/**
 * Factory-Funktion für Dateiformat-Parser.
 * 
 * Stellt eine einheitliche Schnittstelle für CSV und DBF-Parser bereit.
 */

import { parseCsvStream, type CsvStreamResult } from "../csv/parser.js";
import { parseDbfStream, type DbfStreamResult } from "../dbf/parser.js";
import type { FileStreamResult, FileParseResult } from "./types.js";
import type { FileType } from "../../domain/validators.js";
import { detectFileType } from "./detector.js";
import { parseCsvPreview, type CsvParseResult } from "../csv/parser.js";
import { parseDbfPreview, type DbfParseResult } from "../dbf/parser.js";

/**
 * Parst eine Datei im Streaming-Modus basierend auf dem Dateityp.
 * 
 * @param filePath - Pfad zur Datei
 * @param fileType - Optional: Dateityp (wird automatisch erkannt, falls nicht angegeben)
 * @returns Stream-Ergebnis mit Headers, Encoding und AsyncIterator für Rows
 */
export async function parseFileStream(
  filePath: string,
  fileType?: FileType
): Promise<FileStreamResult> {
  const detectedType = fileType || detectFileType(filePath);

  if (detectedType === "dbf") {
    const dbfResult: DbfStreamResult = await parseDbfStream(filePath);
    return {
      headers: dbfResult.headers,
      encoding: dbfResult.encoding,
      fileType: "dbf",
      rows: dbfResult.rows,
    };
  } else {
    const csvResult: CsvStreamResult = await parseCsvStream(filePath, ";");
    return {
      headers: csvResult.headers,
      encoding: csvResult.encoding,
      fileType: "csv",
      rows: csvResult.rows,
    };
  }
}

/**
 * Parst eine Datei im Preview-Modus (nur erste N Zeilen).
 * 
 * @param filePath - Pfad zur Datei
 * @param maxRows - Maximale Anzahl von Datenzeilen (Standard: 200)
 * @param fileType - Optional: Dateityp (wird automatisch erkannt, falls nicht angegeben)
 * @returns Parse-Ergebnis mit ersten N Zeilen
 */
export async function parseFilePreview(
  filePath: string,
  maxRows: number = 200,
  fileType?: FileType
): Promise<FileParseResult> {
  const detectedType = fileType || detectFileType(filePath);

  if (detectedType === "dbf") {
    const dbfResult: DbfParseResult = await parseDbfPreview(filePath, maxRows);
    return {
      rows: dbfResult.rows,
      headers: dbfResult.headers,
      encoding: dbfResult.encoding,
      totalRows: dbfResult.totalRows,
      fileType: "dbf",
    };
  } else {
    const csvResult: CsvParseResult = await parseCsvPreview(filePath, maxRows);
    return {
      rows: csvResult.rows,
      headers: csvResult.headers,
      encoding: csvResult.encoding,
      totalRows: csvResult.totalRows,
      fileType: "csv",
    };
  }
}

