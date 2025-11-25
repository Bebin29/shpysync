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
export function normalizePrice(val) {
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
    //  - sowohl Komma & Punkt vorhanden -> prüfe Position: letztes Trennzeichen entscheidet
    //  - nur Komma -> Dezimal-Komma
    //  - nur Punkt -> Dezimal-Punkt
    if (s.includes(",") && s.includes(".")) {
        // Entscheide: europäisch oder amerikanisch?
        // Regel: Wenn das letzte Trennzeichen ein Punkt ist -> amerikanisch (Komma = Tausender)
        //        Wenn das letzte Trennzeichen ein Komma ist -> europäisch (Punkt = Tausender)
        const lastComma = s.lastIndexOf(",");
        const lastDot = s.lastIndexOf(".");
        if (lastDot > lastComma) {
            // Amerikanisch: Komma = Tausender, Punkt = Dezimal
            s = s.replace(/,/g, ""); // Entferne alle Kommas (Tausender-Trennzeichen)
        }
        else {
            // Europäisch: Punkt = Tausender, Komma = Dezimal
            s = s.replace(/\./g, "").replace(",", "."); // Entferne Punkte, ersetze Komma durch Punkt
        }
    }
    else if (s.includes(",") && !s.includes(".")) {
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
