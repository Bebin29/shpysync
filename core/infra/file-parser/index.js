"use strict";
/**
 * Factory-Funktion für Dateiformat-Parser.
 *
 * Stellt eine einheitliche Schnittstelle für CSV und DBF-Parser bereit.
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.parseFileStream = parseFileStream;
exports.parseFilePreview = parseFilePreview;
const parser_js_1 = require("../csv/parser.js");
const parser_js_2 = require("../dbf/parser.js");
const detector_js_1 = require("./detector.js");
const parser_js_3 = require("../csv/parser.js");
const parser_js_4 = require("../dbf/parser.js");
/**
 * Parst eine Datei im Streaming-Modus basierend auf dem Dateityp.
 *
 * @param filePath - Pfad zur Datei
 * @param fileType - Optional: Dateityp (wird automatisch erkannt, falls nicht angegeben)
 * @returns Stream-Ergebnis mit Headers, Encoding und AsyncIterator für Rows
 */
async function parseFileStream(filePath, fileType) {
  const detectedType = fileType || (0, detector_js_1.detectFileType)(filePath);
  if (detectedType === "dbf") {
    const dbfResult = await (0, parser_js_2.parseDbfStream)(filePath);
    return {
      headers: dbfResult.headers,
      encoding: dbfResult.encoding,
      fileType: "dbf",
      rows: dbfResult.rows,
    };
  } else {
    const csvResult = await (0, parser_js_1.parseCsvStream)(filePath, ";");
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
async function parseFilePreview(filePath, maxRows = 200, fileType) {
  const detectedType = fileType || (0, detector_js_1.detectFileType)(filePath);
  if (detectedType === "dbf") {
    const dbfResult = await (0, parser_js_4.parseDbfPreview)(filePath, maxRows);
    return {
      rows: dbfResult.rows,
      headers: dbfResult.headers,
      encoding: dbfResult.encoding,
      totalRows: dbfResult.totalRows,
      fileType: "dbf",
    };
  } else {
    const csvResult = await (0, parser_js_3.parseCsvPreview)(filePath, maxRows);
    return {
      rows: csvResult.rows,
      headers: csvResult.headers,
      encoding: csvResult.encoding,
      totalRows: csvResult.totalRows,
      fileType: "csv",
    };
  }
}
