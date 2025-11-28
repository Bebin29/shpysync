import { describe, it, expect } from "vitest";
import { normalizePrice } from "../../../../core/domain/price-normalizer.js";

describe("normalizePrice", () => {
  describe("Europäisches Format mit Komma", () => {
    it("sollte einfaches Komma-Format normalisieren", () => {
      expect(normalizePrice("6,5")).toBe("6.50");
      expect(normalizePrice("12,99")).toBe("12.99");
      expect(normalizePrice("0,50")).toBe("0.50");
    });

    it("sollte Komma-Format mit führenden Nullen normalisieren", () => {
      expect(normalizePrice("0,01")).toBe("0.01");
      expect(normalizePrice("0,1")).toBe("0.10");
    });
  });

  describe("Format mit Punkt", () => {
    it("sollte einfaches Punkt-Format normalisieren", () => {
      expect(normalizePrice("6.5")).toBe("6.50");
      expect(normalizePrice("12.99")).toBe("12.99");
      expect(normalizePrice("100.00")).toBe("100.00");
    });
  });

  describe("Europäisches Format mit Tausenderpunkt", () => {
    it("sollte Tausenderpunkt als Tausender-Trennzeichen erkennen", () => {
      expect(normalizePrice("1.234,56")).toBe("1234.56");
      expect(normalizePrice("10.000,00")).toBe("10000.00");
      expect(normalizePrice("100.000,50")).toBe("100000.50");
    });

    it("sollte mehrere Tausenderpunkte entfernen", () => {
      expect(normalizePrice("1.234.567,89")).toBe("1234567.89");
    });
  });

  describe("Amerikanisches Format", () => {
    it("sollte Komma als Tausender-Trennzeichen erkennen", () => {
      expect(normalizePrice("1,234.56")).toBe("1234.56");
      expect(normalizePrice("10,000.00")).toBe("10000.00");
      expect(normalizePrice("100,000.50")).toBe("100000.50");
    });
  });

  describe("Währungszeichen-Entfernung", () => {
    it("sollte Euro-Symbol entfernen", () => {
      expect(normalizePrice("12 €")).toBe("12.00");
      expect(normalizePrice("€ 12.50")).toBe("12.50");
      expect(normalizePrice("12,50 €")).toBe("12.50");
    });

    it("sollte EUR-Text entfernen", () => {
      expect(normalizePrice("EUR 12.50")).toBe("12.50");
      expect(normalizePrice("12.50 EUR")).toBe("12.50");
      expect(normalizePrice("eur 12.50")).toBe("12.50");
    });

    it("sollte Währung mit Whitespace kombinieren", () => {
      expect(normalizePrice("  12,50 EUR  ")).toBe("12.50");
      expect(normalizePrice("EUR  25.00")).toBe("25.00");
    });
  });

  describe("Whitespace-Handling", () => {
    it("sollte führende und nachfolgende Leerzeichen entfernen", () => {
      expect(normalizePrice("  12.50  ")).toBe("12.50");
      expect(normalizePrice("  12,50  ")).toBe("12.50");
    });

    it("sollte Leerzeichen zwischen Zahlen entfernen", () => {
      expect(normalizePrice("12, 50")).toBe("12.50");
      expect(normalizePrice("12 . 50")).toBe("12.50");
    });
  });

  describe("Edge Cases - Sehr kleine Preise", () => {
    it("sollte sehr kleine Preise normalisieren", () => {
      expect(normalizePrice("0,01")).toBe("0.01");
      expect(normalizePrice("0.1")).toBe("0.10");
      expect(normalizePrice("0,001")).toBe("0.00"); // Wird zu 0.00 gerundet
    });
  });

  describe("Edge Cases - Sehr große Preise", () => {
    it("sollte sehr große Preise normalisieren", () => {
      expect(normalizePrice("999999.99")).toBe("999999.99");
      expect(normalizePrice("1.000.000,00")).toBe("1000000.00");
      expect(normalizePrice("10,000,000.00")).toBe("10000000.00");
    });
  });

  describe("Edge Cases - Null und Undefined", () => {
    it("sollte bei null einen Fehler werfen", () => {
      expect(() => normalizePrice(null as any)).toThrow("Preis ist null oder undefined");
    });

    it("sollte bei undefined einen Fehler werfen", () => {
      expect(() => normalizePrice(undefined as any)).toThrow("Preis ist null oder undefined");
    });
  });

  describe("Edge Cases - Ungültige Formate", () => {
    it("sollte bei leerem String einen Fehler werfen", () => {
      expect(() => normalizePrice("")).toThrow();
    });

    it("sollte bei nicht-numerischen Werten einen Fehler werfen", () => {
      expect(() => normalizePrice("abc")).toThrow();
      expect(() => normalizePrice("not a price")).toThrow();
      expect(() => normalizePrice("€€€")).toThrow();
    });

    it("sollte bei nur Währungszeichen einen Fehler werfen", () => {
      expect(() => normalizePrice("€")).toThrow();
      expect(() => normalizePrice("EUR")).toThrow();
    });
  });

  describe("Ganzzahlen", () => {
    it("sollte Ganzzahlen auf 2 Dezimalstellen formatieren", () => {
      expect(normalizePrice("10")).toBe("10.00");
      expect(normalizePrice("100")).toBe("100.00");
      expect(normalizePrice("0")).toBe("0.00");
    });
  });

  describe("Kombinierte Formate", () => {
    it("sollte komplexe Formate mit Währung und Tausender-Trennzeichen normalisieren", () => {
      expect(normalizePrice("€ 1.234,56")).toBe("1234.56");
      expect(normalizePrice("EUR 10,000.00")).toBe("10000.00");
      expect(normalizePrice("  1.234,56 EUR  ")).toBe("1234.56");
    });
  });
});





