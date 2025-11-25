/**
 * TypeScript-Definitionen für die Electron API im Renderer-Prozess.
 * 
 * Diese Datei erweitert das window-Objekt um die electron-API,
 * die über preload.ts exponiert wird.
 */

import type { ElectronAPI } from "../../electron/preload";
import type { DashboardStats, SyncHistoryEntry, CacheStats } from "../../electron/types/ipc";

declare global {
  interface Window {
    electron: ElectronAPI;
  }
}

// Re-export Types für Verwendung in React-Komponenten
export type { DashboardStats, SyncHistoryEntry, CacheStats };

export {};

