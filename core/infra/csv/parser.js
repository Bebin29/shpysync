"use strict";
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
exports.parseCsv = parseCsv;
exports.extractRowValues = extractRowValues;
exports.convertToCsvRows = convertToCsvRows;
exports.parseCsvStream = parseCsvStream;
exports.parseCsvPreview = parseCsvPreview;
const fs = __importStar(require("fs"));
const sync_1 = require("csv-parse/sync");
const csv_parse_1 = require("csv-parse");
const iconv = __importStar(require("iconv-lite"));
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
            decode: (buf) => iconv.decode(buf, "win1252"),
        },
        {
            name: "latin1",
            decode: (buf) => iconv.decode(buf, "latin1"),
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
        }
        catch (error) {
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
    const allRecords = (0, sync_1.parse)(text, {
        delimiter: detectedDelimiter,
        skip_empty_lines: true,
        trim: true,
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
 * Extrahiert Werte aus einer CSV-Zeile basierend auf Spalten-Mapping.
 *
 * @param row - CSV-Zeile
 * @param columnMapping - Mapping von Feldnamen zu Spaltenbuchstaben (z.B. { sku: "A", name: "B" })
 * @param headers - Array von Header-Namen (in der Reihenfolge der Spalten)
 * @returns Extrahierte Werte oder null bei Fehler
 */
function extractRowValues(row, columnMapping, headers) {
    try {
        // Validiere Mapping (wird nur einmal pro CSV gemacht, aber hier für Sicherheit)
        // In der Praxis sollte validateColumnMapping vor dem Parsen aufgerufen werden
        try {
            (0, validators_js_1.validateColumnMapping)(columnMapping, headers);
        }
        catch (error) {
            // Wenn Mapping ungültig ist, geben wir null zurück (wird in unmatchedRows gesammelt)
            console.warn(`Zeile ${row.rowNumber}: Mapping-Validierungsfehler:`, error);
            return null;
        }
        // Konvertiere Spaltenbuchstaben zu Indizes
        const skuIndex = (0, normalization_js_1.columnLetterToIndex)(columnMapping.sku);
        const nameIndex = (0, normalization_js_1.columnLetterToIndex)(columnMapping.name);
        const priceIndex = (0, normalization_js_1.columnLetterToIndex)(columnMapping.price);
        const stockIndex = (0, normalization_js_1.columnLetterToIndex)(columnMapping.stock);
        // Validiere, dass genug Spalten vorhanden sind
        const maxIndex = Math.max(skuIndex, nameIndex, priceIndex, stockIndex);
        if (headers.length <= maxIndex) {
            console.warn(`Zeile ${row.rowNumber}: Nicht genug Spalten (${headers.length} vorhanden, ${maxIndex + 1} benötigt)`);
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
    }
    catch (error) {
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
                console.warn(`Zeile ${extracted.rowNumber}: Bestand nicht numerisch ('${stockStr}') – übersprungen`);
                continue;
            }
        }
        catch (error) {
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
 * Erkennt den Delimiter einer CSV-Datei anhand der ersten Zeilen.
 *
 * Analysiert die ersten Zeilen und zählt die Vorkommen von ',' und ';'.
 * Der Delimiter mit den meisten konsistenten Vorkommen wird gewählt.
 *
 * @param text - Decodierter Text der CSV-Datei (erste Zeilen)
 * @returns Erkanntes Delimiter-Zeichen (Standard: ';')
 */
function detectDelimiter(text) {
    // Analysiere die ersten 10 Zeilen (oder weniger, falls Datei kürzer)
    const lines = text.split(/\r?\n/).slice(0, 10).filter(line => line.trim().length > 0);
    if (lines.length === 0) {
        return ";"; // Fallback
    }
    let commaCount = 0;
    let semicolonCount = 0;
    let commaConsistency = 0;
    let semicolonConsistency = 0;
    const fieldCountsComma = [];
    const fieldCountsSemicolon = [];
    for (const line of lines) {
        // Zähle Delimiter, aber ignoriere die innerhalb von Anführungszeichen
        let inQuotes = false;
        let commaInLine = 0;
        let semicolonInLine = 0;
        for (let i = 0; i < line.length; i++) {
            const char = line[i];
            if (char === '"') {
                // Prüfe, ob es ein escaped Quote ist ("")
                if (i + 1 < line.length && line[i + 1] === '"') {
                    i++; // Überspringe das nächste Zeichen
                    continue;
                }
                inQuotes = !inQuotes;
            }
            else if (!inQuotes) {
                if (char === ',') {
                    commaInLine++;
                }
                else if (char === ';') {
                    semicolonInLine++;
                }
            }
        }
        commaCount += commaInLine;
        semicolonCount += semicolonInLine;
        // Anzahl der Felder = Anzahl der Delimiter + 1
        if (commaInLine > 0) {
            commaConsistency++;
            fieldCountsComma.push(commaInLine + 1);
        }
        if (semicolonInLine > 0) {
            semicolonConsistency++;
            fieldCountsSemicolon.push(semicolonInLine + 1);
        }
    }
    // Entscheidung basierend auf mehreren Kriterien:
    // 1. Konsistenz: Delimiter, der in mehr Zeilen vorkommt
    // 2. Anzahl: Delimiter mit mehr Gesamtvorkommen
    // 3. Feldanzahl-Konsistenz: Delimiter mit konsistenterer Feldanzahl pro Zeile
    if (semicolonConsistency > commaConsistency) {
        return ";";
    }
    else if (commaConsistency > semicolonConsistency) {
        return ",";
    }
    // Wenn Konsistenz gleich ist, prüfe Gesamtanzahl
    if (semicolonCount > commaCount) {
        return ";";
    }
    else if (commaCount > semicolonCount) {
        return ",";
    }
    // Wenn beide gleich sind, prüfe Feldanzahl-Konsistenz
    if (fieldCountsSemicolon.length > 0 && fieldCountsComma.length > 0) {
        const avgSemicolon = fieldCountsSemicolon.reduce((a, b) => a + b, 0) / fieldCountsSemicolon.length;
        const avgComma = fieldCountsComma.reduce((a, b) => a + b, 0) / fieldCountsComma.length;
        // Wenn eine durchschnittliche Feldanzahl konsistenter ist (kleinere Varianz)
        const varianceSemicolon = fieldCountsSemicolon.reduce((sum, val) => sum + Math.pow(val - avgSemicolon, 2), 0) / fieldCountsSemicolon.length;
        const varianceComma = fieldCountsComma.reduce((sum, val) => sum + Math.pow(val - avgComma, 2), 0) / fieldCountsComma.length;
        if (varianceSemicolon < varianceComma) {
            return ";";
        }
        else if (varianceComma < varianceSemicolon) {
            return ",";
        }
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
        }
        catch {
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
 *
 * @param filePath - Pfad zur CSV-Datei
 * @param delimiter - Trennzeichen (Standard: ';')
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
            sampleText = iconv.decode(sampleBuffer.slice(0, bytesRead), "win1252");
        }
        else if (encoding.name === "latin1") {
            sampleText = iconv.decode(sampleBuffer.slice(0, bytesRead), "latin1");
        }
        else if (encoding.name === "utf-8-sig") {
            // Entferne BOM falls vorhanden
            if (bytesRead >= 3 && sampleBuffer[0] === 0xef && sampleBuffer[1] === 0xbb && sampleBuffer[2] === 0xbf) {
                sampleText = sampleBuffer.slice(3, bytesRead).toString("utf-8");
            }
            else {
                sampleText = sampleBuffer.slice(0, bytesRead).toString("utf-8");
            }
        }
        else {
            sampleText = sampleBuffer.slice(0, bytesRead).toString("utf-8");
        }
        detectedDelimiter = detectDelimiter(sampleText);
        if (detectedDelimiter !== delimiter) {
            console.log(`CSV-Delimiter automatisch erkannt: '${detectedDelimiter}' (statt '${delimiter}')`);
        }
    }
    // Datei-Stream erstellen
    const fileStream = fs.createReadStream(filePath);
    // CSV-Parser-Stream erstellen
    const parser = (0, csv_parse_1.parse)({
        delimiter: detectedDelimiter,
        skip_empty_lines: true,
        trim: true,
    });
    // Encoding-Decoder-Stream (falls nicht UTF-8)
    let decodedStream = fileStream;
    if (encoding.name === "cp1252") {
        decodedStream = fileStream.pipe(iconv.decodeStream("win1252"));
    }
    else if (encoding.name === "latin1") {
        decodedStream = fileStream.pipe(iconv.decodeStream("latin1"));
    }
    else if (encoding.name === "utf-8-sig") {
        // UTF-8-SIG: Erste 3 Bytes (BOM) entfernen
        let bomRemoved = false;
        class RemoveBomTransform extends stream_1.Transform {
            _transform(chunk, _encoding, callback) {
                if (!bomRemoved && chunk.length >= 3) {
                    if (chunk[0] === 0xef && chunk[1] === 0xbb && chunk[2] === 0xbf) {
                        this.push(chunk.slice(3));
                        bomRemoved = true;
                    }
                    else {
                        this.push(chunk);
                        bomRemoved = true;
                    }
                }
                else {
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
            rows: (async function* () { })(), // Leerer Generator
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
 *
 * @param filePath - Pfad zur CSV-Datei
 * @param maxRows - Maximale Anzahl von Datenzeilen (Standard: 200)
 * @param delimiter - Trennzeichen (Standard: ';')
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
