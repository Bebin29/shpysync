import { app, BrowserWindow, ipcMain } from "electron";
import * as path from "path";
import { fileURLToPath } from "url";
import { dirname } from "path";

// ES Module __dirname equivalent
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Keep a global reference of the window object
let mainWindow: BrowserWindow | null = null;

/**
 * Erstellt das Hauptfenster der Electron-App.
 */
function createWindow(): void {
  mainWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    webPreferences: {
      contextIsolation: true, // WICHTIG: Verhindert XSS → RCE
      nodeIntegration: false, // WICHTIG: Kein direkter Node-Zugriff
      preload: path.join(__dirname, "preload.js"),
    },
    title: "WAWISync",
    icon: path.join(__dirname, "../public/icons/icon.png"), // Optional
  });

  // Lade die Next.js App
  const isDev = process.env.NODE_ENV === "development";
  if (isDev) {
    mainWindow.loadURL("http://localhost:3000");
    mainWindow.webContents.openDevTools();
  } else {
    mainWindow.loadFile(path.join(__dirname, "../out/index.html"));
  }

  mainWindow.on("closed", () => {
    mainWindow = null;
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
import { registerIpcHandlers } from "./services/ipc-handlers";

// App-Info Handler
ipcMain.handle("app:version", () => {
  return app.getVersion();
});

// Alle IPC-Handler registrieren
registerIpcHandlers();

