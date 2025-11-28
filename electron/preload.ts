import { contextBridge, ipcRenderer } from "electron";
import type { SyncProgress, SyncLog, SyncResult, PlannedOperation, SyncStartConfig, SyncPreviewRequest, SyncPreviewResponse, SyncTestRequest, AppConfig, CacheStats, DashboardStats, SyncHistoryEntry, UpdateInfo, UpdateStatus } from "./types/ipc.js";
import type { AutoSyncStatus } from "./services/auto-sync-service.js";

/**
 * Preload Script für sichere IPC-Kommunikation zwischen Renderer und Main Process.
 * 
 * Exponiert nur explizit definierte IPC-Channels, um Sicherheit zu gewährleisten.
 */

// IPC-API für den Renderer-Prozess
const electronAPI = {
	// Test-Funktion (für Phase 1 - IPC-Verbindungstest)
	ping: () => ipcRenderer.invoke("ping") as Promise<string>,

	// App-Info
	getVersion: () => ipcRenderer.invoke("app:version"),

	// Sync-Funktionen
	sync: {
		preview: (config: SyncPreviewRequest) => ipcRenderer.invoke("sync:preview", config) as Promise<SyncPreviewResponse>,
		start: (config: SyncStartConfig) => ipcRenderer.invoke("sync:start", config) as Promise<{ success: boolean; message?: string; error?: string }>,
		test: (config: SyncTestRequest) => ipcRenderer.invoke("sync:test", config) as Promise<{ success: boolean; message?: string; error?: string }>,
		cancel: () => ipcRenderer.invoke("sync:cancel") as Promise<{ success: boolean; message?: string; error?: string }>,
		onProgress: (callback: (progress: SyncProgress) => void) => {
			ipcRenderer.on("sync:progress", (_event, data: SyncProgress) => callback(data));
		},
		onLog: (callback: (log: SyncLog) => void) => {
			ipcRenderer.on("sync:log", (_event, data: SyncLog) => callback(data));
		},
		onPreviewReady: (callback: (operations: PlannedOperation[]) => void) => {
			ipcRenderer.on("sync:previewReady", (_event, data: PlannedOperation[]) => callback(data));
		},
		onComplete: (callback: (result: SyncResult) => void) => {
			ipcRenderer.on("sync:complete", (_event, data: SyncResult) => callback(data));
		},
		removeAllListeners: (channel: string) => {
			ipcRenderer.removeAllListeners(channel);
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

	// CSV-Funktionen
	csv: {
		parse: (filePath: string) => ipcRenderer.invoke("csv:parse", filePath),
		selectFile: () => ipcRenderer.invoke("csv:select-file"),
		getHeaders: (filePath: string) => ipcRenderer.invoke("csv:get-headers", filePath),
		preview: (config: {
			filePath: string;
			mapping: unknown;
			maxRows?: number;
		}) => ipcRenderer.invoke("csv:preview", config),
	},

	// Auto-Sync-Funktionen
	autoSync: {
		getStatus: () => ipcRenderer.invoke("autoSync:getStatus") as Promise<AutoSyncStatus>,
		start: () => ipcRenderer.invoke("autoSync:start") as Promise<{ success: boolean; error?: string }>,
		stop: () => ipcRenderer.invoke("autoSync:stop") as Promise<{ success: boolean; error?: string }>,
		getConfig: () => ipcRenderer.invoke("autoSync:getConfig") as Promise<AppConfig["autoSync"]>,
		setConfig: (config: AppConfig["autoSync"]) => ipcRenderer.invoke("autoSync:setConfig", config) as Promise<{ success: boolean; error?: string }>,
		testSync: (csvPath: string) => ipcRenderer.invoke("autoSync:testSync", csvPath) as Promise<{ success: boolean; error?: string }>,
	},

	// Cache-Funktionen
	cache: {
		getStats: () => ipcRenderer.invoke("cache:get-stats") as Promise<CacheStats>,
		rebuild: () => ipcRenderer.invoke("cache:rebuild") as Promise<void>,
		clear: () => ipcRenderer.invoke("cache:clear") as Promise<void>,
	},

	// Dashboard-Funktionen
	dashboard: {
		getStats: () => ipcRenderer.invoke("dashboard:get-stats") as Promise<DashboardStats>,
		getHistory: (limit?: number) => ipcRenderer.invoke("dashboard:get-history", limit) as Promise<SyncHistoryEntry[]>,
	},

	// Update-Funktionen
	update: {
		check: () => ipcRenderer.invoke("update:check") as Promise<{ success: boolean; error?: string }>,
		download: () => ipcRenderer.invoke("update:download") as Promise<{ success: boolean; error?: string }>,
		install: () => ipcRenderer.invoke("update:install") as Promise<{ success: boolean; error?: string }>,
		getStatus: () => ipcRenderer.invoke("update:get-status") as Promise<UpdateStatus>,
		onChecking: (callback: () => void) => {
			ipcRenderer.on("update:checking-for-update", () => callback());
		},
		onAvailable: (callback: (info: UpdateInfo) => void) => {
			ipcRenderer.on("update:update-available", (_event, info: UpdateInfo) => callback(info));
		},
		onNotAvailable: (callback: () => void) => {
			ipcRenderer.on("update:update-not-available", () => callback());
		},
		onDownloadProgress: (callback: (progress: { percent: number; transferred: number; total: number }) => void) => {
			ipcRenderer.on("update:update-download-progress", (_event, progress) => callback(progress));
		},
		onDownloaded: (callback: () => void) => {
			ipcRenderer.on("update:update-downloaded", () => callback());
		},
		onError: (callback: (error: { message: string }) => void) => {
			ipcRenderer.on("update:update-error", (_event, error: { message: string }) => callback(error));
		},
		removeAllListeners: (channel: string) => {
			ipcRenderer.removeAllListeners(channel);
		},
	},
};

// Exponiere die API im window-Objekt
try {
	contextBridge.exposeInMainWorld("electron", electronAPI);
	console.log("[Preload] Electron API erfolgreich exponiert");
	console.log("[Preload] Dashboard verfügbar:", typeof electronAPI.dashboard !== "undefined");
	console.log("[Preload] Dashboard Keys:", electronAPI.dashboard ? Object.keys(electronAPI.dashboard) : "N/A");
} catch (error) {
	console.error("[Preload] Fehler beim Exponieren der Electron API:", error);
	// Versuche zumindest eine minimale API zu exponieren
	try {
		contextBridge.exposeInMainWorld("electron", {
			ping: electronAPI.ping,
			dashboard: electronAPI.dashboard,
		});
		console.log("[Preload] Minimale Electron API exponiert (Fallback)");
	} catch (fallbackError) {
		console.error("[Preload] Fehler beim Exponieren der minimalen API:", fallbackError);
	}
}

// TypeScript-Definitionen für den Renderer
export type ElectronAPI = typeof electronAPI;
