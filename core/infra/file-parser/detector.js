"use strict";
/**
 * Dateityp-Erkennung für Dateiformate.
 */
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
Object.defineProperty(exports, "__esModule", { value: true });
exports.detectFileTypeByExtension = detectFileTypeByExtension;
exports.detectFileTypeByMagicBytes = detectFileTypeByMagicBytes;
exports.detectFileType = detectFileType;
const path = __importStar(require("path"));
const fs = __importStar(require("fs"));
/**
 * Erkennt den Dateityp basierend auf der Dateiendung.
 *
 * @param filePath - Pfad zur Datei
 * @returns Erkanntes Dateiformat
 */
function detectFileTypeByExtension(filePath) {
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
function detectFileTypeByMagicBytes(filePath) {
  try {
    const buffer = Buffer.alloc(4);
    const fd = fs.openSync(filePath, "r");
    fs.readSync(fd, buffer, 0, 4, 0);
    fs.closeSync(fd);
    // DBF Magic Bytes: 0x03, 0x83, 0x8B, 0x30, 0x31, 0x32, 0xF5
    const dbfMagicBytes = [0x03, 0x83, 0x8b, 0x30, 0x31, 0x32, 0xf5];
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
function detectFileType(filePath) {
  const byMagicBytes = detectFileTypeByMagicBytes(filePath);
  if (byMagicBytes) {
    return byMagicBytes;
  }
  return detectFileTypeByExtension(filePath);
}
