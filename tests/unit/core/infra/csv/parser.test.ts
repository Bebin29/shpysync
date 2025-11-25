import { describe, it, expect, beforeEach, afterEach } from "vitest";
import * as fs from "fs";
import * as path from "path";
import * as os from "os";
import { parseCsv, extractRowValues, convertToCsvRows, type ColumnMapping, type ExtractedRow } from "../../../../core/infra/csv/parser.js";
import type { RawCsvRow } from "../../../../core/domain/types.js";
import { loadFixture } from "../../../../helpers/test-utils.js";

describe("parseCsv", () => {
  let tempDir: string;

  beforeEach(() => {
    tempDir = fs.mkdtempSync(path.join(os.tmpdir(), "csv-test-"));
  });

  afterEach(() => {
    // Cleanup
    if (fs.existsSync(tempDir)) {
      fs.rmSync(tempDir, { recursive: true, force: true });
    }
  });

  describe("Grundlegende Funktionalität", () => {
    it("sollte CSV-Datei mit Semikolon-Delimiter parsen", () => {
      const csvContent = "SKU;Name;Preis;Bestand\nSKU-001;Test Produkt;12.50;10";
      const csvPath = path.join(tempDir, "test.csv");
      fs.writeFileSync(csvPath, csvContent, "utf-8");

      const result = parseCsv(csvPath, ";");

      expect(result.headers).toEqual(["SKU", "Name", "Preis", "Bestand"]);
      expect(result.rows).toHaveLength(1);
      expect(result.rows[0].data).toEqual({
        SKU: "SKU-001",
        Name: "Test Produkt",
        Preis: "12.50",
        Bestand: "10",
      });
    });

    it("sollte CSV-Datei mit Komma-Delimiter parsen", () => {
      const csvContent = "SKU,Name,Preis,Bestand\nSKU-001,Test Produkt,12.50,10";
      const csvPath = path.join(tempDir, "test.csv");
      fs.writeFileSync(csvPath, csvContent, "utf-8");

      const result = parseCsv(csvPath, ",");

      expect(result.headers).toEqual(["SKU", "Name", "Preis", "Bestand"]);
      expect(result.rows).toHaveLength(1);
    });

    it("sollte mehrere Zeilen parsen", () => {
      const csvContent = "SKU;Name;Preis;Bestand\nSKU-001;Produkt 1;12.50;10\nSKU-002;Produkt 2;8.99;5";
      const csvPath = path.join(tempDir, "test.csv");
      fs.writeFileSync(csvPath, csvContent, "utf-8");

      const result = parseCsv(csvPath, ";");

      expect(result.rows).toHaveLength(2);
      expect(result.totalRows).toBe(2);
    });

    it("sollte leere Zeilen überspringen", () => {
      const csvContent = "SKU;Name;Preis;Bestand\nSKU-001;Produkt 1;12.50;10\n\nSKU-002;Produkt 2;8.99;5";
      const csvPath = path.join(tempDir, "test.csv");
      fs.writeFileSync(csvPath, csvContent, "utf-8");

      const result = parseCsv(csvPath, ";");

      expect(result.rows).toHaveLength(2);
    });
  });

  describe("Encoding-Erkennung", () => {
    it("sollte UTF-8-Datei korrekt parsen", () => {
      const csvContent = "SKU;Name;Preis;Bestand\nSKU-001;Test Produkt;12.50;10";
      const csvPath = path.join(tempDir, "test.csv");
      // Schreibe ohne BOM (explizit als Buffer)
      fs.writeFileSync(csvPath, Buffer.from(csvContent, "utf-8"));

      const result = parseCsv(csvPath, ";");

      // Akzeptiere sowohl 'utf-8' als auch 'utf-8-sig' (beide sind gültig)
      expect(["utf-8", "utf-8-sig"]).toContain(result.encoding);
      expect(result.rows).toHaveLength(1);
    });

    it("sollte UTF-8-SIG (mit BOM) korrekt parsen", () => {
      const csvContent = "SKU;Name;Preis;Bestand\nSKU-001;Test Produkt;12.50;10";
      const csvPath = path.join(tempDir, "test.csv");
      // Schreibe mit BOM
      const bom = Buffer.from([0xef, 0xbb, 0xbf]);
      fs.writeFileSync(csvPath, Buffer.concat([bom, Buffer.from(csvContent, "utf-8")]));

      const result = parseCsv(csvPath, ";");

      expect(result.encoding).toBe("utf-8-sig");
      expect(result.rows).toHaveLength(1);
    });
  });

  describe("Row-Numbering", () => {
    it("sollte korrekte Row-Nummern vergeben", () => {
      const csvContent = "SKU;Name;Preis;Bestand\nSKU-001;Produkt 1;12.50;10\nSKU-002;Produkt 2;8.99;5";
      const csvPath = path.join(tempDir, "test.csv");
      fs.writeFileSync(csvPath, csvContent, "utf-8");

      const result = parseCsv(csvPath, ";");

      expect(result.rows[0].rowNumber).toBe(2); // Erste Datenzeile = Zeile 2 (Zeile 1 = Header)
      expect(result.rows[1].rowNumber).toBe(3);
    });
  });

  describe("Fehlerbehandlung", () => {
    it("sollte bei nicht-existierender Datei einen Fehler werfen", () => {
      const nonExistentPath = path.join(tempDir, "non-existent.csv");

      expect(() => parseCsv(nonExistentPath, ";")).toThrow();
    });

    it("sollte bei leerer Datei einen Fehler werfen", () => {
      const csvPath = path.join(tempDir, "empty.csv");
      fs.writeFileSync(csvPath, "", "utf-8");

      // Leere Dateien sollten einen Fehler werfen (validiert durch validateCsvFile)
      expect(() => parseCsv(csvPath, ";")).toThrow("Die CSV-Datei ist leer");
    });
  });

  describe("Sample-CSV aus Fixture", () => {
    it("sollte Sample-CSV aus Fixture parsen", () => {
      // Erstelle temporäre CSV-Datei aus Fixture
      const csvContent = loadFixture<string>("sample.csv");
      const csvPath = path.join(tempDir, "sample.csv");
      fs.writeFileSync(csvPath, csvContent, "utf-8");

      const result = parseCsv(csvPath, ";");

      expect(result.headers.length).toBeGreaterThan(0);
      expect(result.rows.length).toBeGreaterThan(0);
    });
  });
});

describe("extractRowValues", () => {
  const headers = ["SKU", "Name", "Preis", "Bestand"];
  const columnMapping: ColumnMapping = {
    sku: "A", // Erste Spalte
    name: "B", // Zweite Spalte
    price: "C", // Dritte Spalte
    stock: "D", // Vierte Spalte
  };

  it("sollte Werte aus CSV-Zeile extrahieren", () => {
    const row: RawCsvRow = {
      rowNumber: 2,
      data: {
        SKU: "SKU-001",
        Name: "Test Produkt",
        Preis: "12.50",
        Bestand: "10",
      },
    };

    const result = extractRowValues(row, columnMapping, headers);

    expect(result).not.toBeNull();
    expect(result?.sku).toBe("SKU-001");
    expect(result?.name).toBe("Test Produkt");
    expect(result?.price).toBe("12.50");
    expect(result?.stock).toBe("10");
    expect(result?.rowNumber).toBe(2);
  });

  it("sollte null zurückgeben wenn Mapping ungültig", () => {
    const row: RawCsvRow = {
      rowNumber: 2,
      data: {
        SKU: "SKU-001",
        Name: "Test Produkt",
      },
    };

    const invalidMapping: ColumnMapping = {
      sku: "Z", // Spalte Z existiert nicht
      name: "AA",
      price: "AB",
      stock: "AC",
    };

    const result = extractRowValues(row, invalidMapping, headers);

    expect(result).toBeNull();
  });

  it("sollte null zurückgeben wenn nicht genug Header-Spalten vorhanden", () => {
    // Verwende Header mit nur 2 Spalten (statt 4)
    const shortHeaders = ["SKU", "Name"];
    
    const row: RawCsvRow = {
      rowNumber: 2,
      data: {
        SKU: "SKU-001",
        Name: "Test Produkt",
      },
    };

    const result = extractRowValues(row, columnMapping, shortHeaders);

    // Sollte null zurückgeben, da nicht genug Header-Spalten vorhanden sind
    // (Mapping erwartet Spalten A, B, C, D, aber nur 2 Header vorhanden)
    expect(result).toBeNull();
  });
});

describe("convertToCsvRows", () => {
  it("sollte ExtractedRows zu CsvRows konvertieren", () => {
    const extractedRows = [
      {
        rowNumber: 2,
        sku: "SKU-001",
        name: "Test Produkt",
        price: "12.50",
        stock: "10",
        rawData: {
          SKU: "SKU-001",
          Name: "Test Produkt",
          Preis: "12.50",
          Bestand: "10",
        },
      },
    ];

    const result = convertToCsvRows(extractedRows);

    expect(result).toHaveLength(1);
    expect(result[0].sku).toBe("SKU-001");
    expect(result[0].name).toBe("Test Produkt");
    expect(result[0].price).toBe("12.50");
    expect(result[0].stock).toBe(10); // Sollte als Number konvertiert werden
    expect(result[0].rowNumber).toBe(2);
  });

  it("sollte mehrere Zeilen konvertieren", () => {
    const extractedRows = [
      {
        rowNumber: 2,
        sku: "SKU-001",
        name: "Produkt 1",
        price: "12.50",
        stock: "10",
        rawData: {},
      },
      {
        rowNumber: 3,
        sku: "SKU-002",
        name: "Produkt 2",
        price: "8.99",
        stock: "5",
        rawData: {},
      },
    ];

    const result = convertToCsvRows(extractedRows);

    expect(result).toHaveLength(2);
    expect(result[0].sku).toBe("SKU-001");
    expect(result[1].sku).toBe("SKU-002");
  });

  it("sollte Bestand als Number konvertieren", () => {
    const extractedRows = [
      {
        rowNumber: 2,
        sku: "SKU-001",
        name: "Test Produkt",
        price: "12.50",
        stock: "10",
        rawData: {},
      },
    ];

    const result = convertToCsvRows(extractedRows);

    expect(typeof result[0].stock).toBe("number");
    expect(result[0].stock).toBe(10);
  });

  it("sollte Zeilen mit leerem Bestand überspringen", () => {
    const extractedRows = [
      {
        rowNumber: 2,
        sku: "SKU-001",
        name: "Test Produkt",
        price: "12.50",
        stock: "", // Leerer Bestand
        rawData: {},
      },
    ];

    const result = convertToCsvRows(extractedRows);

    expect(result).toHaveLength(0);
  });

  it("sollte Zeilen mit nicht-numerischem Bestand überspringen", () => {
    const extractedRows = [
      {
        rowNumber: 2,
        sku: "SKU-001",
        name: "Test Produkt",
        price: "12.50",
        stock: "abc", // Nicht-numerisch
        rawData: {},
      },
    ];

    const result = convertToCsvRows(extractedRows);

    expect(result).toHaveLength(0);
  });
});

