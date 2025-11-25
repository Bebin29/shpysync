import { app, BrowserWindow, ipcMain } from "electron";
import * as path from "path";
import { fileURLToPath } from "url";
import { existsSync } from "fs";

// ES-Module: dirnamePath aus import.meta.url erstellen
const filename = fileURLToPath(import.meta.url);
const dirnamePath = path.dirname(filename);

// Keep a global reference of the window object
let mainWindow: BrowserWindow | null = null;

/**
 * Erstellt das Hauptfenster der Electron-App.
 */
function createWindow(): void {
  // Preload-Pfad absolut machen (Electron benötigt absolute Pfade)
  let preloadPath: string;
  
  if (app.isPackaged) {
    // Production: Preload liegt in resources/app/electron/dist/electron/preload.js
    // Oder in resources/app.asar/electron/dist/electron/preload.js (wenn asar aktiviert)
    const appPath = app.getAppPath();
    preloadPath = path.join(appPath, "electron", "dist", "electron", "preload.js");
    
    // Fallback: Versuche auch ohne "electron" Prefix (falls Struktur anders ist)
    if (!existsSync(preloadPath)) {
      preloadPath = path.join(appPath, "dist", "electron", "preload.js");
    }
  } else {
    // Dev: Preload liegt in electron/dist/electron/preload.js
    preloadPath = path.resolve(dirnamePath, "electron", "preload.js");
  }
  
  // Debug-Logging im Dev-Modus
  if (!app.isPackaged) {
    console.log("[Electron] Preload-Pfad:", preloadPath);
    console.log("[Electron] dirnamePath:", dirnamePath);
    console.log("[Electron] Preload existiert:", existsSync(preloadPath));
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
    // Im Production-Build: Verwende loadURL mit file:// Protokoll
    // Base-Tag wird bereits statisch von fix-html-base-tag.js gesetzt
    const outDir = path.join(app.getAppPath(), "out");
    const indexPath = path.join(outDir, "index.html");
    // Konvertiere Windows-Pfad zu file:// URL
    const fileUrl = `file://${indexPath.replace(/\\/g, "/")}`;
    
    mainWindow.loadURL(fileUrl);
    
    // Navigation zu lokalen Dateien umleiten (für Next.js Router)
    mainWindow.webContents.on("will-navigate", (event, navigationUrl) => {
      const parsedUrl = new URL(navigationUrl);
      
      // Nur file:// URLs verarbeiten
      if (parsedUrl.protocol === "file:") {
        // Wenn die URL auf eine Route zeigt (z.B. file:///C:/sync/), 
        // leite sie zur entsprechenden HTML-Datei um
        const urlPath = parsedUrl.pathname;
        
        // Entferne führenden Slash und normalisiere
        let routePath = urlPath.replace(/^\/+/, "").replace(/\\/g, "/");
        
        // Wenn es eine Route ist (nicht index.html oder eine Datei)
        if (routePath && !routePath.includes(".") && routePath !== "index.html") {
          // Entferne führenden Laufwerksbuchstaben (z.B. "C:/sync/" -> "sync/")
          routePath = routePath.replace(/^[A-Z]:\//i, "");
          
          // Konstruiere Pfad zur HTML-Datei
          let htmlPath: string;
          if (routePath.endsWith("/")) {
            htmlPath = path.join(outDir, routePath, "index.html");
          } else {
            htmlPath = path.join(outDir, routePath, "index.html");
          }
          
          // Prüfe ob Datei existiert, sonst versuche ohne trailing slash
          if (!existsSync(htmlPath)) {
            htmlPath = path.join(outDir, routePath + ".html");
          }
          
          // Wenn Datei existiert, lade sie
          if (existsSync(htmlPath) && mainWindow) {
            event.preventDefault();
            const fileUrl = `file://${htmlPath.replace(/\\/g, "/")}`;
            mainWindow.loadURL(fileUrl);
          }
        }
      }
    });
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
import { getAutoSyncService } from "./services/auto-sync-service.js";
import { getAutoSyncConfig } from "./services/config-service.js";

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

  // Auto-Sync initialisieren und starten wenn enabled
  try {
    const autoSyncConfig = getAutoSyncConfig();
    if (autoSyncConfig.enabled && autoSyncConfig.csvPath && autoSyncConfig.interval) {
      const autoSyncService = getAutoSyncService();
      autoSyncService.start({
        enabled: true,
        interval: autoSyncConfig.interval,
        csvPath: autoSyncConfig.csvPath,
      });
      logger.info("system", "Auto-Sync beim App-Start gestartet");
    }
  } catch (error) {
    logger.error("system", `Fehler beim Starten des Auto-Sync: ${error instanceof Error ? error.message : String(error)}`);
  }
});

