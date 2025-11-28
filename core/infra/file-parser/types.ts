/**
 * Gemeinsame Types für Dateiformat-Parser (CSV, DBF).
 */

import type { RawCsvRow } from "../../domain/types.js";
import type { FileType } from "../../domain/validators.js";

/**
 * Gemeinsames Parse-Ergebnis für alle Dateiformate.
 */
export interface FileParseResult {
  rows: RawCsvRow[];
  headers: string[];
  encoding: string;
  totalRows: number;
  fileType: FileType;
}

/**
 * Gemeinsames Stream-Ergebnis für alle Dateiformate.
 */
export interface FileStreamResult {
  headers: string[];
  encoding: string;
  fileType: FileType;
  rows: AsyncGenerator<RawCsvRow, void, unknown>;
}


