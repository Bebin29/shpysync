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
    // Production: Preload liegt in resources/app/electron/dist/electron/preload.cjs
    // Oder in resources/app.asar/electron/dist/electron/preload.cjs (wenn asar aktiviert)
    // Verwende .cjs Extension, da electron/package.json "type": "module" hat
    const appPath = app.getAppPath();

    // Versuche verschiedene Pfade (mit und ohne ASAR)
    const possiblePaths = [
      path.join(appPath, "electron", "dist", "electron", "preload.cjs"), // Mit ASAR
      path.join(appPath, "electron", "dist", "electron", "preload.cjs"), // Ohne ASAR (gleicher Pfad)
      path.join(appPath, "dist", "electron", "preload.cjs"), // Alternative Struktur
      path.join(dirnamePath, "preload.cjs"), // Relativ zu main.js
    ];

    // Finde den ersten existierenden Pfad
    preloadPath = possiblePaths.find((p) => existsSync(p)) || possiblePaths[0];

    // Debug-Logging auch im Production Build (für Fehlerdiagnose)
    console.log("[Electron] Production Build - Preload-Pfad-Suche:");
    console.log("[Electron] appPath:", appPath);
    console.log("[Electron] dirnamePath:", dirnamePath);
    possiblePaths.forEach((p, i) => {
      console.log(
        `[Electron] Pfad ${i + 1}: ${p} - ${existsSync(p) ? "✓ existiert" : "✗ nicht gefunden"}`
      );
    });
    console.log("[Electron] Gewählter Preload-Pfad:", preloadPath);
    console.log("[Electron] Preload existiert:", existsSync(preloadPath));
  } else {
    // Dev: Preload liegt im gleichen Verzeichnis wie main.js: electron/dist/electron/preload.cjs
    // Verwende .cjs Extension, da electron/package.json "type": "module" hat
    preloadPath = path.resolve(dirnamePath, "preload.cjs");
    console.log("[Electron] Dev-Modus - Preload-Pfad:", preloadPath);
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
      webSecurity: true, // Aktiviert Web-Security (Standard, aber explizit setzen)
      sandbox: false, // Sandboxing ist für Electron-Apps mit Preload-Scripts nicht kompatibel
    },
    title: "WAWISync",
    icon: path.join(dirnamePath, "../public/icons/icon.png"), // Optional
  });

  // Blockiere RSC (React Server Components) Anfragen im statischen Export
  // Next.js versucht RSC Payloads zu laden, auch bei statischen Exports
  // Diese Anfragen schlagen im file:// Protokoll fehl und sind nicht nötig
  mainWindow.webContents.session.webRequest.onBeforeRequest((details, callback) => {
    // Blockiere Anfragen nach .txt?_rsc= (RSC Payloads)
    // RSC-Anfragen haben typischerweise das Format: /path/index.txt?_rsc=...
    if (details.url.includes("?_rsc=") || details.url.includes("/index.txt")) {
      // Prüfe ob es eine RSC-Anfrage ist
      // Entweder hat die URL den _rsc Query-Parameter oder endet mit /index.txt
      try {
        // Versuche URL zu parsen (funktioniert für absolute URLs)
        const url = new URL(details.url);
        if (url.searchParams.has("_rsc") || url.pathname.endsWith("/index.txt")) {
          console.log("[Electron] RSC-Anfrage blockiert:", details.url);
          callback({ cancel: true });
          return;
        }
      } catch {
        // Wenn URL-Parsing fehlschlägt (relative URL), prüfe String-Muster
        if (details.url.includes("?_rsc=") || details.url.endsWith("/index.txt")) {
          console.log("[Electron] RSC-Anfrage blockiert (relative URL):", details.url);
          callback({ cancel: true });
          return;
        }
      }
    }
    callback({});
  });

  // Content Security Policy (CSP) für Renderer-Prozess
  // CSP wird über session.webRequest.onHeadersReceived gesetzt
  mainWindow.webContents.session.webRequest.onHeadersReceived((details, callback) => {
    const isDev = !app.isPackaged;

    // Restriktive CSP für Production, weniger restriktiv für Development
    // WICHTIG: 'unsafe-inline' für script-src ist in Production nötig, da Next.js inline Scripts
    // für __NEXT_DATA__ und Initialisierung generiert. Für Electron-Apps akzeptabel, da
    // Context Isolation aktiviert und Node Integration deaktiviert ist.
    const csp = isDev
      ? "default-src 'self' 'unsafe-inline' 'unsafe-eval' http://localhost:* ws://localhost:*; script-src 'self' 'unsafe-inline' 'unsafe-eval' http://localhost:*; style-src 'self' 'unsafe-inline'; img-src 'self' data: http: https:; font-src 'self' data:; connect-src 'self' http://localhost:* ws://localhost:* https://*.myshopify.com;"
      : "default-src 'self'; script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline'; img-src 'self' data: https:; font-src 'self' data:; connect-src 'self' https://*.myshopify.com;";

    callback({
      responseHeaders: {
        ...details.responseHeaders,
        "Content-Security-Policy": [csp],
        "X-Content-Type-Options": ["nosniff"],
        "X-Frame-Options": ["DENY"],
        "Referrer-Policy": ["strict-origin-when-cross-origin"],
      },
    });
  });

  // Lade die Next.js App
  const isDev = !app.isPackaged;
  if (isDev) {
    mainWindow.loadURL("http://localhost:3000");
    mainWindow.webContents.openDevTools();

    // Debug: Prüfe ob Preload-Script geladen wurde
    mainWindow.webContents.on("did-finish-load", () => {
      mainWindow?.webContents
        .executeJavaScript(
          `
        console.log("[Renderer] window.electron verfügbar:", typeof window.electron !== 'undefined');
        console.log("[Renderer] window.electron:", window.electron);
      `
        )
        .catch((err) => {
          console.error("[Electron] Fehler beim Ausführen von Debug-Code:", err);
        });
    });
  } else {
    // Im Production-Build: Verwende loadURL mit file:// Protokoll
    // Base-Tag wird bereits statisch von fix-html-base-tag.js gesetzt
    const appPath = app.getAppPath();
    const outDir = path.join(appPath, "out");
    const indexPath = path.join(outDir, "index.html");

    // Debug-Logging für Production Build
    console.log("[Electron] Production Build - HTML-Pfad-Suche:");
    console.log("[Electron] appPath:", appPath);
    console.log("[Electron] outDir:", outDir);
    console.log("[Electron] indexPath:", indexPath);
    console.log("[Electron] index.html existiert:", existsSync(indexPath));

    // Konvertiere Windows-Pfad zu file:// URL
    const fileUrl = `file://${indexPath.replace(/\\/g, "/")}`;
    console.log("[Electron] Lade URL:", fileUrl);

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

  // Debug: Prüfe ob Preload-Script geladen wurde (auch im Production Build)
  mainWindow.webContents.on("did-finish-load", () => {
    mainWindow?.webContents
      .executeJavaScript(
        `
      console.log("[Renderer] window.electron verfügbar:", typeof window.electron !== 'undefined');
      if (typeof window.electron !== 'undefined') {
        console.log("[Renderer] window.electron Keys:", Object.keys(window.electron));
        console.log("[Renderer] window.electron.dashboard verfügbar:", typeof window.electron.dashboard !== 'undefined');
        if (window.electron.dashboard) {
          console.log("[Renderer] window.electron.dashboard Keys:", Object.keys(window.electron.dashboard));
        }
      }
    `
      )
      .catch((err) => {
        console.error("[Electron] Fehler beim Ausführen von Debug-Code:", err);
      });
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
import {
  getAutoSyncConfig,
  getUpdateConfig,
  getErrorReportingConfig,
} from "./services/config-service.js";
import { getUpdateService } from "./services/update-service.js";
import { getErrorMonitoringService } from "./services/error-monitoring-service.js";

// WICHTIG: Sentry MUSS vor app.whenReady() initialisiert werden
// Initialisiere Error Monitoring beim App-Start, wenn aktiviert
try {
  const errorReportingConfig = getErrorReportingConfig();
  if (errorReportingConfig.enabled) {
    const errorMonitoringService = getErrorMonitoringService();
    errorMonitoringService.setEnabled(true);
    errorMonitoringService.initialize();
  }
} catch (error) {
  // Fehler beim Initialisieren von Sentry sollten die App nicht blockieren
  console.error("[Main] Fehler beim Initialisieren von Error Monitoring:", error);
}

// App-Info Handler
ipcMain.handle("app:version", () => {
  return app.getVersion();
});

// Alle IPC-Handler registrieren
registerIpcHandlers();

// Sync-Engine und Logger mit MainWindow verbinden
app.whenReady().then(() => {
  getSyncEngine(); // Sync-Engine initialisieren
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
    logger.error(
      "system",
      `Fehler beim Starten des Auto-Sync: ${error instanceof Error ? error.message : String(error)}`
    );
  }

  // Update-Service initialisieren
  try {
    const updateService = getUpdateService();
    if (mainWindow) {
      updateService.setMainWindow(mainWindow);

      // Automatische Update-Prüfung basierend auf Config
      const updateConfig = getUpdateConfig();
      if (updateConfig.autoCheckEnabled) {
        updateService.startAutoCheck(updateConfig.autoCheckInterval);
        logger.info(
          "system",
          `Automatische Update-Prüfung aktiviert (Intervall: ${updateConfig.autoCheckInterval} Stunden)`
        );
      }
    }
  } catch (error) {
    logger.error(
      "system",
      `Fehler beim Initialisieren des Update-Services: ${error instanceof Error ? error.message : String(error)}`
    );
  }
});
