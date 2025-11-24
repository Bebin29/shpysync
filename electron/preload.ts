import { contextBridge, ipcRenderer } from "electron";

/**
 * Preload Script für sichere IPC-Kommunikation zwischen Renderer und Main Process.
 * 
 * Exponiert nur explizit definierte IPC-Channels, um Sicherheit zu gewährleisten.
 */

// IPC-API für den Renderer-Prozess
const electronAPI = {
  // App-Info
  getVersion: () => ipcRenderer.invoke("app:version"),

  // Sync-Funktionen (werden später implementiert)
  sync: {
    start: (config: unknown) => ipcRenderer.invoke("sync:start", config),
    cancel: () => ipcRenderer.invoke("sync:cancel"),
    onProgress: (callback: (progress: unknown) => void) => {
      ipcRenderer.on("sync:progress", (_event, data) => callback(data));
    },
    onLog: (callback: (log: unknown) => void) => {
      ipcRenderer.on("sync:log", (_event, data) => callback(data));
    },
    onComplete: (callback: (result: unknown) => void) => {
      ipcRenderer.on("sync:complete", (_event, data) => callback(data));
    },
  },

  // Config-Funktionen
  config: {
    get: () => ipcRenderer.invoke("config:get"),
    set: (config: unknown) => ipcRenderer.invoke("config:set", config),
    getShop: () => ipcRenderer.invoke("config:get-shop"),
    setShop: (shopConfig: unknown) => ipcRenderer.invoke("config:set-shop", shopConfig),
    getColumnMapping: () => ipcRenderer.invoke("config:get-column-mapping"),
    setColumnMapping: (mapping: unknown) => ipcRenderer.invoke("config:set-column-mapping", mapping),
    testConnection: (shopConfig: unknown) => ipcRenderer.invoke("config:test-connection", shopConfig),
    getLocations: (shopConfig: unknown) => ipcRenderer.invoke("config:get-locations", shopConfig),
  },

  // CSV-Funktionen (werden später implementiert)
  csv: {
    parse: (filePath: string) => ipcRenderer.invoke("csv:parse", filePath),
  },
};

// Exponiere die API im window-Objekt
contextBridge.exposeInMainWorld("electron", electronAPI);

// TypeScript-Definitionen für den Renderer
export type ElectronAPI = typeof electronAPI;

