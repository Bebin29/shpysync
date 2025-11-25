import { describe, it, expect } from "vitest";
import {
  normalizeString,
  columnLetterToIndex,
  indexToColumnLetter,
} from "../../../../core/utils/normalization.js";

describe("normalizeString", () => {
  describe("Unicode-Normalisierung", () => {
    it("sollte Unicode-Zeichen normalisieren", () => {
      // NFKC normalisiert nicht alle Zeichen (z.B. é bleibt é)
      // Aber es normalisiert bestimmte Unicode-Varianten
      expect(normalizeString("Café")).toBe("café"); // é wird nicht zu e normalisiert
      expect(normalizeString("Müller")).toBe("müller"); // ü wird nicht zu u normalisiert
      expect(normalizeString("naïve")).toBe("naïve"); // ï wird nicht zu i normalisiert
      expect(normalizeString("résumé")).toBe("résumé"); // é wird nicht zu e normalisiert
    });

    it("sollte verschiedene Unicode-Formen normalisieren", () => {
      // NFKC normalisiert verschiedene Unicode-Formen
      expect(normalizeString("ℌ")).toBe("h"); // Blackletter H → h
      expect(normalizeString("①")).toBe("1"); // Circled 1 → 1
    });
  });

  describe("Lowercase-Konvertierung", () => {
    it("sollte zu Lowercase konvertieren", () => {
      expect(normalizeString("TEST")).toBe("test");
      expect(normalizeString("Test Produkt")).toBe("test produkt");
      expect(normalizeString("MiXeD cAsE")).toBe("mixed case");
    });
  });

  describe("Whitespace-Normalisierung", () => {
    it("sollte führende und nachfolgende Whitespaces entfernen", () => {
      expect(normalizeString("  test  ")).toBe("test");
      expect(normalizeString("   produkt   ")).toBe("produkt");
    });

    it("sollte mehrere Whitespaces zu einem Leerzeichen normalisieren", () => {
      expect(normalizeString("test   product")).toBe("test product");
      expect(normalizeString("test\t\tproduct")).toBe("test product");
      expect(normalizeString("test\n\nproduct")).toBe("test product");
    });

    it("sollte verschiedene Whitespace-Zeichen normalisieren", () => {
      expect(normalizeString("test\n\tproduct")).toBe("test product");
      expect(normalizeString("test\r\nproduct")).toBe("test product");
      expect(normalizeString("test  \t  product")).toBe("test product");
    });
  });

  describe("Null und Undefined", () => {
    it("sollte null zu leerem String konvertieren", () => {
      expect(normalizeString(null)).toBe("");
    });

    it("sollte undefined zu leerem String konvertieren", () => {
      expect(normalizeString(undefined)).toBe("");
    });
  });

  describe("Leere Strings", () => {
    it("sollte leere Strings behandeln", () => {
      expect(normalizeString("")).toBe("");
      expect(normalizeString("   ")).toBe("");
      expect(normalizeString("\t\n")).toBe("");
    });
  });

  describe("Kombinierte Fälle", () => {
    it("sollte komplexe Strings normalisieren", () => {
      // NFKC normalisiert nicht alle Unicode-Zeichen
      expect(normalizeString("  Café Müller  ")).toBe("café müller");
      expect(normalizeString("TEST\n\tPRODUKT")).toBe("test produkt");
      expect(normalizeString("  MiXeD   cAsE  ")).toBe("mixed case");
    });
  });
});

describe("columnLetterToIndex", () => {
  describe("Einfache Buchstaben (A-Z)", () => {
    it("sollte A-Z korrekt konvertieren", () => {
      expect(columnLetterToIndex("A")).toBe(0);
      expect(columnLetterToIndex("B")).toBe(1);
      expect(columnLetterToIndex("C")).toBe(2);
      expect(columnLetterToIndex("Z")).toBe(25);
    });
  });

  describe("Doppelte Buchstaben (AA-ZZ)", () => {
    it("sollte AA-ZZ korrekt konvertieren", () => {
      expect(columnLetterToIndex("AA")).toBe(26);
      expect(columnLetterToIndex("AB")).toBe(27);
      expect(columnLetterToIndex("AC")).toBe(28);
      expect(columnLetterToIndex("AZ")).toBe(51);
      expect(columnLetterToIndex("BA")).toBe(52);
      expect(columnLetterToIndex("ZZ")).toBe(701);
    });
  });

  describe("Dreifache Buchstaben", () => {
    it("sollte AAA korrekt konvertieren", () => {
      expect(columnLetterToIndex("AAA")).toBe(702);
      expect(columnLetterToIndex("AAB")).toBe(703);
      expect(columnLetterToIndex("AAZ")).toBe(727);
    });
  });

  describe("Case-Insensitive", () => {
    it("sollte Kleinbuchstaben akzeptieren", () => {
      expect(columnLetterToIndex("a")).toBe(0);
      expect(columnLetterToIndex("b")).toBe(1);
      expect(columnLetterToIndex("z")).toBe(25);
      expect(columnLetterToIndex("aa")).toBe(26);
      expect(columnLetterToIndex("ab")).toBe(27);
    });

    it("sollte gemischte Groß-/Kleinbuchstaben akzeptieren", () => {
      expect(columnLetterToIndex("Aa")).toBe(26);
      expect(columnLetterToIndex("aA")).toBe(26);
      expect(columnLetterToIndex("Ab")).toBe(27);
    });
  });

  describe("Edge Cases", () => {
    it("sollte sehr große Spalten korrekt konvertieren", () => {
      expect(columnLetterToIndex("XFD")).toBe(16383); // Letzte Spalte in Excel
    });
  });
});

describe("indexToColumnLetter", () => {
  describe("Einfache Indizes (0-25)", () => {
    it("sollte 0-25 korrekt konvertieren", () => {
      expect(indexToColumnLetter(0)).toBe("A");
      expect(indexToColumnLetter(1)).toBe("B");
      expect(indexToColumnLetter(2)).toBe("C");
      expect(indexToColumnLetter(25)).toBe("Z");
    });
  });

  describe("Doppelte Buchstaben (26-701)", () => {
    it("sollte 26-701 korrekt konvertieren", () => {
      expect(indexToColumnLetter(26)).toBe("AA");
      expect(indexToColumnLetter(27)).toBe("AB");
      expect(indexToColumnLetter(28)).toBe("AC");
      expect(indexToColumnLetter(51)).toBe("AZ");
      expect(indexToColumnLetter(52)).toBe("BA");
      expect(indexToColumnLetter(701)).toBe("ZZ");
    });
  });

  describe("Dreifache Buchstaben", () => {
    it("sollte 702+ korrekt konvertieren", () => {
      expect(indexToColumnLetter(702)).toBe("AAA");
      expect(indexToColumnLetter(703)).toBe("AAB");
      expect(indexToColumnLetter(727)).toBe("AAZ");
    });
  });

  describe("Edge Cases", () => {
    it("sollte bei negativen Indizes einen Fehler werfen", () => {
      expect(() => indexToColumnLetter(-1)).toThrow("Index muss >= 0 sein");
      expect(() => indexToColumnLetter(-10)).toThrow("Index muss >= 0 sein");
    });

    it("sollte sehr große Indizes korrekt konvertieren", () => {
      expect(indexToColumnLetter(16383)).toBe("XFD"); // Letzte Spalte in Excel
    });
  });
});

describe("Roundtrip-Tests", () => {
  it("sollte Index → Letter → Index Roundtrip funktionieren", () => {
    const testIndices = [0, 1, 25, 26, 27, 51, 52, 701, 702, 703, 16383];

    for (const index of testIndices) {
      const letter = indexToColumnLetter(index);
      const backToIndex = columnLetterToIndex(letter);
      expect(backToIndex).toBe(index);
    }
  });

  it("sollte Letter → Index → Letter Roundtrip funktionieren", () => {
    const testLetters = ["A", "B", "Z", "AA", "AB", "AZ", "BA", "ZZ", "AAA", "XFD"];

    for (const letter of testLetters) {
      const index = columnLetterToIndex(letter);
      const backToLetter = indexToColumnLetter(index);
      expect(backToLetter).toBe(letter.toUpperCase());
    }
  });
});

