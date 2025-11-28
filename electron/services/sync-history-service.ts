import { app } from "electron";
import { join } from "path";
import { existsSync, mkdirSync, readFileSync, writeFileSync, renameSync } from "fs";
import type { SyncHistoryEntry, SyncResult, ColumnMapping, HistoryStats } from "../types/ipc.js";
import { getLogger } from "./logger.js";

/**
 * Sync-Historie-Service für die Verwaltung der letzten Syncs.
 * 
 * Speichert Sync-Ergebnisse in sync-history.json (in app.getPath("userData")).
 * Verwaltet die letzten 10 Syncs (ältere werden automatisch gelöscht).
 */
class SyncHistoryService {
	private readonly MAX_ENTRIES = 10;
	private readonly HISTORY_FILE = "sync-history.json";
	private historyPath: string | null = null;
	private logger = getLogger();

	/**
	 * Initialisiert den Historie-Pfad.
	 * WICHTIG: Nur nach app.whenReady() aufrufen!
	 */
	private initializePath(): string {
		if (this.historyPath) {
			return this.historyPath;
		}

		if (!app.isReady()) {
			throw new Error("app.getPath() kann nur nach app.whenReady() verwendet werden");
		}

		const userDataPath = app.getPath("userData");
		this.historyPath = join(userDataPath, this.HISTORY_FILE);

		// Verzeichnis erstellen falls nicht vorhanden
		if (!existsSync(userDataPath)) {
			mkdirSync(userDataPath, { recursive: true });
		}

		return this.historyPath;
	}

	/**
	 * Lädt die Historie aus der Datei.
	 */
	private loadHistory(): SyncHistoryEntry[] {
		const path = this.initializePath();

		if (!existsSync(path)) {
			return [];
		}

		try {
			const content = readFileSync(path, "utf-8");
			const history = JSON.parse(content) as SyncHistoryEntry[];

			// Validierung: Stelle sicher, dass es ein Array ist
			if (!Array.isArray(history)) {
				this.logger.warn("history", "Historie-Datei ist ungültig, wird zurückgesetzt");
				return [];
			}

			return history;
		} catch (error) {
			// Falls Datei beschädigt: Backup erstellen und neu starten
			this.logger.warn("history", "Fehler beim Laden der Historie, erstelle Backup", { error: error instanceof Error ? error.message : String(error) });
			
			if (existsSync(path)) {
				const backupPath = `${path}.backup`;
				try {
					renameSync(path, backupPath);
				} catch {
					// Backup-Fehler ignorieren
				}
			}

			return [];
		}
	}

	/**
	 * Speichert die Historie in die Datei (atomic write).
	 */
	private saveHistory(history: SyncHistoryEntry[]): void {
		const path = this.initializePath();
		const tempPath = `${path}.tmp`;

		try {
			// Schreibe zuerst in temporäre Datei
			writeFileSync(tempPath, JSON.stringify(history, null, 2), "utf-8");

			// Dann umbenennen (atomic auf den meisten Systemen)
			renameSync(tempPath, path);
		} catch (error) {
			this.logger.error("history", "Fehler beim Speichern der Historie", { error: error instanceof Error ? error.message : String(error) });
			throw error;
		}
	}

	/**
	 * Speichert einen Sync-Eintrag in der Historie.
	 */
	saveSyncHistory(entry: SyncHistoryEntry): void {
		const history = this.loadHistory();

		// Neuen Eintrag am Anfang einfügen (neueste zuerst)
		history.unshift(entry);

		// Nur die letzten MAX_ENTRIES behalten
		if (history.length > this.MAX_ENTRIES) {
			history.splice(this.MAX_ENTRIES);
		}

		this.saveHistory(history);
		this.logger.info("history", "Sync-Eintrag in Historie gespeichert", { id: entry.id, timestamp: entry.timestamp });
	}

	/**
	 * Lädt die Sync-Historie.
	 * 
	 * @param limit - Maximale Anzahl Einträge (Standard: alle)
	 */
	getSyncHistory(limit?: number): SyncHistoryEntry[] {
		const history = this.loadHistory();

		if (limit !== undefined && limit > 0) {
			return history.slice(0, limit);
		}

		return history;
	}

	/**
	 * Löscht die gesamte Historie.
	 */
	clearHistory(): void {
		const path = this.initializePath();
		
		if (existsSync(path)) {
			try {
				const backupPath = `${path}.backup`;
				renameSync(path, backupPath);
			} catch {
				// Backup-Fehler ignorieren
			}
		}

		this.saveHistory([]);
		this.logger.info("history", "Historie gelöscht");
	}

	/**
	 * Gibt Historie-Statistiken zurück.
	 */
	getHistoryStats(): HistoryStats {
		const history = this.loadHistory();

		let success = 0;
		let failed = 0;
		let lastSync: string | null = null;

		for (const entry of history) {
			if (entry.result.totalFailed === 0 && entry.result.totalSuccess > 0) {
				success++;
			} else if (entry.result.totalFailed > 0) {
				failed++;
			}

			// Neueste Sync-Zeit finden
			if (!lastSync && entry.timestamp) {
				lastSync = entry.timestamp;
			}
		}

		return {
			total: history.length,
			success,
			failed,
			lastSync,
		};
	}
}

/**
 * Singleton-Instanz des Sync-Historie-Services.
 */
let syncHistoryServiceInstance: SyncHistoryService | null = null;

/**
 * Gibt die Sync-Historie-Service-Instanz zurück (Singleton).
 */
export function getSyncHistoryService(): SyncHistoryService {
	if (!syncHistoryServiceInstance) {
		syncHistoryServiceInstance = new SyncHistoryService();
	}
	return syncHistoryServiceInstance;
}




