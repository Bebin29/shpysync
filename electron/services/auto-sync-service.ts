import { existsSync } from "fs";
import type { ShopConfig, ColumnMapping, SyncStartConfig } from "../types/ipc.js";
import { getSyncEngine } from "./sync-engine.js";
import { getShopConfig, getDefaultColumnMapping, getConfig } from "./config-service.js";
import { getLogger } from "./logger.js";
import { detectFileType } from "../../core/domain/validators.js";

/**
 * Auto-Sync-Konfiguration.
 */
export interface AutoSyncConfig {
	enabled: boolean;
	interval: number; // in Minuten
	csvPath: string;
}

/**
 * Auto-Sync-Status.
 */
export interface AutoSyncStatus {
	isRunning: boolean;
	nextRunTime: Date | null;
	lastRunTime: Date | null;
	lastRunResult: "success" | "failed" | null;
}

/**
 * Auto-Sync-Service für zeitgesteuerte Synchronisationen.
 * 
 * Verwaltet einen Scheduler, der in konfigurierbaren Intervallen
 * CSV-Dateien synchronisiert. Läuft nur, solange die App geöffnet ist.
 */
export class AutoSyncService {
	private intervalId: NodeJS.Timeout | null = null;
	private config: AutoSyncConfig | null = null;
	private nextRunTime: Date | null = null;
	private lastRunTime: Date | null = null;
	private lastRunResult: "success" | "failed" | null = null;
	private isRunningSync = false; // Verhindert parallele Syncs
	private logger = getLogger();

	/**
	 * Startet den Auto-Sync-Scheduler.
	 * 
	 * @param config - Auto-Sync-Konfiguration
	 * @throws Error wenn CSV-Pfad nicht existiert oder Config ungültig
	 */
	start(config: AutoSyncConfig): void {
		// Validierung
		if (!config.csvPath || !existsSync(config.csvPath)) {
			throw new Error(`Datei nicht gefunden: ${config.csvPath}`);
		}
		
		// Validiere Dateityp
		const fileType = detectFileType(config.csvPath);
		if (fileType !== "csv" && fileType !== "dbf") {
			throw new Error(`Unsupported file type: ${config.csvPath}. Only CSV and DBF files are supported.`);
		}

		if (config.interval <= 0) {
			throw new Error("Intervall muss größer als 0 sein");
		}

		// Stoppe vorherigen Scheduler falls vorhanden
		this.stop();

		this.config = config;
		const fileTypeLabel = fileType === "dbf" ? "DBF" : "CSV";
		this.logger.info("system", `Auto-Sync gestartet: Intervall ${config.interval} Minuten, ${fileTypeLabel}: ${config.csvPath}`);

		// Berechne nächste Ausführungszeit
		this.nextRunTime = new Date(Date.now() + config.interval * 60 * 1000);

		// Starte Scheduler (Intervall in Millisekunden)
		const intervalMs = config.interval * 60 * 1000;
		this.intervalId = setInterval(() => {
			this.executeSync();
		}, intervalMs);

		// Führe ersten Sync sofort aus (optional, kann entfernt werden)
		// this.executeSync();
	}

	/**
	 * Stoppt den Auto-Sync-Scheduler.
	 */
	stop(): void {
		if (this.intervalId) {
			clearInterval(this.intervalId);
			this.intervalId = null;
			this.logger.info("system", "Auto-Sync gestoppt");
		}
		this.config = null;
		this.nextRunTime = null;
	}

	/**
	 * Prüft ob Auto-Sync läuft.
	 */
	isRunning(): boolean {
		return this.intervalId !== null;
	}

	/**
	 * Gibt den aktuellen Status zurück.
	 */
	getStatus(): AutoSyncStatus {
		return {
			isRunning: this.isRunning(),
			nextRunTime: this.nextRunTime,
			lastRunTime: this.lastRunTime,
			lastRunResult: this.lastRunResult,
		};
	}

	/**
	 * Führt einen Auto-Sync aus.
	 * Wird intern vom Scheduler aufgerufen.
	 */
	private async executeSync(): Promise<void> {
		// Verhindere parallele Syncs
		if (this.isRunningSync) {
			this.logger.warn("system", "Auto-Sync übersprungen: Sync läuft bereits");
			return;
		}

		if (!this.config) {
			this.logger.error("system", "Auto-Sync-Fehler: Keine Konfiguration vorhanden");
			return;
		}

		this.isRunningSync = true;
		this.lastRunTime = new Date();

		try {
			// Lade Config
			const shopConfig = getShopConfig();
			const columnMapping = getDefaultColumnMapping();

			// Validierung
			if (!shopConfig) {
				throw new Error("Shop-Konfiguration fehlt. Bitte konfiguriere zuerst einen Shop.");
			}

			if (!columnMapping) {
				throw new Error("Spalten-Mapping fehlt. Bitte konfiguriere zuerst das Mapping.");
			}

			if (!existsSync(this.config.csvPath)) {
				throw new Error(`Datei nicht gefunden: ${this.config.csvPath}`);
			}
			
			// Validiere Dateityp
			const fileType = detectFileType(this.config.csvPath);
			if (fileType !== "csv" && fileType !== "dbf") {
				throw new Error(`Unsupported file type: ${this.config.csvPath}. Only CSV and DBF files are supported.`);
			}

			// Erstelle Sync-Config
			const syncConfig: SyncStartConfig = {
				csvPath: this.config.csvPath,
				columnMapping,
				shopConfig,
				options: {
					updatePrices: true,
					updateInventory: true,
					dryRun: false,
				},
			};

			// Führe Sync aus
			const fileTypeLabel = fileType === "dbf" ? "DBF" : "CSV";
			this.logger.info("system", `Auto-Sync gestartet (${fileTypeLabel}): ${this.config.csvPath}`);
			const syncEngine = getSyncEngine();
			
			// Sync läuft asynchron, wir warten nicht darauf
			// (um den Scheduler nicht zu blockieren)
			syncEngine.startSync(syncConfig)
				.then((result) => {
					this.lastRunResult = result.totalFailed === 0 ? "success" : "failed";
					const successCount = result.totalSuccess;
					const failedCount = result.totalFailed;
					
					if (result.totalFailed === 0) {
						this.logger.info("system", `Auto-Sync erfolgreich: ${successCount} Updates`);
					} else {
						this.logger.warn("system", `Auto-Sync mit Fehlern: ${successCount} erfolgreich, ${failedCount} fehlgeschlagen`);
					}
					
					// Berechne nächste Ausführungszeit
					if (this.config) {
						this.nextRunTime = new Date(Date.now() + this.config.interval * 60 * 1000);
					}
				})
				.catch((error) => {
					this.lastRunResult = "failed";
					this.logger.error("system", `Auto-Sync fehlgeschlagen: ${error instanceof Error ? error.message : String(error)}`, {
						error: error instanceof Error ? error.stack : String(error),
					});
					
					// Berechne nächste Ausführungszeit trotz Fehler
					if (this.config) {
						this.nextRunTime = new Date(Date.now() + this.config.interval * 60 * 1000);
					}
				})
				.finally(() => {
					this.isRunningSync = false;
				});

		} catch (error) {
			this.lastRunResult = "failed";
			this.isRunningSync = false;
			
			const errorMessage = error instanceof Error ? error.message : String(error);
			this.logger.error("system", `Auto-Sync-Fehler: ${errorMessage}`, {
				error: error instanceof Error ? error.stack : String(error),
			});

			// Bei kritischen Fehlern (z.B. Shop-Config fehlt) stoppen wir Auto-Sync
			if (errorMessage.includes("Shop-Konfiguration fehlt") || errorMessage.includes("Spalten-Mapping fehlt")) {
				this.logger.warn("system", "Auto-Sync gestoppt aufgrund kritischer Fehler");
				this.stop();
			} else {
				// Bei anderen Fehlern (z.B. CSV nicht gefunden) läuft Auto-Sync weiter
				if (this.config) {
					this.nextRunTime = new Date(Date.now() + this.config.interval * 60 * 1000);
				}
			}
		}
	}

	/**
	 * Führt einen manuellen Test-Sync aus (ohne Scheduler).
	 * 
	 * @param csvPath - Pfad zur CSV-Datei
	 * @returns Promise mit Sync-Ergebnis
	 */
	async executeTestSync(csvPath: string): Promise<void> {
		if (this.isRunningSync) {
			throw new Error("Sync läuft bereits");
		}

		if (!existsSync(csvPath)) {
			throw new Error(`CSV-Datei nicht gefunden: ${csvPath}`);
		}

		const shopConfig = getShopConfig();
		const columnMapping = getDefaultColumnMapping();

		if (!shopConfig) {
			throw new Error("Shop-Konfiguration fehlt");
		}

		if (!columnMapping) {
			throw new Error("Spalten-Mapping fehlt");
		}

		const syncConfig: SyncStartConfig = {
			csvPath,
			columnMapping,
			shopConfig,
			options: {
				updatePrices: true,
				updateInventory: true,
				dryRun: false,
			},
		};

		this.isRunningSync = true;
		try {
			const syncEngine = getSyncEngine();
			await syncEngine.startSync(syncConfig);
		} finally {
			this.isRunningSync = false;
		}
	}
}

/**
 * Singleton-Instanz des Auto-Sync-Services.
 */
let autoSyncServiceInstance: AutoSyncService | null = null;

/**
 * Gibt die Auto-Sync-Service-Instanz zurück (Singleton).
 */
export function getAutoSyncService(): AutoSyncService {
	if (!autoSyncServiceInstance) {
		autoSyncServiceInstance = new AutoSyncService();
	}
	return autoSyncServiceInstance;
}




