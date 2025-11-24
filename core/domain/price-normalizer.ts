/**
 * Preis-Normalisierung für Shopify-kompatibles Format.
 * 
 * Portiert von Python `normalize_price_to_money_str()` Funktion.
 * 
 * Unterstützt verschiedene Formate:
 * - '6,5' → '6.50'
 * - '6.5' → '6.50'
 * - '1.234,56' → '1234.56'
 * - '1,234.56' → '1234.56'
 * - '  12 € ' → '12.00'
 * 
 * @param val - Preis-String in beliebigem Format
 * @returns Shopify-kompatibler Money-String (z.B. "12.50")
 * @throws Error wenn val null/undefined oder nicht parsebar
 */
export function normalizePrice(val: string | null | undefined): string {
  if (val == null) {
    throw new Error("Preis ist null oder undefined");
  }

  let s = val.trim();

  // Währungen/Leerzeichen/Sondertrennzeichen entfernen
  const currencySymbols = ["€", "EUR", "eur"];
  for (const symbol of currencySymbols) {
    s = s.replace(new RegExp(symbol, "g"), "");
  }
  s = s.replace(/\s+/g, "").replace(/'/g, "");

  // Fälle:
  //  - sowohl Komma & Punkt vorhanden -> meistens europäisch: Punkt = Tausender, Komma = Dezimal
  //  - nur Komma -> Dezimal-Komma
  //  - nur Punkt -> Dezimal-Punkt
  if (s.includes(",") && s.includes(".")) {
    // Europäisches Format: Punkt = Tausender, Komma = Dezimal
    // Entferne Tausenderpunkte, ersetze Dezimalkomma durch Dezimalpunkt
    s = s.replace(/\./g, "").replace(",", ".");
  } else if (s.includes(",") && !s.includes(".")) {
    // Nur Komma -> Dezimal-Komma
    s = s.replace(",", ".");
  }
  // Sonst: schon ok (nur Punkt oder keine Trennzeichen)

  // Als Float parsen und auf 2 Nachkommastellen formatieren
  const amount = parseFloat(s);
  if (isNaN(amount)) {
    throw new Error(`Preis konnte nicht geparst werden: "${val}"`);
  }

  return amount.toFixed(2);
}

