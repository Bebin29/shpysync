"use strict";
var __createBinding =
  (this && this.__createBinding) ||
  (Object.create
    ? function (o, m, k, k2) {
        if (k2 === undefined) k2 = k;
        var desc = Object.getOwnPropertyDescriptor(m, k);
        if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
          desc = {
            enumerable: true,
            get: function () {
              return m[k];
            },
          };
        }
        Object.defineProperty(o, k2, desc);
      }
    : function (o, m, k, k2) {
        if (k2 === undefined) k2 = k;
        o[k2] = m[k];
      });
var __setModuleDefault =
  (this && this.__setModuleDefault) ||
  (Object.create
    ? function (o, v) {
        Object.defineProperty(o, "default", { enumerable: true, value: v });
      }
    : function (o, v) {
        o["default"] = v;
      });
var __importStar =
  (this && this.__importStar) ||
  (function () {
    var ownKeys = function (o) {
      ownKeys =
        Object.getOwnPropertyNames ||
        function (o) {
          var ar = [];
          for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
          return ar;
        };
      return ownKeys(o);
    };
    return function (mod) {
      if (mod && mod.__esModule) return mod;
      var result = {};
      if (mod != null)
        for (var k = ownKeys(mod), i = 0; i < k.length; i++)
          if (k[i] !== "default") __createBinding(result, mod, k[i]);
      __setModuleDefault(result, mod);
      return result;
    };
  })();
var __importDefault =
  (this && this.__importDefault) ||
  function (mod) {
    return mod && mod.__esModule ? mod : { default: mod };
  };
Object.defineProperty(exports, "__esModule", { value: true });
exports.parseCsv = parseCsv;
exports.extractRowValues = extractRowValues;
exports.convertToCsvRows = convertToCsvRows;
exports.parseCsvStream = parseCsvStream;
exports.parseCsvPreview = parseCsvPreview;
const fs = __importStar(require("fs"));
const sync_1 = require("csv-parse/sync");
const csv_parse_1 = require("csv-parse");
const iconv_lite_1 = __importDefault(require("iconv-lite"));
const stream_1 = require("stream");
const normalization_js_1 = require("../../utils/normalization.js");
const validators_js_1 = require("../../domain/validators.js");
function parseCsv(filePath, delimiter = ";") {
  // Validiere Datei
  (0, validators_js_1.validateCsvFile)(filePath);
  // Datei als Buffer lesen
  const raw = fs.readFileSync(filePath);
  // Encoding-Erkennung (versuche verschiedene Encodings)
  const encodings = [
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
      decode: (buf) => iconv_lite_1.default.decode(buf, "win1252"),
    },
    {
      name: "latin1",
      decode: (buf) => iconv_lite_1.default.decode(buf, "latin1"),
    },
  ];
  let text = null;
  let usedEncoding = "utf-8";
  for (const encoding of encodings) {
    try {
      text = encoding.decode(raw);
      usedEncoding = encoding.name;
      console.log(`CSV mit Encoding '${encoding.name}' gelesen.`);
      break;
    } catch {
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
  // Delimiter automatisch erkennen, falls nicht explizit angegeben
  const detectedDelimiter = delimiter === ";" && text ? detectDelimiter(text) : delimiter;
  if (detectedDelimiter !== delimiter) {
    console.log(`CSV-Delimiter automatisch erkannt: '${detectedDelimiter}' (statt '${delimiter}')`);
  }
  // CSV parsen (zuerst ohne columns, um Header-Reihenfolge zu behalten)
  // Konfiguration für robuste Quote-Behandlung:
  // - quote: '"' - Felder können in Anführungszeichen eingeschlossen sein
  // - escape: '"' - Escaped Quotes werden als "" dargestellt
  // - relax_quotes: true - Erlaubt unescaped Quotes in Feldern (für Kompatibilität)
  // - trim: true - Entfernt Whitespace, aber nicht die Quotes selbst (csv-parse entfernt Quotes automatisch)
  const allRecords = (0, sync_1.parse)(text, {
    delimiter: detectedDelimiter,
    skip_empty_lines: true,
    trim: true, // Trimmt Whitespace, csv-parse entfernt Quotes automatisch
    relax_column_count: true, // Erlaubt unterschiedliche Spaltenanzahlen pro Zeile
    relax_quotes: true, // Erlaubt unescaped Quotes in Feldern (für Kompatibilität mit fehlerhaften CSVs)
    escape: '"', // Escape-Zeichen für Quotes ("" = ein einzelnes ")
    quote: '"', // Quote-Zeichen für Felder mit Delimitern/Newlines
    bom: false, // BOM wird bereits manuell behandelt
  });
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
  // Validiere Header
  (0, validators_js_1.validateCsvHeaders)(headers);
  const dataRows = allRecords.slice(1);
  // Rows konvertieren: Array zu Record (Header-Name -> Wert)
  const rows = dataRows.map((rowArray, index) => {
    const record = {};
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
 * Prüft, ob ein String ein Spaltenbuchstabe ist (für CSV).
 *
 * @param str - String zum Prüfen
 * @returns true, wenn es ein Spaltenbuchstabe ist (z.B. "A", "B", "AB")
 */
function isColumnLetter(str) {
  const upper = str.trim().toUpperCase();
  if (upper.length === 0) {
    return false;
  }
  // Prüfe, ob alle Zeichen Buchstaben sind (A-Z)
  return /^[A-Z]+$/.test(upper);
}
/**
 * Extrahiert Werte aus einer CSV/DBF-Zeile basierend auf Spalten-Mapping.
 *
 * Unterstützt sowohl:
 * - CSV: Spaltenbuchstaben (z.B. { sku: "A", name: "B" })
 * - DBF: Feldnamen (z.B. { sku: "ARTNR", name: "BEZEICHNUNG" })
 *
 * @param row - CSV/DBF-Zeile
 * @param columnMapping - Mapping von Feldnamen zu Spaltenbuchstaben (CSV) oder Feldnamen (DBF)
 * @param headers - Array von Header-Namen (in der Reihenfolge der Spalten)
 * @returns Extrahierte Werte oder null bei Fehler
 */
function extractRowValues(row, columnMapping, headers) {
  try {
    // Prüfe, ob Mapping Spaltenbuchstaben (CSV) oder Feldnamen (DBF) verwendet
    const isCsvMapping = isColumnLetter(columnMapping.sku);
    let skuHeader;
    let nameHeader;
    let priceHeader;
    let stockHeader;
    if (isCsvMapping) {
      // CSV: Konvertiere Spaltenbuchstaben zu Indizes
      try {
        (0, validators_js_1.validateColumnMapping)(columnMapping, headers);
      } catch (error) {
        console.warn(`Zeile ${row.rowNumber}: Mapping-Validierungsfehler:`, error);
        return null;
      }
      const skuIndex = (0, normalization_js_1.columnLetterToIndex)(columnMapping.sku);
      const nameIndex = (0, normalization_js_1.columnLetterToIndex)(columnMapping.name);
      const priceIndex = (0, normalization_js_1.columnLetterToIndex)(columnMapping.price);
      const stockIndex = (0, normalization_js_1.columnLetterToIndex)(columnMapping.stock);
      // Validiere, dass genug Spalten vorhanden sind
      const maxIndex = Math.max(skuIndex, nameIndex, priceIndex, stockIndex);
      if (headers.length <= maxIndex) {
        console.warn(
          `Zeile ${row.rowNumber}: Nicht genug Spalten (${headers.length} vorhanden, ${maxIndex + 1} benötigt)`
        );
        return null;
      }
      // Hole Header-Namen an den entsprechenden Indizes
      skuHeader = headers[skuIndex];
      nameHeader = headers[nameIndex];
      priceHeader = headers[priceIndex];
      stockHeader = headers[stockIndex];
    } else {
      // DBF: Verwende Feldnamen direkt
      skuHeader = columnMapping.sku.trim();
      nameHeader = columnMapping.name.trim();
      priceHeader = columnMapping.price.trim();
      stockHeader = columnMapping.stock.trim();
      // Validiere, dass alle Feldnamen in Headers vorhanden sind
      const missingFields = [];
      if (!headers.includes(skuHeader)) missingFields.push(skuHeader);
      if (!headers.includes(nameHeader)) missingFields.push(nameHeader);
      if (!headers.includes(priceHeader)) missingFields.push(priceHeader);
      if (!headers.includes(stockHeader)) missingFields.push(stockHeader);
      if (missingFields.length > 0) {
        console.warn(
          `Zeile ${row.rowNumber}: Feldnamen nicht gefunden: ${missingFields.join(", ")}`
        );
        return null;
      }
    }
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
function convertToCsvRows(extractedRows) {
  const csvRows = [];
  for (const extracted of extractedRows) {
    // Stock zu Number konvertieren
    let stock;
    try {
      const stockStr = extracted.stock.trim();
      if (stockStr === "") {
        console.warn(`Zeile ${extracted.rowNumber}: leerer Bestand – übersprungen`);
        continue;
      }
      stock = parseInt(stockStr, 10);
      if (isNaN(stock)) {
        console.warn(
          `Zeile ${extracted.rowNumber}: Bestand nicht numerisch ('${stockStr}') – übersprungen`
        );
        continue;
      }
    } catch (error) {
      console.warn(
        `Zeile ${extracted.rowNumber}: Fehler beim Parsen des Bestands – übersprungen: ${error}`
      );
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
 * Erkennt den Delimiter einer CSV-Datei anhand der ersten Zeilen.
 *
 * Analysiert die ersten Zeilen und zählt die Vorkommen verschiedener Delimiter.
 * Unterstützt: Semikolon (;), Komma (,), Tab (\t), Pipe (|), Tabulator-ähnliche Zeichen.
 * Der Delimiter mit den meisten konsistenten Vorkommen wird gewählt.
 *
 * @param text - Decodierter Text der CSV-Datei (erste Zeilen)
 * @returns Erkanntes Delimiter-Zeichen (Standard: ';')
 */
function detectDelimiter(text) {
  // Analysiere die ersten 10 Zeilen (oder weniger, falls Datei kürzer)
  const lines = text
    .split(/\r?\n/)
    .slice(0, 10)
    .filter((line) => line.trim().length > 0);
  if (lines.length === 0) {
    return ";"; // Fallback
  }
  // Unterstützte Delimiter mit Priorität (häufigste zuerst)
  const delimiters = [
    { char: ";", name: "semicolon" },
    { char: ",", name: "comma" },
    { char: "\t", name: "tab" },
    { char: "|", name: "pipe" },
  ];
  // Statistiken für jeden Delimiter
  const stats = delimiters.map((d) => ({
    char: d.char,
    name: d.name,
    totalCount: 0,
    consistency: 0,
    fieldCounts: [],
  }));
  for (const line of lines) {
    // Zähle Delimiter, aber ignoriere die innerhalb von Anführungszeichen
    let inQuotes = false;
    const delimiterCounts = new Map();
    // Initialisiere Zähler für alle Delimiter
    for (const delim of delimiters) {
      delimiterCounts.set(delim.char, 0);
    }
    for (let i = 0; i < line.length; i++) {
      const char = line[i];
      if (char === '"') {
        // Prüfe, ob es ein escaped Quote ist ("")
        if (i + 1 < line.length && line[i + 1] === '"') {
          i++; // Überspringe das nächste Zeichen
          continue;
        }
        inQuotes = !inQuotes;
      } else if (!inQuotes) {
        // Zähle alle unterstützten Delimiter
        for (const delim of delimiters) {
          if (char === delim.char) {
            delimiterCounts.set(delim.char, (delimiterCounts.get(delim.char) || 0) + 1);
          }
        }
      }
    }
    // Aktualisiere Statistiken
    for (let i = 0; i < stats.length; i++) {
      const count = delimiterCounts.get(delimiters[i].char) || 0;
      stats[i].totalCount += count;
      if (count > 0) {
        stats[i].consistency++;
        stats[i].fieldCounts.push(count + 1); // Anzahl der Felder = Delimiter + 1
      }
    }
  }
  // Finde den besten Delimiter basierend auf mehreren Kriterien:
  // 1. Konsistenz: Delimiter, der in mehr Zeilen vorkommt
  // 2. Gesamtanzahl: Delimiter mit mehr Gesamtvorkommen
  // 3. Feldanzahl-Konsistenz: Delimiter mit konsistenterer Feldanzahl pro Zeile
  // Sortiere nach Konsistenz (höchste zuerst)
  stats.sort((a, b) => {
    // Primär: Konsistenz
    if (b.consistency !== a.consistency) {
      return b.consistency - a.consistency;
    }
    // Sekundär: Gesamtanzahl
    if (b.totalCount !== a.totalCount) {
      return b.totalCount - a.totalCount;
    }
    // Tertiär: Feldanzahl-Konsistenz (kleinere Varianz = besser)
    if (a.fieldCounts.length > 0 && b.fieldCounts.length > 0) {
      const avgA = a.fieldCounts.reduce((sum, val) => sum + val, 0) / a.fieldCounts.length;
      const avgB = b.fieldCounts.reduce((sum, val) => sum + val, 0) / b.fieldCounts.length;
      const varianceA =
        a.fieldCounts.reduce((sum, val) => sum + Math.pow(val - avgA, 2), 0) / a.fieldCounts.length;
      const varianceB =
        b.fieldCounts.reduce((sum, val) => sum + Math.pow(val - avgB, 2), 0) / b.fieldCounts.length;
      return varianceA - varianceB;
    }
    return 0;
  });
  // Wenn ein Delimiter in mindestens einer Zeile vorkommt, verwende ihn
  const bestDelimiter = stats.find((s) => s.consistency > 0);
  if (bestDelimiter) {
    console.log(
      `Delimiter-Erkennung: '${bestDelimiter.name}' (${bestDelimiter.consistency} von ${lines.length} Zeilen, ${bestDelimiter.totalCount} Vorkommen)`
    );
    return bestDelimiter.char;
  }
  // Fallback: Standard ist Semikolon (deutsche CSV-Konvention)
  return ";";
}
/**
 * Erkennt das Encoding einer CSV-Datei anhand der ersten Bytes.
 *
 * @param filePath - Pfad zur CSV-Datei
 * @returns Encoding-Name und Decode-Funktion
 */
function detectEncoding(filePath) {
  // Lese erste 1KB für Encoding-Erkennung
  const fd = fs.openSync(filePath, "r");
  const buffer = Buffer.alloc(1024);
  fs.readSync(fd, buffer, 0, 1024, 0);
  fs.closeSync(fd);
  const encodings = [
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
      decode: (buf) => iconv_lite_1.default.decode(buf, "win1252"),
    },
    {
      name: "latin1",
      decode: (buf) => iconv_lite_1.default.decode(buf, "latin1"),
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
 * Parst CSV-Datei im Streaming-Modus (für große Dateien).
 *
 * Gibt ein Objekt mit Headers, Encoding und einem AsyncIterator für Rows zurück.
 * Unterstützt automatische Delimiter-Erkennung (Semikolon, Komma, Tab, Pipe).
 *
 * @param filePath - Pfad zur CSV-Datei
 * @param delimiter - Trennzeichen (Standard: ';', automatische Erkennung wenn ';' verwendet wird)
 * @returns Headers, Encoding und AsyncIterator für Rows
 */
async function parseCsvStream(filePath, delimiter = ";") {
  // Validiere Datei
  (0, validators_js_1.validateCsvFile)(filePath);
  // Encoding-Erkennung
  const encoding = detectEncoding(filePath);
  console.log(`CSV mit Encoding '${encoding.name}' erkannt (Streaming-Modus).`);
  // Delimiter automatisch erkennen (nur wenn Standard-Delimiter verwendet wird)
  let detectedDelimiter = delimiter;
  if (delimiter === ";") {
    // Lese erste Zeilen für Delimiter-Erkennung
    const sampleBuffer = Buffer.alloc(8192); // 8KB Sample
    const fd = fs.openSync(filePath, "r");
    const bytesRead = fs.readSync(fd, sampleBuffer, 0, 8192, 0);
    fs.closeSync(fd);
    // Decodiere Sample
    let sampleText;
    if (encoding.name === "cp1252") {
      sampleText = iconv_lite_1.default.decode(sampleBuffer.slice(0, bytesRead), "win1252");
    } else if (encoding.name === "latin1") {
      sampleText = iconv_lite_1.default.decode(sampleBuffer.slice(0, bytesRead), "latin1");
    } else if (encoding.name === "utf-8-sig") {
      // Entferne BOM falls vorhanden
      if (
        bytesRead >= 3 &&
        sampleBuffer[0] === 0xef &&
        sampleBuffer[1] === 0xbb &&
        sampleBuffer[2] === 0xbf
      ) {
        sampleText = sampleBuffer.slice(3, bytesRead).toString("utf-8");
      } else {
        sampleText = sampleBuffer.slice(0, bytesRead).toString("utf-8");
      }
    } else {
      sampleText = sampleBuffer.slice(0, bytesRead).toString("utf-8");
    }
    detectedDelimiter = detectDelimiter(sampleText);
    if (detectedDelimiter !== delimiter) {
      console.log(
        `CSV-Delimiter automatisch erkannt: '${detectedDelimiter}' (statt '${delimiter}')`
      );
    }
  }
  // Datei-Stream erstellen
  const fileStream = fs.createReadStream(filePath);
  // CSV-Parser-Stream erstellen
  // Konfiguration für robuste Quote-Behandlung (siehe parseCsv für Details)
  const parser = (0, csv_parse_1.parse)({
    delimiter: detectedDelimiter,
    skip_empty_lines: true,
    trim: true, // Trimmt Whitespace, csv-parse entfernt Quotes automatisch
    relax_column_count: true, // Erlaubt unterschiedliche Spaltenanzahlen pro Zeile
    relax_quotes: true, // Erlaubt unescaped Quotes in Feldern (für Kompatibilität)
    escape: '"', // Escape-Zeichen für Quotes ("" = ein einzelnes ")
    quote: '"', // Quote-Zeichen für Felder mit Delimitern/Newlines
    bom: false, // BOM wird bereits manuell behandelt
  });
  // Encoding-Decoder-Stream (falls nicht UTF-8)
  let decodedStream = fileStream;
  if (encoding.name === "cp1252") {
    decodedStream = fileStream.pipe(iconv_lite_1.default.decodeStream("win1252"));
  } else if (encoding.name === "latin1") {
    decodedStream = fileStream.pipe(iconv_lite_1.default.decodeStream("latin1"));
  } else if (encoding.name === "utf-8-sig") {
    // UTF-8-SIG: Erste 3 Bytes (BOM) entfernen
    let bomRemoved = false;
    class RemoveBomTransform extends stream_1.Transform {
      _transform(chunk, _encoding, callback) {
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
    }
    const removeBom = new RemoveBomTransform();
    decodedStream = fileStream.pipe(removeBom);
  }
  // Streams verbinden
  decodedStream.pipe(parser);
  // Warte auf Header (erste Zeile)
  let headers = null;
  const headerIterator = parser[Symbol.asyncIterator]();
  const headerRecord = await headerIterator.next();
  if (headerRecord.done || !headerRecord.value) {
    return {
      headers: [],
      encoding: encoding.name,
      rows: (async function* () {})(), // Leerer Generator
    };
  }
  headers = headerRecord.value;
  // Validiere Header
  (0, validators_js_1.validateCsvHeaders)(headers);
  // Generator-Funktion für Rows (nach Header)
  let rowNumber = 2; // Start bei 2 (1 = Header)
  async function* rowGenerator() {
    for await (const record of parser) {
      const rowArray = record;
      // Datenzeile: Konvertiere zu RawCsvRow
      const rowData = {};
      for (let i = 0; i < headers.length; i++) {
        rowData[headers[i]] = rowArray[i] || "";
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
 * Unterstützt automatische Delimiter-Erkennung (Semikolon, Komma, Tab, Pipe).
 *
 * @param filePath - Pfad zur CSV-Datei
 * @param maxRows - Maximale Anzahl von Datenzeilen (Standard: 200)
 * @param delimiter - Trennzeichen (Standard: ';', automatische Erkennung wenn ';' verwendet wird)
 * @returns Parse-Ergebnis mit ersten N Zeilen
 */
async function parseCsvPreview(filePath, maxRows = 200, delimiter = ";") {
  // Validiere Datei
  (0, validators_js_1.validateCsvFile)(filePath);
  const rows = [];
  let headers = null;
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
