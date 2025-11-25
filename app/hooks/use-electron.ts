"use client";

import { useCallback } from "react";
import type {
	SyncStartConfig,
	SyncPreviewRequest,
	SyncPreviewResponse,
	SyncProgress,
	SyncLog,
	SyncResult,
	CsvParseResult,
	ColumnMapping,
	PlannedOperation,
	SyncTestRequest,
	AppConfig,
} from "../../electron/types/ipc";
import type { AutoSyncStatus } from "../../electron/services/auto-sync-service";

/**
 * Typsichere Wrapper für Electron IPC-Aufrufe.
 * 
 * Stellt eine saubere API für IPC-Kommunikation bereit,
 * ohne dass Komponenten direkt auf window.electron zugreifen müssen.
 */
export function useElectron() {
	const isAvailable = typeof window !== "undefined" && !!window.electron;

	// App-Info
	const getVersion = useCallback(async (): Promise<string> => {
		if (!isAvailable) {
			throw new Error("Electron API nicht verfügbar");
		}
		return window.electron.getVersion();
	}, [isAvailable]);

	// Test-Funktion
	const ping = useCallback(async (): Promise<string> => {
		if (!isAvailable) {
			throw new Error("Electron API nicht verfügbar");
		}
		return window.electron.ping();
	}, [isAvailable]);

	// Sync-Funktionen
	const sync = {
		preview: useCallback(
			async (config: SyncPreviewRequest): Promise<SyncPreviewResponse> => {
				if (!isAvailable) {
					throw new Error("Electron API nicht verfügbar");
				}
				return window.electron.sync.preview(config);
			},
			[isAvailable]
		),

		start: useCallback(
			async (config: SyncStartConfig): Promise<void> => {
				if (!isAvailable) {
					throw new Error("Electron API nicht verfügbar");
				}
				await window.electron.sync.start(config);
			},
			[isAvailable]
		),

		test: useCallback(
			async (config: SyncTestRequest): Promise<void> => {
				if (!isAvailable) {
					throw new Error("Electron API nicht verfügbar");
				}
				await window.electron.sync.test(config);
			},
			[isAvailable]
		),

		cancel: useCallback(async (): Promise<void> => {
			if (!isAvailable) {
				throw new Error("Electron API nicht verfügbar");
			}
			await window.electron.sync.cancel();
		}, [isAvailable]),

		onProgress: useCallback(
			(callback: (progress: SyncProgress) => void) => {
				if (!isAvailable) {
					return;
				}
				window.electron.sync.onProgress(callback as (progress: SyncProgress) => void);
			},
			[isAvailable]
		),

		onLog: useCallback(
			(callback: (log: SyncLog) => void) => {
				if (!isAvailable) {
					return;
				}
				window.electron.sync.onLog(callback as (log: SyncLog) => void);
			},
			[isAvailable]
		),

		onPreviewReady: useCallback(
			(callback: (operations: PlannedOperation[]) => void) => {
				if (!isAvailable) {
					return;
				}
				window.electron.sync.onPreviewReady(callback as (operations: PlannedOperation[]) => void);
			},
			[isAvailable]
		),

		onComplete: useCallback(
			(callback: (result: SyncResult) => void) => {
				if (!isAvailable) {
					return;
				}
				window.electron.sync.onComplete(callback as (result: SyncResult) => void);
			},
			[isAvailable]
		),
	};

	// CSV-Funktionen
	const csv = {
		parse: useCallback(
			async (filePath: string): Promise<CsvParseResult> => {
				if (!isAvailable) {
					throw new Error("Electron API nicht verfügbar");
				}
				return window.electron.csv.parse(filePath) as Promise<CsvParseResult>;
			},
			[isAvailable]
		),

		selectFile: useCallback(async () => {
			if (!isAvailable) {
				throw new Error("Electron API nicht verfügbar");
			}
			return window.electron.csv.selectFile() as Promise<{
				success: boolean;
				filePath: string | null;
				error?: string;
			}>;
		}, [isAvailable]),

		getHeaders: useCallback(
			async (filePath: string) => {
				if (!isAvailable) {
					throw new Error("Electron API nicht verfügbar");
				}
				return window.electron.csv.getHeaders(filePath) as Promise<{
					success: boolean;
					headers: string[];
					encoding?: string;
					error?: string;
				}>;
			},
			[isAvailable]
		),

		preview: useCallback(
			async (config: {
				filePath: string;
				mapping: ColumnMapping;
				maxRows?: number;
			}) => {
				if (!isAvailable) {
					throw new Error("Electron API nicht verfügbar");
				}
				return window.electron.csv.preview(config) as Promise<import("../../electron/types/ipc").CsvPreviewResponse>;
			},
			[isAvailable]
		),
	};

	// Auto-Sync-Funktionen
	const autoSync = {
		getStatus: useCallback(async (): Promise<AutoSyncStatus> => {
			if (!isAvailable) {
				throw new Error("Electron API nicht verfügbar");
			}
			return window.electron.autoSync.getStatus();
		}, [isAvailable]),

		start: useCallback(async (): Promise<void> => {
			if (!isAvailable) {
				throw new Error("Electron API nicht verfügbar");
			}
			const result = await window.electron.autoSync.start();
			if (!result.success) {
				throw new Error(result.error || "Fehler beim Starten des Auto-Sync");
			}
		}, [isAvailable]),

		stop: useCallback(async (): Promise<void> => {
			if (!isAvailable) {
				throw new Error("Electron API nicht verfügbar");
			}
			const result = await window.electron.autoSync.stop();
			if (!result.success) {
				throw new Error(result.error || "Fehler beim Stoppen des Auto-Sync");
			}
		}, [isAvailable]),

		getConfig: useCallback(async (): Promise<AppConfig["autoSync"]> => {
			if (!isAvailable) {
				throw new Error("Electron API nicht verfügbar");
			}
			return window.electron.autoSync.getConfig();
		}, [isAvailable]),

		setConfig: useCallback(
			async (config: AppConfig["autoSync"]): Promise<void> => {
				if (!isAvailable) {
					throw new Error("Electron API nicht verfügbar");
				}
				const result = await window.electron.autoSync.setConfig(config);
				if (!result.success) {
					throw new Error(result.error || "Fehler beim Speichern der Auto-Sync-Config");
				}
			},
			[isAvailable]
		),

		testSync: useCallback(
			async (csvPath: string): Promise<void> => {
				if (!isAvailable) {
					throw new Error("Electron API nicht verfügbar");
				}
				const result = await window.electron.autoSync.testSync(csvPath);
				if (!result.success) {
					throw new Error(result.error || "Fehler beim Test-Sync");
				}
			},
			[isAvailable]
		),
	};

	return {
		isAvailable,
		getVersion,
		ping,
		sync,
		csv,
		autoSync,
	};
}

