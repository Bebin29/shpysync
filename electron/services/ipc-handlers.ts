import { ipcMain, dialog } from "electron";
import type {
  ShopConfig,
  AppConfig,
  ColumnMapping,
} from "../types/ipc";
import {
  getConfig,
  setConfig,
  getShopConfig,
  setShopConfig,
  getDefaultColumnMapping,
  setDefaultColumnMapping,
  validateShopConfig,
} from "./config-service";
import { testConnection, getLocations } from "./shopify-service";
import { previewCsvWithMapping, createColumnNameToLetterMap } from "./csv-service";

/**
 * Registriert alle IPC-Handler für die Electron-App.
 */
export function registerIpcHandlers(): void {
  // Test-Handler (für Phase 1 - IPC-Verbindungstest)
  ipcMain.handle("ping", async (): Promise<string> => {
    return "pong";
  });

  // Config-Handler
  ipcMain.handle("config:get", async (): Promise<AppConfig> => {
    return getConfig();
  });

  ipcMain.handle("config:set", async (_event, config: AppConfig): Promise<void> => {
    setConfig(config);
  });

  ipcMain.handle("config:get-shop", async (): Promise<ShopConfig | null> => {
    return getShopConfig();
  });

  ipcMain.handle(
    "config:set-shop",
    async (_event, shopConfig: ShopConfig | null): Promise<void> => {
      setShopConfig(shopConfig);
    }
  );

  ipcMain.handle(
    "config:get-column-mapping",
    async (): Promise<ColumnMapping | null> => {
      return getDefaultColumnMapping();
    }
  );

  ipcMain.handle(
    "config:set-column-mapping",
    async (_event, mapping: ColumnMapping | null): Promise<void> => {
      setDefaultColumnMapping(mapping);
    }
  );

  ipcMain.handle(
    "config:test-connection",
    async (_event, shopConfig: ShopConfig) => {
      // Validiere zuerst die Konfiguration
      const validation = validateShopConfig(shopConfig);
      if (!validation.valid) {
        return {
          success: false,
          message: `Konfiguration ungültig: ${validation.errors.join(", ")}`,
        };
      }

      // Teste die Verbindung
      return testConnection({
        shopUrl: shopConfig.shopUrl,
        accessToken: shopConfig.accessToken,
      });
    }
  );

  ipcMain.handle(
    "config:get-locations",
    async (_event, shopConfig: ShopConfig) => {
      return getLocations({
        shopUrl: shopConfig.shopUrl,
        accessToken: shopConfig.accessToken,
      });
    }
  );

  // CSV-Handler
  ipcMain.handle("csv:select-file", async () => {
    try {
      const result = await dialog.showOpenDialog({
        title: "CSV-Datei auswählen",
        filters: [
          { name: "CSV-Dateien", extensions: ["csv"] },
          { name: "Alle Dateien", extensions: ["*"] },
        ],
        properties: ["openFile"],
      });

      if (result.canceled || result.filePaths.length === 0) {
        return { success: false, filePath: null };
      }

      return {
        success: true,
        filePath: result.filePaths[0],
      };
    } catch (error) {
      console.error("Fehler beim Dateiauswahl-Dialog:", error);
      return {
        success: false,
        error: error instanceof Error ? error.message : "Unbekannter Fehler",
        filePath: null,
      };
    }
  });

  ipcMain.handle("csv:get-headers", async (_event, filePath: string) => {
    try {
      const { parseCsvPreview } = await import("../../core/infra/csv/parser");
      const result = await parseCsvPreview(filePath, 1); // Nur erste Zeile für Header
      return {
        success: true,
        headers: result.headers,
        encoding: result.encoding,
      };
    } catch (error) {
      console.error("Fehler beim Laden der CSV-Header:", error);
      return {
        success: false,
        error: error instanceof Error ? error.message : "Unbekannter Fehler",
        headers: [],
      };
    }
  });

  ipcMain.handle(
    "csv:preview",
    async (
      _event,
      {
        filePath,
        mapping,
        maxRows = 200,
      }: {
        filePath: string;
        mapping: ColumnMapping;
        maxRows?: number;
      }
    ) => {
      try {
        const result = await previewCsvWithMapping(filePath, mapping, maxRows);
        
        // Konvertiere für IPC: Füge Spaltenname-zu-Buchstabe-Mapping hinzu
        const columnNameToLetterMap = createColumnNameToLetterMap(result.headers);
        const columnNameToLetter: Record<string, string> = {};
        columnNameToLetterMap.forEach((letter, name) => {
          columnNameToLetter[name] = letter;
        });

        return {
          success: true,
          data: {
            headers: result.headers,
            encoding: result.encoding,
            totalRows: result.totalRows,
            previewRows: result.previewRows,
            columnMapping: result.columnMapping,
            columnNameToLetter, // Hilfs-Mapping für UI
          },
        };
      } catch (error) {
        console.error("Fehler beim CSV-Preview:", error);
        return {
          success: false,
          error: error instanceof Error ? error.message : "Unbekannter Fehler",
        };
      }
    }
  );
}

