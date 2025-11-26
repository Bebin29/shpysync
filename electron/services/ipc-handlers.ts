import { ipcMain, dialog, BrowserWindow } from "electron";
import type {
  ShopConfig,
  AppConfig,
  ColumnMapping,
  SyncStartConfig,
  SyncPreviewRequest,
  SyncPreviewResponse,
  SyncTestRequest,
} from "../types/ipc.js";
import {
  getConfig,
  setConfig,
  getShopConfig,
  setShopConfig,
  getDefaultColumnMapping,
  setDefaultColumnMapping,
  validateShopConfig,
  getAutoSyncConfig,
  setAutoSyncConfig,
} from "./config-service.js";
import { testConnection, getLocations } from "./shopify-service.js";
import { previewCsvWithMapping, createColumnNameToLetterMap } from "./csv-service.js";
import { getSyncEngine } from "./sync-engine.js";
import { errorToErrorInfo } from "./error-handler.js";
import { WawiError } from "../../core/domain/errors.js";
import { getAutoSyncService, type AutoSyncConfig, type AutoSyncStatus } from "./auto-sync-service.js";
import { getCacheService } from "./cache-service.js";
import { getSyncHistoryService } from "./sync-history-service.js";
import { getAllProductsWithVariants } from "./shopify-product-service.js";
import type { CacheStats, DashboardStats, SyncHistoryEntry } from "../types/ipc.js";

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
      try {
        // Validiere zuerst die Konfiguration
        const validation = validateShopConfig(shopConfig);
        if (!validation.valid) {
          return {
            success: false,
            message: `Konfiguration ungültig: ${validation.errors.join(", ")}`,
            errorCode: "CONFIG_INVALID",
            errorSeverity: "error" as const,
          };
        }

        // Teste die Verbindung
        return testConnection({
          shopUrl: shopConfig.shopUrl,
          accessToken: shopConfig.accessToken,
        });
      } catch (error) {
        const errorInfo = errorToErrorInfo(error);
        return {
          success: false,
          message: errorInfo.userMessage,
          errorCode: errorInfo.code,
          errorSeverity: errorInfo.severity,
        };
      }
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
      const { parseCsvPreview } = await import("../../core/infra/csv/parser.js");
      const result = await parseCsvPreview(filePath, 1); // Nur erste Zeile für Header
      return {
        success: true,
        headers: result.headers,
        encoding: result.encoding,
      };
    } catch (error) {
      const errorInfo = errorToErrorInfo(error);
      console.error("Fehler beim Laden der CSV-Header:", errorInfo);
      return {
        success: false,
        error: errorInfo.userMessage,
        errorCode: errorInfo.code,
        errorSeverity: errorInfo.severity,
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
        const errorInfo = errorToErrorInfo(error);
        console.error("Fehler beim CSV-Preview:", errorInfo);
        return {
          success: false,
          error: errorInfo.userMessage,
          errorCode: errorInfo.code,
          errorSeverity: errorInfo.severity,
        };
      }
    }
  );

  // Sync-Handler
  ipcMain.handle("sync:preview", async (_event, config: SyncPreviewRequest): Promise<SyncPreviewResponse> => {
    try {
      // DEBUG: Log das Token vor der Validierung
      console.log("DEBUG - Token vor Validierung:", {
        tokenPrefix: config.shopConfig.accessToken?.substring(0, 15),
        tokenLength: config.shopConfig.accessToken?.length,
        tokenStartsWithShpat: config.shopConfig.accessToken?.startsWith("shpat_"),
        tokenStartsWithShpca: config.shopConfig.accessToken?.startsWith("shpca_"),
        shopUrl: config.shopConfig.shopUrl,
      });

      // Validiere Konfiguration (nicht-strikt für Token-Format, da API-Verbindung der beste Test ist)
      const validation = validateShopConfig(config.shopConfig);
      if (!validation.valid) {
        console.error("DEBUG - Validierungsfehler:", validation.errors);
        return {
          success: false,
          error: `Konfiguration ungültig: ${validation.errors.join(", ")}`,
        };
      }

      // Hole Sync-Engine
      const syncEngine = getSyncEngine();

      // Generiere Vorschau (ohne Ausführung)
      const preview = await syncEngine.generatePreview(config);

      return {
        success: true,
        data: {
          planned: preview.planned,
          unmatchedRows: preview.unmatchedRows,
        },
      };
    } catch (error) {
      const errorInfo = errorToErrorInfo(error);
      console.error("Fehler beim Generieren der Vorschau:", errorInfo);
      return {
        success: false,
        error: errorInfo.userMessage,
        errorCode: errorInfo.code,
        errorSeverity: errorInfo.severity,
      };
    }
  });

  ipcMain.handle("sync:start", async (event, config: SyncStartConfig) => {
    try {
      // Validiere Konfiguration
      const validation = validateShopConfig(config.shopConfig);
      if (!validation.valid) {
        return {
          success: false,
          error: `Konfiguration ungültig: ${validation.errors.join(", ")}`,
        };
      }

      // Hole Sync-Engine und setze MainWindow
      const syncEngine = getSyncEngine();
      const window = BrowserWindow.fromWebContents(event.sender);
      syncEngine.setMainWindow(window);

      // Starte Sync (asynchron, Events werden über IPC gesendet)
      syncEngine.startSync(config).catch((error) => {
        console.error("Fehler beim Sync:", error);
        // Fehler wird bereits über sync:complete Event gesendet
      });

      return {
        success: true,
        message: "Synchronisation gestartet",
      };
    } catch (error) {
      const errorInfo = errorToErrorInfo(error);
      console.error("Fehler beim Starten des Syncs:", errorInfo);
      return {
        success: false,
        error: errorInfo.userMessage,
        errorCode: errorInfo.code,
        errorSeverity: errorInfo.severity,
      };
    }
  });

  ipcMain.handle("sync:cancel", async () => {
    try {
      const syncEngine = getSyncEngine();
      syncEngine.cancel();
      return {
        success: true,
        message: "Synchronisation abgebrochen",
      };
    } catch (error) {
      const errorInfo = errorToErrorInfo(error);
      console.error("Fehler beim Abbrechen des Syncs:", errorInfo);
      return {
        success: false,
        error: errorInfo.userMessage,
        errorCode: errorInfo.code,
        errorSeverity: errorInfo.severity,
      };
    }
  });

  ipcMain.handle("sync:test", async (event, config: SyncTestRequest) => {
    try {
      // Validiere Konfiguration
      const validation = validateShopConfig(config.shopConfig);
      if (!validation.valid) {
        return {
          success: false,
          error: `Konfiguration ungültig: ${validation.errors.join(", ")}`,
        };
      }

      // Hole Sync-Engine und setze MainWindow
      const syncEngine = getSyncEngine();
      const window = BrowserWindow.fromWebContents(event.sender);
      syncEngine.setMainWindow(window);

      // Starte Test-Sync (asynchron, Events werden über IPC gesendet)
      syncEngine.testSync(config.shopConfig, config.plannedOperations).catch((error) => {
        console.error("Fehler beim Test-Sync:", error);
        // Fehler wird bereits über sync:complete Event gesendet
      });

      return {
        success: true,
        message: "Test-Synchronisation gestartet",
      };
    } catch (error) {
      console.error("Fehler beim Starten des Test-Syncs:", error);
      return {
        success: false,
        error: error instanceof Error ? error.message : "Unbekannter Fehler",
      };
    }
  });

  // Auto-Sync-Handler
  ipcMain.handle("autoSync:getStatus", async (): Promise<AutoSyncStatus> => {
    const autoSyncService = getAutoSyncService();
    return autoSyncService.getStatus();
  });

  ipcMain.handle("autoSync:start", async (): Promise<{ success: boolean; error?: string }> => {
    try {
      const autoSyncConfig = getAutoSyncConfig();
      
      if (!autoSyncConfig.enabled) {
        return {
          success: false,
          error: "Auto-Sync ist nicht aktiviert",
        };
      }

      if (!autoSyncConfig.csvPath) {
        return {
          success: false,
          error: "CSV-Pfad ist nicht konfiguriert",
        };
      }

      if (!autoSyncConfig.interval || autoSyncConfig.interval <= 0) {
        return {
          success: false,
          error: "Intervall ist nicht konfiguriert",
        };
      }

      const autoSyncService = getAutoSyncService();
      autoSyncService.start({
        enabled: true,
        interval: autoSyncConfig.interval,
        csvPath: autoSyncConfig.csvPath,
      });

      return {
        success: true,
      };
    } catch (error) {
      const errorInfo = errorToErrorInfo(error);
      return {
        success: false,
        error: errorInfo.userMessage,
      };
    }
  });

  ipcMain.handle("autoSync:stop", async (): Promise<{ success: boolean; error?: string }> => {
    try {
      const autoSyncService = getAutoSyncService();
      autoSyncService.stop();
      return {
        success: true,
      };
    } catch (error) {
      const errorInfo = errorToErrorInfo(error);
      return {
        success: false,
        error: errorInfo.userMessage,
      };
    }
  });

  ipcMain.handle("autoSync:getConfig", async (): Promise<AppConfig["autoSync"]> => {
    return getAutoSyncConfig();
  });

  ipcMain.handle(
    "autoSync:setConfig",
    async (_event, config: AppConfig["autoSync"]): Promise<{ success: boolean; error?: string }> => {
      try {
        setAutoSyncConfig(config);
        return {
          success: true,
        };
      } catch (error) {
        const errorInfo = errorToErrorInfo(error);
        return {
          success: false,
          error: errorInfo.userMessage,
        };
      }
    }
  );

  ipcMain.handle(
    "autoSync:testSync",
    async (_event, csvPath: string): Promise<{ success: boolean; error?: string }> => {
      try {
        const autoSyncService = getAutoSyncService();
        await autoSyncService.executeTestSync(csvPath);
        return {
          success: true,
        };
      } catch (error) {
        const errorInfo = errorToErrorInfo(error);
        return {
          success: false,
          error: errorInfo.userMessage,
        };
      }
    }
  );

  // Cache-Handler
  ipcMain.handle("cache:get-stats", async (): Promise<CacheStats> => {
    try {
      const cacheService = getCacheService();
      cacheService.initialize();
      return cacheService.getCacheStats();
    } catch (error) {
      const errorInfo = errorToErrorInfo(error);
      throw new Error(errorInfo.userMessage);
    }
  });

  ipcMain.handle("cache:rebuild", async (): Promise<void> => {
    try {
      const shopConfig = getShopConfig();
      if (!shopConfig) {
        throw new Error("Keine Shop-Konfiguration vorhanden");
      }

      // Alle Produkte von Shopify laden
      const products = await getAllProductsWithVariants(
        {
          shopUrl: shopConfig.shopUrl,
          accessToken: shopConfig.accessToken,
        },
        shopConfig.locationId // Location-ID für Inventory-Levels übergeben
      );

      // Cache aktualisieren
      const cacheService = getCacheService();
      cacheService.initialize();
      cacheService.saveProducts(products);
    } catch (error) {
      const errorInfo = errorToErrorInfo(error);
      throw new Error(errorInfo.userMessage);
    }
  });

  ipcMain.handle("cache:clear", async (): Promise<void> => {
    try {
      const cacheService = getCacheService();
      cacheService.initialize();
      cacheService.clearCache();
    } catch (error) {
      const errorInfo = errorToErrorInfo(error);
      throw new Error(errorInfo.userMessage);
    }
  });

  // Dashboard-Handler
  ipcMain.handle("dashboard:get-stats", async (): Promise<DashboardStats> => {
    try {
      const cacheService = getCacheService();
      const historyService = getSyncHistoryService();

      // Cache initialisieren und Stats laden
      let cacheStats: CacheStats = {
        productCount: 0,
        variantCount: 0,
        lastUpdate: null,
        schemaVersion: 1,
        dbPath: "nicht initialisiert",
      };
      try {
        cacheService.initialize();
        cacheStats = cacheService.getCacheStats();
      } catch (error) {
        // Cache-Initialisierung kann fehlschlagen, wenn app nicht ready ist
        // Verwende Standardwerte
      }

      const historyStats = historyService.getHistoryStats();

      return {
        totalProducts: cacheStats.productCount,
        totalVariants: cacheStats.variantCount,
        lastSync: historyStats.lastSync,
        syncSuccess: historyStats.success,
        syncFailed: historyStats.failed,
        cacheLastUpdate: cacheStats.lastUpdate,
      };
    } catch (error) {
      const errorInfo = errorToErrorInfo(error);
      throw new Error(errorInfo.userMessage);
    }
  });

  ipcMain.handle("dashboard:get-history", async (_event, limit?: number): Promise<SyncHistoryEntry[]> => {
    try {
      const historyService = getSyncHistoryService();
      return historyService.getSyncHistory(limit);
    } catch (error) {
      const errorInfo = errorToErrorInfo(error);
      throw new Error(errorInfo.userMessage);
    }
  });
}

