"use client";

import { useCallback } from "react";
import type {
	SyncStartConfig,
	SyncProgress,
	SyncLog,
	SyncResult,
	CsvParseResult,
} from "../../electron/types/ipc";

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
		start: useCallback(
			async (config: SyncStartConfig): Promise<void> => {
				if (!isAvailable) {
					throw new Error("Electron API nicht verfügbar");
				}
				await window.electron.sync.start(config);
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
				window.electron.sync.onProgress(callback);
			},
			[isAvailable]
		),

		onLog: useCallback(
			(callback: (log: SyncLog) => void) => {
				if (!isAvailable) {
					return;
				}
				window.electron.sync.onLog(callback);
			},
			[isAvailable]
		),

		onComplete: useCallback(
			(callback: (result: SyncResult) => void) => {
				if (!isAvailable) {
					return;
				}
				window.electron.sync.onComplete(callback);
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
	};

	return {
		isAvailable,
		getVersion,
		ping,
		sync,
		csv,
	};
}

