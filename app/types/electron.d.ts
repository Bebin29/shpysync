/**
 * TypeScript-Definitionen für die Electron API im Renderer-Prozess.
 * 
 * Diese Datei erweitert das window-Objekt um die electron-API,
 * die über preload.ts exponiert wird.
 */

import type { ElectronAPI } from "../../electron/preload";

declare global {
  interface Window {
    electron: ElectronAPI;
  }
}

export {};

