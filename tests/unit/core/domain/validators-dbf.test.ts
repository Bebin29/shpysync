import { describe, it, expect, beforeEach, afterEach } from "vitest";
import * as fs from "fs";
import * as path from "path";
import * as os from "os";
import {
  validateDbfFile,
  validateDbfHeaders,
  detectFileType,
  validateFile,
} from "../../../core/domain/validators.js";
import { WawiError } from "../../../core/domain/errors.js";

describe("DBF-Validatoren", () => {
  let tempDir: string;

  beforeEach(() => {
    tempDir = fs.mkdtempSync(path.join(os.tmpdir(), "dbf-validator-test-"));
  });

  afterEach(() => {
    if (fs.existsSync(tempDir)) {
      fs.rmSync(tempDir, { recursive: true, force: true });
    }
  });

  describe("validateDbfFile", () => {
    it("sollte gültige DBF-Datei akzeptieren", () => {
      const dbfPath = path.join(tempDir, "test.dbf");
      const buffer = Buffer.alloc(32);
      buffer[0] = 0x03; // dBASE III Magic Byte
      buffer[4] = 0x01; // Record count (little-endian)
      buffer[8] = 0x20; // Header length (32 bytes)
      buffer[10] = 0x01; // Record length
      fs.writeFileSync(dbfPath, buffer);

      expect(() => validateDbfFile(dbfPath)).not.toThrow();
    });

    it("sollte Fehler werfen, wenn Datei nicht existiert", () => {
      const nonExistentPath = path.join(tempDir, "non-existent.dbf");

      expect(() => validateDbfFile(nonExistentPath)).toThrow(WawiError);
      expect(() => validateDbfFile(nonExistentPath)).toThrow("CSV_FILE_NOT_FOUND");
    });

    it("sollte Fehler werfen, wenn Datei leer ist", () => {
      const emptyPath = path.join(tempDir, "empty.dbf");
      fs.writeFileSync(emptyPath, "");

      expect(() => validateDbfFile(emptyPath)).toThrow(WawiError);
      expect(() => validateDbfFile(emptyPath)).toThrow("CSV_EMPTY");
    });

    it("sollte Fehler werfen, wenn Datei kein gültiges DBF-Format hat", () => {
      const invalidPath = path.join(tempDir, "invalid.dbf");
      const buffer = Buffer.from([0xff, 0xff, 0xff, 0xff]); // Ungültige Magic Bytes
      fs.writeFileSync(invalidPath, buffer);

      expect(() => validateDbfFile(invalidPath)).toThrow(WawiError);
      expect(() => validateDbfFile(invalidPath)).toThrow("CSV_INVALID_FORMAT");
    });

    it("sollte Fehler werfen, wenn Pfad leer ist", () => {
      expect(() => validateDbfFile("")).toThrow(WawiError);
      expect(() => validateDbfFile("")).toThrow("CSV_FILE_NOT_FOUND");
    });
  });

  describe("validateDbfHeaders", () => {
    it("sollte gültige Header akzeptieren", () => {
      const headers = ["ARTNR", "BEZEICHNUNG", "PREIS", "BESTAND"];
      expect(() => validateDbfHeaders(headers)).not.toThrow();
    });

    it("sollte Fehler werfen, wenn Header leer sind", () => {
      expect(() => validateDbfHeaders([])).toThrow(WawiError);
      expect(() => validateDbfHeaders([])).toThrow("CSV_EMPTY");
    });

    it("sollte Fehler werfen, wenn Header null/undefined ist", () => {
      expect(() => validateDbfHeaders(null as unknown as string[])).toThrow();
    });

    it("sollte Fehler werfen, wenn leere Feldnamen vorhanden sind", () => {
      const headers = ["ARTNR", "", "PREIS", "BESTAND"];
      expect(() => validateDbfHeaders(headers)).toThrow(WawiError);
      expect(() => validateDbfHeaders(headers)).toThrow("CSV_INVALID_FORMAT");
    });
  });

  describe("detectFileType", () => {
    it("sollte .csv als CSV erkennen", () => {
      expect(detectFileType("test.csv")).toBe("csv");
      expect(detectFileType("/path/to/file.CSV")).toBe("csv");
    });

    it("sollte .dbf als DBF erkennen", () => {
      expect(detectFileType("test.dbf")).toBe("dbf");
      expect(detectFileType("/path/to/file.DBF")).toBe("dbf");
    });

    it("sollte CSV als Default zurückgeben", () => {
      expect(detectFileType("test.txt")).toBe("csv");
      expect(detectFileType("test")).toBe("csv");
    });
  });

  describe("validateFile", () => {
    it("sollte CSV-Datei validieren, wenn Dateityp nicht angegeben", () => {
      const csvPath = path.join(tempDir, "test.csv");
      fs.writeFileSync(csvPath, "SKU;Name", "utf-8");

      expect(() => validateFile(csvPath)).not.toThrow();
    });

    it("sollte DBF-Datei validieren, wenn Dateityp nicht angegeben", () => {
      const dbfPath = path.join(tempDir, "test.dbf");
      const buffer = Buffer.alloc(32);
      buffer[0] = 0x03; // dBASE III Magic Byte
      buffer[8] = 0x20; // Header length
      fs.writeFileSync(dbfPath, buffer);

      expect(() => validateFile(dbfPath)).not.toThrow();
    });

    it("sollte expliziten Dateityp verwenden", () => {
      const dbfPath = path.join(tempDir, "test.dbf");
      const buffer = Buffer.alloc(32);
      buffer[0] = 0x03;
      buffer[8] = 0x20;
      fs.writeFileSync(dbfPath, buffer);

      expect(() => validateFile(dbfPath, "dbf")).not.toThrow();
      expect(() => validateFile(dbfPath, "csv")).toThrow(); // CSV-Validator würde fehlschlagen
    });
  });
});


