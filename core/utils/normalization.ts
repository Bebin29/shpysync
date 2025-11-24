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
export function normalizeString(s: string | null | undefined): string {
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
export function columnLetterToIndex(letter: string): number {
  const upper = letter.toUpperCase();
  let result = 0;

  for (let i = 0; i < upper.length; i++) {
    const char = upper[i];
    result = result * 26 + (char.charCodeAt(0) - "A".charCodeAt(0) + 1);
  }

  return result - 1;
}

