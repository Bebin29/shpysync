import * as fs from "fs";
import * as iconv from "iconv-lite";
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
 * Erkennt das Encoding einer DBF-Datei.
 * 
 * @param header - DBF-Header
 * @param buffer - Datei-Buffer (für Magic Bytes)
 * @returns Encoding-Name
 */
function detectDbfEncoding(header: DbfHeader, buffer: Buffer): string {
  // Prüfe Codepage-Feld im Header (dBASE IV+)
  if (header.codepage !== undefined && header.codepage !== 0) {
    // Codepage-Mapping (vereinfacht)
    const codepageMap: Record<number, string> = {
      0x01: "cp437", // DOS USA
      0x02: "cp850", // DOS Multilingual
      0x03: "cp1252", // Windows ANSI
      0x04: "cp10000", // Mac Roman
      0x57: "cp1252", // Windows ANSI (alternative)
      0x58: "cp1252", // Windows ANSI (alternative)
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
      0x7d: "cp1255", // Windows Hebrew
      0x7e: "cp1256", // Windows Arabic
      0x7f: "cp1250", // Windows Eastern European
      0x8c: "cp1251", // Windows Cyrillic
      0x8d: "cp1253", // Windows Greek
      0x8e: "cp1254", // Windows Turkish
      0x96: "cp1257", // Windows Baltic
    };
    
    const mapped = codepageMap[header.codepage];
    if (mapped) {
      return mapped;
    }
  }
  
  // Fallback: Versuche verschiedene Encodings
  // DBF-Dateien sind meist CP1252 (Windows) oder Latin1
  const testEncodings = ["cp1252", "latin1", "utf-8"];
  
  for (const enc of testEncodings) {
    try {
      // Teste, ob Feldnamen sinnvoll decodiert werden können
      // (Feldnamen sollten druckbare ASCII/ANSI-Zeichen sein)
      const testOffset = 32; // Erste Feldbeschreibung
      if (buffer.length > testOffset + 11) {
        const testName = readNullTerminatedString(buffer, testOffset, 11, enc);
        // Prüfe, ob der Name nur druckbare Zeichen enthält
        if (/^[\x20-\x7E]+$/.test(testName) || /^[\x20-\xFF]+$/.test(testName)) {
          return enc;
        }
      }
    } catch {
      continue;
    }
  }
  
  // Standard-Fallback: CP1252 (Windows-Standard für deutsche DBF-Dateien)
  return "cp1252";
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
  
  // Encoding erkennen
  const encoding = detectDbfEncoding(header, buffer);
  
  // Feldbeschreibungen parsen
  const fields = parseDbfFields(buffer, header.headerLength, encoding);
  
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
  
  // Encoding erkennen
  const encoding = detectDbfEncoding(header, buffer);
  
  // Feldbeschreibungen parsen
  const fields = parseDbfFields(buffer, header.headerLength, encoding);
  
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

