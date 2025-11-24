import * as fs from "fs";
import { parse } from "csv-parse/sync";
import * as iconv from "iconv-lite";
import type { RawCsvRow, CsvRow } from "../../domain/types";

/**
 * CSV-Parser mit robuster Encoding-Erkennung.
 * 
 * Portiert von Python `_read_csv_rows()` Funktion.
 * 
 * Unterstützte Encodings (in dieser Reihenfolge):
 * - UTF-8-SIG (mit BOM)
 * - UTF-8
 * - CP1252 (Windows-1252)
 * - Latin1 (ISO-8859-1)
 * 
 * @param filePath - Pfad zur CSV-Datei
 * @param delimiter - Trennzeichen (Standard: ';')
 * @returns Parse-Ergebnis mit Rows, Headers, Encoding und totalRows
 */
export interface CsvParseResult {
  rows: RawCsvRow[];
  headers: string[];
  encoding: string;
  totalRows: number;
}

export function parseCsv(
  filePath: string,
  delimiter: string = ";"
): CsvParseResult {
  // Datei als Buffer lesen
  const raw = fs.readFileSync(filePath);

  // Encoding-Erkennung (versuche verschiedene Encodings)
  const encodings: Array<{ name: string; decode: (buf: Buffer) => string }> = [
    {
      name: "utf-8-sig",
      decode: (buf) => {
        // UTF-8-SIG: Entferne BOM (Byte Order Mark) falls vorhanden
        if (buf.length >= 3 && buf[0] === 0xef && buf[1] === 0xbb && buf[2] === 0xbf) {
          return buf.slice(3).toString("utf-8");
        }
        return buf.toString("utf-8");
      },
    },
    {
      name: "utf-8",
      decode: (buf) => buf.toString("utf-8"),
    },
    {
      name: "cp1252",
      decode: (buf) => iconv.decode(buf, "win1252"),
    },
    {
      name: "latin1",
      decode: (buf) => iconv.decode(buf, "latin1"),
    },
  ];

  let text: string | null = null;
  let usedEncoding = "utf-8";

  for (const encoding of encodings) {
    try {
      text = encoding.decode(raw);
      usedEncoding = encoding.name;
      console.log(`CSV mit Encoding '${encoding.name}' gelesen.`);
      break;
    } catch (error) {
      // Versuche nächstes Encoding
      continue;
    }
  }

  // Als letzte Rettung: UTF-8 mit Replace (keine Exception mehr)
  if (text === null) {
    text = raw.toString("utf-8").replace(/\uFFFD/g, "?"); // Ersetze ungültige Zeichen
    usedEncoding = "utf-8";
    console.warn("CSV konnte nicht sauber decodiert werden – verwende utf-8 mit 'replace'.");
  }

  // CSV parsen
  const records = parse(text, {
    delimiter,
    columns: true, // Erste Zeile als Header
    skip_empty_lines: true,
    trim: true,
  }) as Array<Record<string, string>>;

  // Headers extrahieren (erste Zeile)
  const headers = records.length > 0 ? Object.keys(records[0]) : [];

  // Rows konvertieren
  const rows: RawCsvRow[] = records.map((record, index) => ({
    rowNumber: index + 2, // +2 weil: 1 = Header, 2 = erste Datenzeile
    data: record,
  }));

  return {
    rows,
    headers,
    encoding: usedEncoding,
    totalRows: rows.length,
  };
}

/**
 * Extrahiert Werte aus einer CSV-Zeile basierend auf Spalten-Mapping.
 * 
 * @param row - CSV-Zeile
 * @param columnMapping - Mapping von Feldnamen zu Spaltenbuchstaben (z.B. { sku: "A", name: "B" })
 * @returns Extrahierte Werte
 */
export interface ColumnMapping {
  sku: string; // Spaltenbuchstabe (z.B. "A")
  name: string;
  price: string;
  stock: string;
}

export interface ExtractedRow {
  rowNumber: number;
  sku: string;
  name: string;
  price: string;
  stock: string;
  rawData: Record<string, string>;
}

export function extractRowValues(
  row: RawCsvRow,
  columnMapping: ColumnMapping,
  columnLetterToIndex: (letter: string) => number
): ExtractedRow | null {
  try {
    // Konvertiere Spaltenbuchstaben zu Indizes
    const skuIndex = columnLetterToIndex(columnMapping.sku);
    const nameIndex = columnLetterToIndex(columnMapping.name);
    const priceIndex = columnLetterToIndex(columnMapping.price);
    const stockIndex = columnLetterToIndex(columnMapping.stock);

    // Extrahiere Werte aus rawData (wenn als Array verfügbar) oder aus data
    // Da csv-parse mit columns:true arbeitet, haben wir ein Record
    // Aber für Spaltenbuchstaben-Mapping brauchen wir Indizes
    // Wir müssen die Headers verwenden, um die richtige Spalte zu finden
    
    // TODO: Dies muss angepasst werden, wenn wir Spaltenbuchstaben-Mapping haben
    // Für jetzt nehmen wir an, dass die Headers die Spaltenbuchstaben sind
    // oder wir müssen die Daten anders strukturieren
    
    // Temporäre Lösung: Verwende die Header-Namen direkt
    // Später: Konvertiere Spaltenbuchstaben zu Header-Namen
    
    const headers = Object.keys(row.data);
    if (headers.length <= Math.max(skuIndex, nameIndex, priceIndex, stockIndex)) {
      return null; // Nicht genug Spalten
    }

    const sku = (row.data[headers[skuIndex]] || "").trim();
    const name = (row.data[headers[nameIndex]] || "").trim();
    const price = (row.data[headers[priceIndex]] || "").trim();
    const stock = (row.data[headers[stockIndex]] || "").trim();

    return {
      rowNumber: row.rowNumber,
      sku,
      name,
      price,
      stock,
      rawData: row.data,
    };
  } catch (error) {
    console.error(`Fehler beim Extrahieren von Zeile ${row.rowNumber}:`, error);
    return null;
  }
}

