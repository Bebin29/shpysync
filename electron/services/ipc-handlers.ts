import { ipcMain } from "electron";
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
}

