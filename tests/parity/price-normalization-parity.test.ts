import { describe, it, expect } from "vitest";
import { normalizePrice } from "../../../core/domain/price-normalizer.js";
import { loadFixture } from "../helpers/test-utils.js";

/**
 * Python-Referenz-Implementierung (aus working_script.py).
 * 
 * Portiert von Python `normalize_price_to_money_str()` Funktion.
 * Diese Implementierung dient als Referenz für Paritäts-Tests.
 */
function pythonNormalizePrice(val: string | null | undefined): string {
  if (val === null || val === undefined) {
    throw new Error("Preis ist None");
  }
  
  let s = val.trim();
  
  // Währungen/Leerzeichen/Sondertrennzeichen entfernen
  for (const t of ["€", "EUR", "eur"]) {
    s = s.replace(t, "");
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
    } else {
      // Europäisch: Punkt = Tausender, Komma = Dezimal
      s = s.replace(/\./g, "").replace(",", "."); // Entferne Punkte, ersetze Komma durch Punkt
    }
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

describe("Price Normalization Parity", () => {
  describe("Grundlegende Formate", () => {
    const testCases = [
      { input: "6,5", description: "Europäisches Format mit Komma" },
      { input: "6.5", description: "Format mit Punkt" },
      { input: "1.234,56", description: "Europäisches Format mit Tausenderpunkt" },
      { input: "1,234.56", description: "Amerikanisches Format" },
      { input: "12 €", description: "Mit Euro-Symbol" },
      { input: "EUR 12.50", description: "Mit EUR-Text" },
      { input: "  12,50 EUR  ", description: "Mit Whitespace und EUR" },
      { input: "0,01", description: "Sehr kleiner Preis" },
      { input: "999999.99", description: "Großer Preis" },
      { input: "1.000.000,00", description: "Sehr großer Preis mit Tausenderpunkt" },
    ];

    testCases.forEach(({ input, description }) => {
      it(`sollte identisch zu Python sein: "${input}" (${description})`, () => {
        const tsResult = normalizePrice(input);
        const pythonResult = pythonNormalizePrice(input);
        expect(tsResult).toBe(pythonResult);
      });
    });
  });

  describe("Edge Cases", () => {
    it("sollte bei null identisch zu Python sein", () => {
      expect(() => normalizePrice(null as any)).toThrow();
      expect(() => pythonNormalizePrice(null)).toThrow();
    });

    it("sollte bei undefined identisch zu Python sein", () => {
      expect(() => normalizePrice(undefined as any)).toThrow();
      expect(() => pythonNormalizePrice(undefined)).toThrow();
    });

    it("sollte bei ungültigem Format identisch zu Python sein", () => {
      expect(() => normalizePrice("abc")).toThrow();
      expect(() => pythonNormalizePrice("abc")).toThrow();
    });
  });

  describe("Erwartete Outputs aus Fixture", () => {
    it("sollte alle erwarteten Outputs aus expected-outputs.json erfüllen", () => {
      const expectedOutputs = loadFixture<{ priceNormalization: Record<string, string> }>(
        "expected-outputs.json"
      );

      for (const [input, expectedOutput] of Object.entries(
        expectedOutputs.priceNormalization
      )) {
        const result = normalizePrice(input);
        expect(result).toBe(expectedOutput);
      }
    });
  });

  describe("Zusätzliche Test-Cases", () => {
    const additionalTestCases = [
      { input: "10", expected: "10.00" },
      { input: "0", expected: "0.00" },
      { input: "100.00", expected: "100.00" },
      { input: "50,00", expected: "50.00" },
      { input: "€ 25.50", expected: "25.50" },
      { input: "25.50 EUR", expected: "25.50" },
      { input: "eur 30.00", expected: "30.00" },
      { input: "1.000,00", expected: "1000.00" },
      { input: "10,000.00", expected: "10000.00" },
    ];

    additionalTestCases.forEach(({ input, expected }) => {
      it(`sollte "${input}" zu "${expected}" normalisieren (identisch zu Python)`, () => {
        const tsResult = normalizePrice(input);
        const pythonResult = pythonNormalizePrice(input);
        expect(tsResult).toBe(pythonResult);
        expect(tsResult).toBe(expected);
      });
    });
  });
});

