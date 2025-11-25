import { app, BrowserWindow, ipcMain } from "electron";
import * as path from "path";
import { fileURLToPath } from "url";
import { dirname } from "path";

// ES Module __dirname equivalent
const filename = fileURLToPath(import.meta.url);
const dirnamePath = dirname(filename);

// Keep a global reference of the window object
let mainWindow: BrowserWindow | null = null;

/**
 * Erstellt das Hauptfenster der Electron-App.
 */
function createWindow(): void {
  // Preload-Pfad absolut machen (Electron benötigt absolute Pfade)
  const preloadPath = path.resolve(dirnamePath, "preload.js");
  
  // Debug-Logging im Dev-Modus
  if (!app.isPackaged) {
    console.log("[Electron] Preload-Pfad:", preloadPath);
    console.log("[Electron] dirnamePath:", dirnamePath);
  }
  
  mainWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    webPreferences: {
      contextIsolation: true, // WICHTIG: Verhindert XSS → RCE
      nodeIntegration: false, // WICHTIG: Kein direkter Node-Zugriff
      preload: preloadPath,
    },
    title: "WAWISync",
    icon: path.join(dirnamePath, "../public/icons/icon.png"), // Optional
  });

  // Lade die Next.js App
  const isDev = !app.isPackaged;
  if (isDev) {
    mainWindow.loadURL("http://localhost:3000");
    mainWindow.webContents.openDevTools();
    
    // Debug: Prüfe ob Preload-Script geladen wurde
    mainWindow.webContents.on("did-finish-load", () => {
      mainWindow?.webContents.executeJavaScript(`
        console.log("[Renderer] window.electron verfügbar:", typeof window.electron !== 'undefined');
        console.log("[Renderer] window.electron:", window.electron);
      `).catch((err) => {
        console.error("[Electron] Fehler beim Ausführen von Debug-Code:", err);
      });
    });
  } else {
    mainWindow.loadFile(path.join(dirnamePath, "../out/index.html"));
  }

  mainWindow.on("closed", () => {
    mainWindow = null;
  });
  
  // Fehlerbehandlung für Preload-Script
  mainWindow.webContents.on("preload-error", (_event, _preloadPath, error) => {
    console.error("[Electron] Fehler beim Laden des Preload-Scripts:", error);
    console.error("[Electron] Preload-Pfad:", preloadPath);
  });
}

// App-Lifecycle
app.whenReady().then(() => {
  createWindow();

  app.on("activate", () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
});

app.on("window-all-closed", () => {
  if (process.platform !== "darwin") {
    app.quit();
  }
});

// IPC-Handler registrieren
import { registerIpcHandlers } from "./services/ipc-handlers.js";
import { getSyncEngine } from "./services/sync-engine.js";
import { getLogger } from "./services/logger.js";

// App-Info Handler
ipcMain.handle("app:version", () => {
  return app.getVersion();
});

// Alle IPC-Handler registrieren
registerIpcHandlers();

// Sync-Engine und Logger mit MainWindow verbinden
app.whenReady().then(() => {
  const syncEngine = getSyncEngine();
  const logger = getLogger();
  
  // MainWindow wird später in ipc-handlers.ts gesetzt, wenn sync:start aufgerufen wird
  // Logger wird automatisch initialisiert, wenn SyncEngine.setMainWindow() aufgerufen wird
});

