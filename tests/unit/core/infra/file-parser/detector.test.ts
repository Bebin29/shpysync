import { describe, it, expect, beforeEach, afterEach } from "vitest";
import * as fs from "fs";
import * as path from "path";
import * as os from "os";
import {
  detectFileType,
  detectFileTypeByExtension,
  detectFileTypeByMagicBytes,
} from "../../../../core/infra/file-parser/detector.js";

describe("Dateityp-Erkennung", () => {
  let tempDir: string;

  beforeEach(() => {
    tempDir = fs.mkdtempSync(path.join(os.tmpdir(), "file-detector-test-"));
  });

  afterEach(() => {
    if (fs.existsSync(tempDir)) {
      fs.rmSync(tempDir, { recursive: true, force: true });
    }
  });

  describe("detectFileTypeByExtension", () => {
    it("sollte .csv als CSV erkennen", () => {
      expect(detectFileTypeByExtension("test.csv")).toBe("csv");
      expect(detectFileTypeByExtension("/path/to/file.CSV")).toBe("csv");
      expect(detectFileTypeByExtension("test.Csv")).toBe("csv");
    });

    it("sollte .dbf als DBF erkennen", () => {
      expect(detectFileTypeByExtension("test.dbf")).toBe("dbf");
      expect(detectFileTypeByExtension("/path/to/file.DBF")).toBe("dbf");
      expect(detectFileTypeByExtension("test.Dbf")).toBe("dbf");
    });

    it("sollte CSV als Default zurückgeben für unbekannte Endungen", () => {
      expect(detectFileTypeByExtension("test.txt")).toBe("csv");
      expect(detectFileTypeByExtension("test")).toBe("csv");
      expect(detectFileTypeByExtension("test.xlsx")).toBe("csv");
    });
  });

  describe("detectFileTypeByMagicBytes", () => {
    it("sollte DBF Magic Bytes erkennen", () => {
      // Erstelle eine DBF-ähnliche Datei mit Magic Byte 0x03
      const dbfPath = path.join(tempDir, "test.dbf");
      const buffer = Buffer.alloc(4);
      buffer[0] = 0x03; // dBASE III Magic Byte
      buffer[1] = 0x00;
      buffer[2] = 0x00;
      buffer[3] = 0x00;
      fs.writeFileSync(dbfPath, buffer);

      const result = detectFileTypeByMagicBytes(dbfPath);
      expect(result).toBe("dbf");
    });

    it("sollte UTF-8 BOM als CSV erkennen", () => {
      const csvPath = path.join(tempDir, "test.csv");
      const buffer = Buffer.from([0xef, 0xbb, 0xbf, 0x53, 0x4b, 0x55]); // UTF-8 BOM + "SKU"
      fs.writeFileSync(csvPath, buffer);

      const result = detectFileTypeByMagicBytes(csvPath);
      expect(result).toBe("csv");
    });

    it("sollte Text-ähnliche Zeichen als CSV erkennen", () => {
      const csvPath = path.join(tempDir, "test.csv");
      fs.writeFileSync(csvPath, "SKU;Name;Preis", "utf-8");

      const result = detectFileTypeByMagicBytes(csvPath);
      expect(result).toBe("csv");
    });

    it("sollte null zurückgeben für unbekannte Magic Bytes", () => {
      const unknownPath = path.join(tempDir, "test.bin");
      const buffer = Buffer.from([0xff, 0xff, 0xff, 0xff]);
      fs.writeFileSync(unknownPath, buffer);

      const result = detectFileTypeByMagicBytes(unknownPath);
      expect(result).toBeNull();
    });
  });

  describe("detectFileType", () => {
    it("sollte Dateityp basierend auf Magic Bytes erkennen, wenn möglich", () => {
      // Erstelle eine DBF-Datei mit .txt Endung (sollte trotzdem als DBF erkannt werden)
      const dbfPath = path.join(tempDir, "test.txt");
      const buffer = Buffer.alloc(4);
      buffer[0] = 0x03; // dBASE III Magic Byte
      fs.writeFileSync(dbfPath, buffer);

      const result = detectFileType(dbfPath);
      expect(result).toBe("dbf");
    });

    it("sollte auf Dateiendung zurückfallen, wenn Magic Bytes nicht erkannt werden", () => {
      const csvPath = path.join(tempDir, "test.csv");
      fs.writeFileSync(csvPath, "SKU;Name", "utf-8");

      const result = detectFileType(csvPath);
      expect(result).toBe("csv");
    });

    it("sollte CSV als Default zurückgeben", () => {
      const unknownPath = path.join(tempDir, "test.unknown");
      fs.writeFileSync(unknownPath, "some content", "utf-8");

      const result = detectFileType(unknownPath);
      expect(result).toBe("csv");
    });
  });
});


