"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.normalizeString = normalizeString;
exports.columnLetterToIndex = columnLetterToIndex;
exports.indexToColumnLetter = indexToColumnLetter;
/**
 * String-Normalisierung für Matching.
 *
 * Portiert von Python `_norm()` Funktion:
 * - Unicode-Normalisierung (NFKC)
 * - Trim und Lowercase
 * - Whitespace-Normalisierung
 *
 * @param s - String zum Normalisieren
 * @returns Normalisierter String
 */
function normalizeString(s) {
    if (s == null) {
        return "";
    }
    // Unicode-Normalisierung (NFKC) - native JavaScript
    let normalized = s.normalize("NFKC");
    // Trim und Lowercase
    normalized = normalized.trim().toLowerCase();
    // Whitespace-Normalisierung (mehrere Whitespaces zu einem Leerzeichen)
    normalized = normalized.replace(/\s+/g, " ");
    return normalized;
}
/**
 * Konvertiert Spaltenbuchstaben (A, B, C, ..., Z, AA, AB, ...) zu Index.
 *
 * @param letter - Spaltenbuchstabe (z.B. "A", "B", "AB")
 * @returns 0-basierter Index
 */
function columnLetterToIndex(letter) {
    const upper = letter.toUpperCase();
    let result = 0;
    for (let i = 0; i < upper.length; i++) {
        const char = upper[i];
        result = result * 26 + (char.charCodeAt(0) - "A".charCodeAt(0) + 1);
    }
    return result - 1;
}
/**
 * Konvertiert Index zu Spaltenbuchstaben (0 -> A, 1 -> B, ..., 25 -> Z, 26 -> AA, ...).
 *
 * @param index - 0-basierter Index
 * @returns Spaltenbuchstabe (z.B. "A", "B", "AB")
 */
function indexToColumnLetter(index) {
    if (index < 0) {
        throw new Error("Index muss >= 0 sein");
    }
    let result = "";
    let num = index + 1; // Excel-Stil: 1-basiert intern
    while (num > 0) {
        const remainder = (num - 1) % 26;
        result = String.fromCharCode(65 + remainder) + result; // 65 = 'A'
        num = Math.floor((num - 1) / 26);
    }
    return result;
}
