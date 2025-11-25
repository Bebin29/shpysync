import * as fs from "fs";
import { parse } from "csv-parse/sync";
import { parse as parseStream } from "csv-parse";
import * as iconv from "iconv-lite";
import type { RawCsvRow, CsvRow } from "../../domain/types";
import { columnLetterToIndex } from "../../utils/normalization";

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

  // CSV parsen (zuerst ohne columns, um Header-Reihenfolge zu behalten)
  const allRecords = parse(text, {
    delimiter,
    skip_empty_lines: true,
    trim: true,
  }) as string[][];

  if (allRecords.length === 0) {
    return {
      rows: [],
      headers: [],
      encoding: usedEncoding,
      totalRows: 0,
    };
  }

  // Erste Zeile als Header
  const headers = allRecords[0];
  const dataRows = allRecords.slice(1);

  // Rows konvertieren: Array zu Record (Header-Name -> Wert)
  const rows: RawCsvRow[] = dataRows.map((rowArray, index) => {
    const record: Record<string, string> = {};
    for (let i = 0; i < headers.length; i++) {
      record[headers[i]] = rowArray[i] || "";
    }
    return {
      rowNumber: index + 2, // +2 weil: 1 = Header, 2 = erste Datenzeile
      data: record,
    };
  });

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

/**
 * Extrahiert Werte aus einer CSV-Zeile basierend auf Spalten-Mapping.
 * 
 * @param row - CSV-Zeile
 * @param columnMapping - Mapping von Feldnamen zu Spaltenbuchstaben (z.B. { sku: "A", name: "B" })
 * @param headers - Array von Header-Namen (in der Reihenfolge der Spalten)
 * @returns Extrahierte Werte oder null bei Fehler
 */
export function extractRowValues(
  row: RawCsvRow,
  columnMapping: ColumnMapping,
  headers: string[]
): ExtractedRow | null {
  try {
    // Konvertiere Spaltenbuchstaben zu Indizes
    const skuIndex = columnLetterToIndex(columnMapping.sku);
    const nameIndex = columnLetterToIndex(columnMapping.name);
    const priceIndex = columnLetterToIndex(columnMapping.price);
    const stockIndex = columnLetterToIndex(columnMapping.stock);

    // Validiere, dass genug Spalten vorhanden sind
    const maxIndex = Math.max(skuIndex, nameIndex, priceIndex, stockIndex);
    if (headers.length <= maxIndex) {
      console.warn(
        `Zeile ${row.rowNumber}: Nicht genug Spalten (${headers.length} vorhanden, ${maxIndex + 1} benötigt)`
      );
      return null;
    }

    // Hole Header-Namen an den entsprechenden Indizes
    const skuHeader = headers[skuIndex];
    const nameHeader = headers[nameIndex];
    const priceHeader = headers[priceIndex];
    const stockHeader = headers[stockIndex];

    // Extrahiere Werte aus row.data (Record mit Header-Namen als Keys)
    const sku = (row.data[skuHeader] || "").trim();
    const name = (row.data[nameHeader] || "").trim();
    const price = (row.data[priceHeader] || "").trim();
    const stock = (row.data[stockHeader] || "").trim();

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

/**
 * Konvertiert extrahierte CSV-Zeilen zu CsvRow (mit validiertem Stock als Number).
 * 
 * @param extractedRows - Extrahierte Zeilen
 * @returns CsvRow-Array (mit gefilterten ungültigen Zeilen)
 */
export function convertToCsvRows(extractedRows: ExtractedRow[]): CsvRow[] {
  const csvRows: CsvRow[] = [];

  for (const extracted of extractedRows) {
    // Stock zu Number konvertieren
    let stock: number;
    try {
      const stockStr = extracted.stock.trim();
      if (stockStr === "") {
        console.warn(`Zeile ${extracted.rowNumber}: leerer Bestand – übersprungen`);
        continue;
      }
      stock = parseInt(stockStr, 10);
      if (isNaN(stock)) {
        console.warn(`Zeile ${extracted.rowNumber}: Bestand nicht numerisch ('${stockStr}') – übersprungen`);
        continue;
      }
    } catch (error) {
      console.warn(`Zeile ${extracted.rowNumber}: Fehler beim Parsen des Bestands – übersprungen: ${error}`);
      continue;
    }

    csvRows.push({
      rowNumber: extracted.rowNumber,
      sku: extracted.sku,
      name: extracted.name,
      price: extracted.price,
      stock,
      rawData: extracted.rawData,
    });
  }

  return csvRows;
}

/**
 * Erkennt das Encoding einer CSV-Datei anhand der ersten Bytes.
 * 
 * @param filePath - Pfad zur CSV-Datei
 * @returns Encoding-Name und Decode-Funktion
 */
function detectEncoding(filePath: string): {
	name: string;
	decode: (buf: Buffer) => string;
} {
	// Lese erste 1KB für Encoding-Erkennung
	const fd = fs.openSync(filePath, "r");
	const buffer = Buffer.alloc(1024);
	fs.readSync(fd, buffer, 0, 1024, 0);
	fs.closeSync(fd);

	const encodings: Array<{ name: string; decode: (buf: Buffer) => string }> = [
		{
			name: "utf-8-sig",
			decode: (buf) => {
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

	for (const encoding of encodings) {
		try {
			encoding.decode(buffer);
			return encoding;
		} catch {
			continue;
		}
	}

	// Fallback: UTF-8
	return encodings[1]; // utf-8
}

/**
 * Ergebnis-Typ für Streaming-Parser.
 */
export interface CsvStreamResult {
	headers: string[];
	encoding: string;
	rows: AsyncGenerator<RawCsvRow, void, unknown>;
}

/**
 * Parst CSV-Datei im Streaming-Modus (für große Dateien).
 * 
 * Gibt ein Objekt mit Headers, Encoding und einem AsyncIterator für Rows zurück.
 * 
 * @param filePath - Pfad zur CSV-Datei
 * @param delimiter - Trennzeichen (Standard: ';')
 * @returns Headers, Encoding und AsyncIterator für Rows
 */
export async function parseCsvStream(
	filePath: string,
	delimiter: string = ";"
): Promise<CsvStreamResult> {
	// Encoding-Erkennung
	const encoding = detectEncoding(filePath);
	console.log(`CSV mit Encoding '${encoding.name}' erkannt (Streaming-Modus).`);

	// Datei-Stream erstellen
	const fileStream = fs.createReadStream(filePath);

	// CSV-Parser-Stream erstellen
	const parser = parseStream({
		delimiter,
		skip_empty_lines: true,
		trim: true,
	});

	// Encoding-Decoder-Stream (falls nicht UTF-8)
	let decodedStream: NodeJS.ReadableStream = fileStream;
	if (encoding.name === "cp1252") {
		decodedStream = fileStream.pipe(iconv.decodeStream("win1252"));
	} else if (encoding.name === "latin1") {
		decodedStream = fileStream.pipe(iconv.decodeStream("latin1"));
	} else if (encoding.name === "utf-8-sig") {
		// UTF-8-SIG: Erste 3 Bytes (BOM) entfernen
		let bomRemoved = false;
		const removeBom = new (class extends require("stream").Transform {
			_transform(chunk: Buffer, _encoding: string, callback: () => void) {
				if (!bomRemoved && chunk.length >= 3) {
					if (chunk[0] === 0xef && chunk[1] === 0xbb && chunk[2] === 0xbf) {
						this.push(chunk.slice(3));
						bomRemoved = true;
					} else {
						this.push(chunk);
						bomRemoved = true;
					}
				} else {
					this.push(chunk);
				}
				callback();
			}
		})();
		decodedStream = fileStream.pipe(removeBom);
	}

	// Streams verbinden
	decodedStream.pipe(parser);

	// Warte auf Header (erste Zeile)
	let headers: string[] | null = null;
	const headerIterator = parser[Symbol.asyncIterator]();
	const headerRecord = await headerIterator.next();

	if (headerRecord.done || !headerRecord.value) {
		return {
			headers: [],
			encoding: encoding.name,
			rows: (async function* () {})(), // Leerer Generator
		};
	}

	headers = headerRecord.value as string[];

	// Generator-Funktion für Rows (nach Header)
	let rowNumber = 2; // Start bei 2 (1 = Header)
	async function* rowGenerator(): AsyncGenerator<RawCsvRow, void, unknown> {
		for await (const record of parser) {
			const rowArray = record as string[];

			// Datenzeile: Konvertiere zu RawCsvRow
			const rowData: Record<string, string> = {};
			for (let i = 0; i < headers!.length; i++) {
				rowData[headers![i]] = rowArray[i] || "";
			}

			yield {
				rowNumber,
				data: rowData,
			};

			rowNumber++;
		}
	}

	return {
		headers,
		encoding: encoding.name,
		rows: rowGenerator(),
	};
}

/**
 * Parst CSV-Datei im Preview-Modus (nur erste N Zeilen).
 * 
 * Optimiert für UI-Vorschau, lädt nicht die gesamte Datei.
 * 
 * @param filePath - Pfad zur CSV-Datei
 * @param maxRows - Maximale Anzahl von Datenzeilen (Standard: 200)
 * @param delimiter - Trennzeichen (Standard: ';')
 * @returns Parse-Ergebnis mit ersten N Zeilen
 */
export async function parseCsvPreview(
	filePath: string,
	maxRows: number = 200,
	delimiter: string = ";"
): Promise<CsvParseResult> {
	const rows: RawCsvRow[] = [];
	let headers: string[] | null = null;
	let encoding = "utf-8";
	let rowCount = 0;

	// Encoding-Erkennung
	const detectedEncoding = detectEncoding(filePath);
	encoding = detectedEncoding.name;

	// Streaming-Parser verwenden, aber nur maxRows Zeilen lesen
	const streamResult = await parseCsvStream(filePath, delimiter);
	headers = streamResult.headers;
	encoding = streamResult.encoding;

	for await (const row of streamResult.rows) {
		rows.push(row);
		rowCount++;

		if (rowCount >= maxRows) {
			break;
		}
	}

	return {
		rows,
		headers: headers || [],
		encoding,
		totalRows: rowCount, // Nur die Anzahl der geladenen Zeilen
	};
}

