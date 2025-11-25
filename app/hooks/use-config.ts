"use client";

import { useState, useEffect, useCallback } from "react";
import type { ShopConfig, ColumnMapping, AppConfig } from "../../electron/types/ipc";
import type { AutoSyncStatus } from "../../electron/services/auto-sync-service";

/**
 * Hook für Konfigurations-Management.
 */
export function useConfig() {
  const [shopConfig, setShopConfigState] = useState<ShopConfig | null>(null);
  const [columnMapping, setColumnMappingState] = useState<ColumnMapping | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadConfig = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      // Prüfe explizit, ob wir im Browser sind und Electron verfügbar ist
      if (typeof window === "undefined" || !window.electron) {
        setLoading(false);
        return;
      }

      const shop = await window.electron.config.getShop();
      const mapping = await window.electron.config.getColumnMapping();

      setShopConfigState(shop);
      setColumnMappingState(mapping);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Fehler beim Laden der Konfiguration");
    } finally {
      setLoading(false);
    }
  }, []);

  // Lade Konfiguration beim Mount (nur im Browser)
  useEffect(() => {
    if (typeof window !== "undefined" && window.electron) {
      loadConfig();
    } else {
      setLoading(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // loadConfig ist stabil (useCallback ohne Dependencies)

  const saveShopConfig = useCallback(async (config: ShopConfig | null) => {
    try {
      setError(null);
      if (typeof window !== "undefined" && window.electron) {
        await window.electron.config.setShop(config);
        setShopConfigState(config);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Fehler beim Speichern der Konfiguration");
      throw err;
    }
  }, []);

  const saveColumnMapping = useCallback(async (mapping: ColumnMapping | null) => {
    try {
      setError(null);
      if (typeof window !== "undefined" && window.electron) {
        await window.electron.config.setColumnMapping(mapping);
        setColumnMappingState(mapping);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Fehler beim Speichern des Mappings");
      throw err;
    }
  }, []);

  const testConnection = useCallback(async (config: ShopConfig) => {
    try {
      setError(null);
      if (typeof window !== "undefined" && window.electron) {
        return await window.electron.config.testConnection(config);
      }
      return { success: false, message: "Electron API nicht verfügbar" };
    } catch (err) {
      const message = err instanceof Error ? err.message : "Unbekannter Fehler";
      setError(message);
      return { success: false, message };
    }
  }, []);

  const getLocations = useCallback(async (config: ShopConfig) => {
    try {
      setError(null);
      if (typeof window !== "undefined" && window.electron) {
        return await window.electron.config.getLocations(config);
      }
      return [];
    } catch (err) {
      const message = err instanceof Error ? err.message : "Unbekannter Fehler";
      setError(message);
      return [];
    }
  }, []);

  // Auto-Sync-State
  const [autoSyncConfig, setAutoSyncConfigState] = useState<AppConfig["autoSync"] | null>(null);
  const [autoSyncStatus, setAutoSyncStatusState] = useState<AutoSyncStatus | null>(null);
  const [autoSyncLoading, setAutoSyncLoading] = useState(false);

  // Lade Auto-Sync-Config
  const loadAutoSyncConfig = useCallback(async () => {
    try {
      setAutoSyncLoading(true);
      setError(null);

      if (typeof window === "undefined" || !window.electron) {
        setAutoSyncLoading(false);
        return;
      }

      const config = await window.electron.autoSync.getConfig();
      setAutoSyncConfigState(config);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Fehler beim Laden der Auto-Sync-Config");
    } finally {
      setAutoSyncLoading(false);
    }
  }, []);

  // Lade Auto-Sync-Status
  const loadAutoSyncStatus = useCallback(async () => {
    try {
      if (typeof window === "undefined" || !window.electron) {
        return;
      }

      const status = await window.electron.autoSync.getStatus();
      setAutoSyncStatusState(status);
    } catch (err) {
      console.error("Fehler beim Laden des Auto-Sync-Status:", err);
    }
  }, []);

  // Lade Auto-Sync-Daten beim Mount
  useEffect(() => {
    if (typeof window !== "undefined" && window.electron) {
      loadAutoSyncConfig();
      loadAutoSyncStatus();
      
      // Aktualisiere Status regelmäßig (alle 5 Sekunden)
      const interval = setInterval(() => {
        loadAutoSyncStatus();
      }, 5000);

      return () => clearInterval(interval);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Speichere Auto-Sync-Config
  const saveAutoSyncConfig = useCallback(async (config: AppConfig["autoSync"]) => {
    try {
      setError(null);
      if (typeof window !== "undefined" && window.electron) {
        await window.electron.autoSync.setConfig(config);
        setAutoSyncConfigState(config);
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : "Fehler beim Speichern der Auto-Sync-Config";
      setError(message);
      throw err;
    }
  }, []);

  // Starte Auto-Sync
  const startAutoSync = useCallback(async () => {
    try {
      setError(null);
      if (typeof window !== "undefined" && window.electron) {
        await window.electron.autoSync.start();
        await loadAutoSyncStatus();
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : "Fehler beim Starten des Auto-Sync";
      setError(message);
      throw err;
    }
  }, [loadAutoSyncStatus]);

  // Stoppe Auto-Sync
  const stopAutoSync = useCallback(async () => {
    try {
      setError(null);
      if (typeof window !== "undefined" && window.electron) {
        await window.electron.autoSync.stop();
        await loadAutoSyncStatus();
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : "Fehler beim Stoppen des Auto-Sync";
      setError(message);
      throw err;
    }
  }, [loadAutoSyncStatus]);

  // Test-Sync
  const testAutoSync = useCallback(async (csvPath: string) => {
    try {
      setError(null);
      if (typeof window !== "undefined" && window.electron) {
        await window.electron.autoSync.testSync(csvPath);
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : "Fehler beim Test-Sync";
      setError(message);
      throw err;
    }
  }, []);

  return {
    shopConfig,
    columnMapping,
    loading,
    error,
    loadConfig,
    saveShopConfig,
    saveColumnMapping,
    testConnection,
    getLocations,
    // Auto-Sync
    autoSyncConfig,
    autoSyncStatus,
    autoSyncLoading,
    loadAutoSyncConfig,
    loadAutoSyncStatus,
    saveAutoSyncConfig,
    startAutoSync,
    stopAutoSync,
    testAutoSync,
  };
}

