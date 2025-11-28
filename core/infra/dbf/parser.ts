import * as fs from "fs";
import iconv from "iconv-lite";
import type { RawCsvRow } from "../../domain/types.js";
import { validateDbfFile, validateDbfHeaders } from "../../domain/validators.js";

/**
 * DBF-Parser mit robuster Encoding-Erkennung.
 * 
 * Unterstützt DBF-Dateien (dBASE III/IV Format).
 * 
 * DBF-Struktur:
 * - Header (32 Bytes): Datei-Metadaten
 * - Feldbeschreibungen (32 Bytes pro Feld): Feldname, Typ, Länge, etc.
 * - Records: Datenzeilen (1 Byte Deleted-Flag + Daten)
 * 
 * Unterstützte Encodings:
 * - CP1252 (Windows-1252) - Standard für deutsche DBF-Dateien
 * - Latin1 (ISO-8859-1)
 * - UTF-8 (selten bei DBF)
 * 
 * Encoding wird aus DBF-Header (Codepage-Feld) gelesen, falls vorhanden.
 * Fallback auf CP1252 (Windows-Standard).
 * 
 * Unterstützte Datentypen:
 * - C (Character/String)
 * - N (Numeric)
 * - D (Date)
 * - L (Logical/Boolean)
 * - M (Memo) - wird als leerer String behandelt
 */

/**
 * DBF-Header-Struktur (32 Bytes).
 */
interface DbfHeader {
  version: number; // Byte 0
  lastUpdate: { year: number; month: number; day: number }; // Bytes 1-3
  recordCount: number; // Bytes 4-7 (little-endian)
  headerLength: number; // Bytes 8-9 (little-endian)
  recordLength: number; // Bytes 10-11 (little-endian)
  codepage?: number; // Byte 29 (optional, dBASE IV+)
}

/**
 * DBF-Feldbeschreibung (32 Bytes).
 */
interface DbfField {
  name: string; // Bytes 0-10 (null-terminated)
  type: string; // Byte 11 (C, N, D, L, M, etc.)
  length: number; // Byte 16
  decimal: number; // Byte 17
}

/**
 * DBF-Parse-Ergebnis.
 */
export interface DbfParseResult {
  rows: RawCsvRow[];
  headers: string[];
  encoding: string;
  totalRows: number;
}

/**
 * DBF-Stream-Ergebnis.
 */
export interface DbfStreamResult {
  headers: string[];
  encoding: string;
  rows: AsyncGenerator<RawCsvRow, void, unknown>;
}

/**
 * Liest einen 16-bit Little-Endian Integer aus einem Buffer.
 */
function readUInt16LE(buffer: Buffer, offset: number): number {
  return buffer.readUInt16LE(offset);
}

/**
 * Liest einen 32-bit Little-Endian Integer aus einem Buffer.
 */
function readUInt32LE(buffer: Buffer, offset: number): number {
  return buffer.readUInt32LE(offset);
}

/**
 * Liest einen null-terminierten String aus einem Buffer.
 */
function readNullTerminatedString(buffer: Buffer, offset: number, maxLength: number, encoding: string): string {
  const end = Math.min(offset + maxLength, buffer.length);
  let length = 0;
  for (let i = offset; i < end; i++) {
    if (buffer[i] === 0) {
      length = i - offset;
      break;
    }
    length = end - offset;
  }
  const bytes = buffer.slice(offset, offset + length);
  return iconv.decode(bytes, encoding).trim();
}

/**
 * Konvertiert Codepage-Namen zu iconv-lite kompatible Encoding-Namen.
 * 
 * @param codepageName - Codepage-Name (z.B. "cp1252")
 * @returns iconv-lite Encoding-Name (z.B. "win1252")
 */
function normalizeEncodingName(codepageName: string): string {
  // Mapping von Codepage-Namen zu iconv-lite Namen
  const encodingMap: Record<string, string> = {
    "cp1252": "win1252",
    "cp1250": "win1250",
    "cp1251": "win1251",
    "cp1253": "win1253",
    "cp1254": "win1254",
    "cp1255": "win1255",
    "cp1256": "win1256",
    "cp1257": "win1257",
    "cp437": "cp437",
    "cp850": "cp850",
    "cp852": "cp852",
    "cp866": "cp866",
    "cp865": "cp865",
    "cp861": "cp861",
    "latin1": "latin1",
    "iso-8859-1": "latin1",
  };
  
  return encodingMap[codepageName.toLowerCase()] || codepageName;
}

/**
 * Erkennt das Encoding einer DBF-Datei durch Testen der tatsächlichen Daten.
 * 
 * @param header - DBF-Header
 * @param buffer - Datei-Buffer
 * @param fields - Feldbeschreibungen (für Daten-Test)
 * @returns Encoding-Name (iconv-lite kompatibel)
 */
function detectDbfEncoding(header: DbfHeader, buffer: Buffer, fields?: DbfField[]): string {
  // Prüfe Codepage-Feld im Header (dBASE IV+)
  if (header.codepage !== undefined && header.codepage !== 0) {
    // Codepage-Mapping (vereinfacht)
    const codepageMap: Record<number, string> = {
      0x01: "cp437", // DOS USA
      0x02: "cp850", // DOS Multilingual (häufig in deutschen DBF-Dateien)
      0x03: "win1252", // Windows ANSI (iconv-lite Name)
      0x04: "cp10000", // Mac Roman
      0x57: "win1252", // Windows ANSI (alternative)
      0x58: "win1252", // Windows ANSI (alternative)
      0x64: "cp852", // DOS Eastern European
      0x65: "cp866", // DOS Russian
      0x66: "cp865", // DOS Nordic
      0x67: "cp861", // DOS Icelandic
      0x68: "cp895", // DOS Kamenicky
      0x69: "cp620", // DOS Mazovia
      0x6a: "cp737", // DOS Greek
      0x6b: "cp857", // DOS Turkish
      0x78: "cp950", // Windows Traditional Chinese
      0x79: "cp949", // Windows Korean
      0x7a: "cp936", // Windows Simplified Chinese
      0x7b: "cp932", // Windows Japanese
      0x7c: "cp874", // Windows Thai
      0x7d: "win1255", // Windows Hebrew
      0x7e: "win1256", // Windows Arabic
      0x7f: "win1250", // Windows Eastern European
      0x8c: "win1251", // Windows Cyrillic
      0x8d: "win1253", // Windows Greek
      0x8e: "win1254", // Windows Turkish
      0x96: "win1257", // Windows Baltic
    };
    
    const mapped = codepageMap[header.codepage];
    if (mapped) {
      const normalized = normalizeEncodingName(mapped);
      console.log(`[DBF] Encoding aus Codepage-Feld erkannt: ${header.codepage} (0x${header.codepage.toString(16)}) → ${normalized}`);
      return normalized;
    } else {
      console.log(`[DBF] Unbekannte Codepage im Header: ${header.codepage} (0x${header.codepage.toString(16)})`);
    }
  }
  
  // Fallback: Versuche verschiedene Encodings durch Testen der Daten
  // Priorität: cp850 (häufig in deutschen DBF-Dateien), dann win1252, dann latin1
  const testEncodings = ["cp850", "win1252", "latin1", "cp437", "cp852"];
  
  // Wenn Felder vorhanden sind, teste mit echten Datenwerten
  if (fields && fields.length > 0 && header.recordCount > 0) {
    const recordOffset = header.headerLength;
    if (recordOffset + header.recordLength <= buffer.length) {
      // Teste mit dem ersten Record
      for (const enc of testEncodings) {
        try {
          let isValid = true;
          let fieldOffset = recordOffset + 1; // Nach Deleted-Flag
          
          // Teste die ersten 3 Felder (oder alle, wenn weniger vorhanden)
          const fieldsToTest = Math.min(3, fields.length);
          for (let i = 0; i < fieldsToTest; i++) {
            const field = fields[i];
            if (fieldOffset + field.length > buffer.length) {
              isValid = false;
              break;
            }
            
            const fieldData = buffer.slice(fieldOffset, fieldOffset + field.length);
            if (field.type === "C") {
              // Teste Character-Feld
              const decoded = iconv.decode(fieldData, enc).trim();
              // Prüfe, ob das Ergebnis sinnvoll aussieht (keine zu vielen Steuerzeichen)
              const controlChars = (decoded.match(/[\x00-\x1F]/g) || []).length;
              if (controlChars > decoded.length * 0.1) {
                // Zu viele Steuerzeichen = wahrscheinlich falsches Encoding
                isValid = false;
                break;
              }
            }
            
            fieldOffset += field.length;
          }
          
          if (isValid) {
            console.log(`[DBF] Encoding durch Daten-Test erkannt: ${enc}`);
            return enc;
          }
        } catch (error) {
          // Encoding nicht unterstützt oder Fehler beim Decodieren
          continue;
        }
      }
    }
  }
  
  // Fallback: Teste nur Feldnamen
  for (const enc of testEncodings) {
    try {
      // Teste, ob Feldnamen sinnvoll decodiert werden können
      const testOffset = 32; // Erste Feldbeschreibung
      if (buffer.length > testOffset + 11) {
        const testName = readNullTerminatedString(buffer, testOffset, 11, enc);
        // Prüfe, ob der Name nur druckbare Zeichen enthält
        if (/^[\x20-\x7E]+$/.test(testName) || /^[\x20-\xFF]+$/.test(testName)) {
          console.log(`[DBF] Encoding durch Feldnamen-Test erkannt: ${enc}`);
          return enc;
        }
      }
    } catch {
      continue;
    }
  }
  
  // Standard-Fallback: cp850 (häufig in deutschen DBF-Dateien)
  console.log(`[DBF] Encoding-Fallback verwendet: cp850`);
  return "cp850";
}

/**
 * Parst den DBF-Header.
 */
function parseDbfHeader(buffer: Buffer): DbfHeader {
  if (buffer.length < 32) {
    throw new Error("DBF-Datei zu klein für Header");
  }
  
  const version = buffer[0];
  const year = 1900 + buffer[1];
  const month = buffer[2];
  const day = buffer[3];
  const recordCount = readUInt32LE(buffer, 4);
  const headerLength = readUInt16LE(buffer, 8);
  const recordLength = readUInt16LE(buffer, 10);
  const codepage = buffer.length > 29 ? buffer[29] : undefined;
  
  return {
    version,
    lastUpdate: { year, month, day },
    recordCount,
    headerLength,
    recordLength,
    codepage,
  };
}

/**
 * Parst Feldbeschreibungen aus dem DBF-Header.
 */
function parseDbfFields(buffer: Buffer, headerLength: number, encoding: string): DbfField[] {
  const fields: DbfField[] = [];
  let offset = 32; // Nach Header-Bytes
  
  // Feldbeschreibungen bis zum Terminator (0x0D)
  while (offset < headerLength - 1) {
    if (buffer[offset] === 0x0D) {
      break; // Header-Terminator
    }
    
    if (offset + 32 > buffer.length) {
      break; // Nicht genug Daten
    }
    
    const name = readNullTerminatedString(buffer, offset, 11, encoding);
    const type = String.fromCharCode(buffer[offset + 11]);
    const length = buffer[offset + 16];
    const decimal = buffer[offset + 17];
    
    fields.push({ name, type, length, decimal });
    offset += 32;
  }
  
  return fields;
}

/**
 * Konvertiert einen DBF-Feldwert zu einem String.
 */
function convertDbfFieldValue(
  buffer: Buffer,
  offset: number,
  field: DbfField,
  encoding: string
): string {
  const fieldData = buffer.slice(offset, offset + field.length);
  
  switch (field.type) {
    case "C": // Character
      return iconv.decode(fieldData, encoding).trim();
    
    case "N": // Numeric
      const numericStr = iconv.decode(fieldData, encoding).trim();
      // Entferne führende Nullen, behalte Dezimalpunkt
      return numericStr || "0";
    
    case "D": // Date (YYYYMMDD)
      const dateStr = iconv.decode(fieldData, encoding).trim();
      if (dateStr.length === 8) {
        // Konvertiere YYYYMMDD zu DD.MM.YYYY
        const year = dateStr.substring(0, 4);
        const month = dateStr.substring(4, 6);
        const day = dateStr.substring(6, 8);
        return `${day}.${month}.${year}`;
      }
      return dateStr;
    
    case "L": // Logical (T/t/Y/y = true, F/f/N/n = false)
      const logicalChar = String.fromCharCode(fieldData[0] || 0).toUpperCase();
      return logicalChar === "T" || logicalChar === "Y" ? "TRUE" : "FALSE";
    
    case "M": // Memo (wird als leerer String behandelt)
      return "";
    
    default:
      // Unbekannter Typ: als String behandeln
      return iconv.decode(fieldData, encoding).trim();
  }
}

/**
 * Parst eine DBF-Datei vollständig.
 * 
 * @param filePath - Pfad zur DBF-Datei
 * @returns Parse-Ergebnis
 */
export function parseDbf(filePath: string): DbfParseResult {
  // Validiere Datei
  validateDbfFile(filePath);
  
  // Datei als Buffer lesen
  const buffer = fs.readFileSync(filePath);
  
  if (buffer.length < 32) {
    throw new Error("DBF-Datei zu klein");
  }
  
  // Header parsen
  const header = parseDbfHeader(buffer);
  
  // Feldbeschreibungen vorläufig parsen (mit Standard-Encoding für Feldnamen)
  // Feldnamen sind meist ASCII-kompatibel, daher verwenden wir win1252 für erste Parsing
  const fields = parseDbfFields(buffer, header.headerLength, "win1252");
  
  // Encoding erkennen (mit Feldinformationen für bessere Erkennung)
  const encoding = detectDbfEncoding(header, buffer, fields);
  
  // Wenn Encoding anders ist, Feldnamen erneut parsen
  if (encoding !== "win1252") {
    const fieldsReencoded = parseDbfFields(buffer, header.headerLength, encoding);
    // Aktualisiere Feldnamen mit korrektem Encoding
    for (let i = 0; i < fields.length && i < fieldsReencoded.length; i++) {
      fields[i].name = fieldsReencoded[i].name;
    }
  }
  
  if (fields.length === 0) {
    return {
      rows: [],
      headers: [],
      encoding,
      totalRows: 0,
    };
  }
  
  // Headers extrahieren
  const headers = fields.map((f) => f.name);
  
  // Validiere Header
  validateDbfHeaders(headers);
  
  // Records parsen
  const rows: RawCsvRow[] = [];
  let recordOffset = header.headerLength;
  let rowNumber = 1; // DBF hat keine Header-Zeile, erste Zeile ist Daten
  
  for (let i = 0; i < header.recordCount && recordOffset < buffer.length; i++) {
    // Prüfe Deleted-Flag (erstes Byte)
    const deletedFlag = buffer[recordOffset];
    if (deletedFlag === 0x2A) {
      // Record ist gelöscht, überspringe
      recordOffset += header.recordLength;
      continue;
    }
    
    // Parse Record
    const recordData: Record<string, string> = {};
    let fieldOffset = recordOffset + 1; // Nach Deleted-Flag
    
    for (const field of fields) {
      if (fieldOffset + field.length > buffer.length) {
        break; // Nicht genug Daten
      }
      
      const value = convertDbfFieldValue(buffer, fieldOffset, field, encoding);
      recordData[field.name] = value;
      fieldOffset += field.length;
    }
    
    rows.push({
      rowNumber,
      data: recordData,
    });
    
    rowNumber++;
    recordOffset += header.recordLength;
  }
  
  return {
    rows,
    headers,
    encoding,
    totalRows: rows.length,
  };
}

/**
 * Parst eine DBF-Datei im Streaming-Modus (für große Dateien).
 * 
 * @param filePath - Pfad zur DBF-Datei
 * @returns Headers, Encoding und AsyncIterator für Rows
 */
export async function parseDbfStream(filePath: string): Promise<DbfStreamResult> {
  // Validiere Datei
  validateDbfFile(filePath);
  
  // Datei als Buffer lesen (für Header und Feldbeschreibungen)
  // Für sehr große Dateien könnte man hier optimieren, aber DBF-Header ist immer klein
  const buffer = fs.readFileSync(filePath);
  
  if (buffer.length < 32) {
    throw new Error("DBF-Datei zu klein");
  }
  
  // Header parsen
  const header = parseDbfHeader(buffer);
  
  // Feldbeschreibungen vorläufig parsen (mit Standard-Encoding für Feldnamen)
  const fields = parseDbfFields(buffer, header.headerLength, "win1252");
  
  // Encoding erkennen (mit Feldinformationen für bessere Erkennung)
  const encoding = detectDbfEncoding(header, buffer, fields);
  
  // Wenn Encoding anders ist, Feldnamen erneut parsen
  if (encoding !== "win1252") {
    const fieldsReencoded = parseDbfFields(buffer, header.headerLength, encoding);
    // Aktualisiere Feldnamen mit korrektem Encoding
    for (let i = 0; i < fields.length && i < fieldsReencoded.length; i++) {
      fields[i].name = fieldsReencoded[i].name;
    }
  }
  
  if (fields.length === 0) {
    return {
      headers: [],
      encoding,
      rows: (async function* () {})(), // Leerer Generator
    };
  }
  
  // Headers extrahieren
  const headers = fields.map((f) => f.name);
  
  // Validiere Header
  validateDbfHeaders(headers);
  
  // Generator-Funktion für Rows
  let recordOffset = header.headerLength;
  let rowNumber = 1;
  
  async function* rowGenerator(): AsyncGenerator<RawCsvRow, void, unknown> {
    for (let i = 0; i < header.recordCount && recordOffset < buffer.length; i++) {
      // Prüfe Deleted-Flag
      const deletedFlag = buffer[recordOffset];
      if (deletedFlag === 0x2A) {
        // Record ist gelöscht, überspringe
        recordOffset += header.recordLength;
        continue;
      }
      
      // Parse Record
      const recordData: Record<string, string> = {};
      let fieldOffset = recordOffset + 1; // Nach Deleted-Flag
      
      for (const field of fields) {
        if (fieldOffset + field.length > buffer.length) {
          break; // Nicht genug Daten
        }
        
        const value = convertDbfFieldValue(buffer, fieldOffset, field, encoding);
        recordData[field.name] = value;
        fieldOffset += field.length;
      }
      
      yield {
        rowNumber,
        data: recordData,
      };
      
      rowNumber++;
      recordOffset += header.recordLength;
    }
  }
  
  return {
    headers,
    encoding,
    rows: rowGenerator(),
  };
}

/**
 * Parst eine DBF-Datei im Preview-Modus (nur erste N Zeilen).
 * 
 * @param filePath - Pfad zur DBF-Datei
 * @param maxRows - Maximale Anzahl von Datenzeilen (Standard: 200)
 * @returns Parse-Ergebnis mit ersten N Zeilen
 */
export async function parseDbfPreview(
  filePath: string,
  maxRows: number = 200
): Promise<DbfParseResult> {
  // Validiere Datei
  validateDbfFile(filePath);
  
  const rows: RawCsvRow[] = [];
  let headers: string[] = [];
  let encoding = "cp1252";
  let rowCount = 0;
  
  // Streaming-Parser verwenden, aber nur maxRows Zeilen lesen
  const streamResult = await parseDbfStream(filePath);
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
    headers,
    encoding,
    totalRows: rowCount, // Nur die Anzahl der geladenen Zeilen
  };
}

