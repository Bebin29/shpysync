"use client";

import { useState, useEffect, useCallback } from "react";
import type { ShopConfig, ColumnMapping } from "../../electron/types/ipc";

/**
 * Hook für Konfigurations-Management.
 */
export function useConfig() {
  const [shopConfig, setShopConfigState] = useState<ShopConfig | null>(null);
  const [columnMapping, setColumnMappingState] = useState<ColumnMapping | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Lade Konfiguration beim Mount
  useEffect(() => {
    loadConfig();
  }, []);

  const loadConfig = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      if (typeof window !== "undefined" && window.electron) {
        const shop = await window.electron.config.getShop();
        const mapping = await window.electron.config.getColumnMapping();

        setShopConfigState(shop);
        setColumnMappingState(mapping);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Fehler beim Laden der Konfiguration");
    } finally {
      setLoading(false);
    }
  }, []);

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
  };
}

