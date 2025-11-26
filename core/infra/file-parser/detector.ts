/**
 * Dateityp-Erkennung für Dateiformate.
 */

import * as path from "path";
import * as fs from "fs";
import type { FileType } from "../../domain/validators.js";

/**
 * Erkennt den Dateityp basierend auf der Dateiendung.
 * 
 * @param filePath - Pfad zur Datei
 * @returns Erkanntes Dateiformat
 */
export function detectFileTypeByExtension(filePath: string): FileType {
  const ext = path.extname(filePath).toLowerCase();
  if (ext === ".dbf") {
    return "dbf";
  }
  return "csv"; // Default
}

/**
 * Erkennt den Dateityp basierend auf Magic Bytes (Dateiinhalt).
 * 
 * @param filePath - Pfad zur Datei
 * @returns Erkanntes Dateiformat oder null, falls nicht erkannt
 */
export function detectFileTypeByMagicBytes(filePath: string): FileType | null {
  try {
    const buffer = Buffer.alloc(4);
    const fd = fs.openSync(filePath, "r");
    fs.readSync(fd, buffer, 0, 4, 0);
    fs.closeSync(fd);

    // DBF Magic Bytes: 0x03, 0x83, 0x8B, 0x30, 0x31, 0x32, 0xF5
    const dbfMagicBytes = [0x03, 0x83, 0x8B, 0x30, 0x31, 0x32, 0xF5];
    if (dbfMagicBytes.includes(buffer[0])) {
      return "dbf";
    }

    // CSV: Keine spezifischen Magic Bytes, aber UTF-8 BOM möglich
    // UTF-8 BOM: 0xEF 0xBB 0xBF
    if (buffer[0] === 0xef && buffer[1] === 0xbb && buffer[2] === 0xbf) {
      return "csv";
    }

    // CSV: Text-ähnliche Zeichen am Anfang
    // Prüfe, ob die ersten Bytes druckbare ASCII/UTF-8 Zeichen sind
    const textChars = buffer.toString("utf-8", 0, Math.min(4, buffer.length));
    if (/^[\x20-\x7E\r\n\t;,\|]+$/.test(textChars)) {
      return "csv";
    }

    return null;
  } catch {
    return null;
  }
}

/**
 * Erkennt den Dateityp mit Fallback-Strategie.
 * 
 * 1. Versuche Magic Bytes
 * 2. Fallback auf Dateiendung
 * 
 * @param filePath - Pfad zur Datei
 * @returns Erkanntes Dateiformat
 */
export function detectFileType(filePath: string): FileType {
  const byMagicBytes = detectFileTypeByMagicBytes(filePath);
  if (byMagicBytes) {
    return byMagicBytes;
  }
  return detectFileTypeByExtension(filePath);
}

