import electronUpdater from "electron-updater";
import type { BrowserWindow } from "electron";
import { getLogger } from "./logger.js";
import type { UpdateInfo, UpdateStatus } from "../types/ipc.js";

const { autoUpdater } = electronUpdater;

/**
 * Update-Service für automatische App-Updates.
 * 
 * Verwaltet Update-Prüfungen, Downloads und Installationen.
 */
export class UpdateService {
	private status: UpdateStatus = {
		checking: false,
		available: false,
		downloaded: false,
		downloading: false,
		progress: 0,
		error: null,
		info: null,
	};
	private mainWindow: BrowserWindow | null = null;
	private logger = getLogger();
	private updateCheckInterval: NodeJS.Timeout | null = null;

	constructor() {
		this.setupAutoUpdater();
	}

	/**
	 * Initialisiert den Auto-Updater.
	 */
	private setupAutoUpdater(): void {
		// GitHub Token aus Umgebungsvariable lesen (für private Repositories)
		// electron-updater liest automatisch GH_TOKEN oder GITHUB_TOKEN aus process.env
		const githubToken = process.env.GH_TOKEN || process.env.GITHUB_TOKEN;
		if (githubToken) {
			this.logger.info("update", "GitHub Token gefunden - Updates für private Repositories aktiviert");
		} else {
			this.logger.info("update", "Kein GitHub Token gesetzt - Updates nur für öffentliche Repositories");
		}

		// Konfiguration
		autoUpdater.autoDownload = false; // Manuelles Download-Start
		autoUpdater.autoInstallOnAppQuit = true; // Auto-Install beim App-Beenden

		// Event-Handler
		autoUpdater.on("checking-for-update", () => {
			this.logger.info("update", "Prüfe auf Updates...");
			this.status.checking = true;
			this.status.error = null;
			this.notifyRenderer("checking-for-update");
		});

		autoUpdater.on("update-available", (info) => {
			this.logger.info("update", `Update verfügbar: ${info.version}`);
			this.status.checking = false;
			this.status.available = true;
			// releaseDate kann Date oder String sein (von electron-updater)
			let releaseDateStr: string;
			const releaseDate = info.releaseDate as unknown;
			if (releaseDate instanceof Date) {
				releaseDateStr = releaseDate.toISOString();
			} else if (typeof releaseDate === "string") {
				releaseDateStr = releaseDate;
			} else {
				releaseDateStr = new Date().toISOString();
			}
			// releaseNotes kann String oder Array sein (von electron-updater)
			let releaseNotesStr: string | undefined;
			const releaseNotes = info.releaseNotes as unknown;
			if (typeof releaseNotes === "string") {
				releaseNotesStr = releaseNotes;
			} else if (Array.isArray(releaseNotes)) {
				releaseNotesStr = releaseNotes.map((note) => {
					if (typeof note === "string") {
						return note;
					}
					// Wenn es ein Objekt ist, versuche verschiedene Properties
					if (note && typeof note === "object") {
						return (note as { name?: string; note?: string; text?: string }).name || 
						       (note as { name?: string; note?: string; text?: string }).note || 
						       (note as { name?: string; note?: string; text?: string }).text || 
						       "";
					}
					return "";
				}).join("\n");
			}
			this.status.info = {
				version: info.version,
				releaseDate: releaseDateStr,
				releaseNotes: releaseNotesStr,
			};
			this.notifyRenderer("update-available", this.status.info);
		});

		autoUpdater.on("update-not-available", () => {
			this.logger.info("update", "Keine Updates verfügbar");
			this.status.checking = false;
			this.status.available = false;
			this.status.error = null;
			this.notifyRenderer("update-not-available");
		});

		autoUpdater.on("error", (error) => {
			// 404-Fehler sind normal, wenn noch keine Releases vorhanden sind oder Repository privat ist
			const is404Error = error.message.includes("404") || error.message.includes("Not Found");
			
			if (is404Error) {
				this.logger.info("update", "Keine Releases gefunden oder Repository nicht öffentlich zugänglich");
				this.status.checking = false;
				this.status.available = false;
				this.status.error = null; // Kein Fehler, einfach keine Updates verfügbar
				this.notifyRenderer("update-not-available");
			} else {
				this.logger.error("update", `Update-Fehler: ${error.message}`);
				this.status.checking = false;
				this.status.error = error.message;
				this.notifyRenderer("update-error", { message: error.message });
			}
		});

		autoUpdater.on("download-progress", (progress) => {
			this.status.downloading = true;
			this.status.progress = progress.percent;
			this.notifyRenderer("update-download-progress", {
				percent: progress.percent,
				transferred: progress.transferred,
				total: progress.total,
			});
		});

		autoUpdater.on("update-downloaded", () => {
			this.logger.info("update", "Update heruntergeladen");
			this.status.downloading = false;
			this.status.downloaded = true;
			this.notifyRenderer("update-downloaded");
		});
	}

	/**
	 * Setzt das Main-Window für Benachrichtigungen.
	 */
	setMainWindow(window: BrowserWindow): void {
		this.mainWindow = window;
	}

	/**
	 * Prüft auf verfügbare Updates.
	 */
	async checkForUpdates(): Promise<void> {
		try {
			this.logger.info("update", "Starte Update-Prüfung...");
			await autoUpdater.checkForUpdates();
		} catch (error) {
			const message = error instanceof Error ? error.message : String(error);
			this.logger.error("update", `Fehler bei Update-Prüfung: ${message}`);
			this.status.error = message;
			this.status.checking = false;
			this.notifyRenderer("update-error", { message });
		}
	}

	/**
	 * Startet den Download eines verfügbaren Updates.
	 */
	async downloadUpdate(): Promise<void> {
		if (!this.status.available) {
			throw new Error("Kein Update verfügbar");
		}

		try {
			this.logger.info("update", "Starte Update-Download...");
			await autoUpdater.downloadUpdate();
		} catch (error) {
			const message = error instanceof Error ? error.message : String(error);
			this.logger.error("update", `Fehler beim Update-Download: ${message}`);
			this.status.error = message;
			this.notifyRenderer("update-error", { message });
			throw error;
		}
	}

	/**
	 * Installiert das heruntergeladene Update und startet die App neu.
	 */
	async installUpdate(): Promise<void> {
		if (!this.status.downloaded) {
			throw new Error("Kein Update heruntergeladen");
		}

		this.logger.info("update", "Installiere Update und starte App neu...");
		autoUpdater.quitAndInstall(false, true);
	}

	/**
	 * Gibt den aktuellen Update-Status zurück.
	 */
	getStatus(): UpdateStatus {
		return { ...this.status };
	}

	/**
	 * Startet automatische Update-Prüfungen in regelmäßigen Abständen.
	 */
	startAutoCheck(intervalHours: number = 24): void {
		this.stopAutoCheck();

		// Prüfe sofort beim Start
		this.checkForUpdates().catch((error) => {
			this.logger.error("update", `Fehler bei initialer Update-Prüfung: ${error}`);
		});

		// Dann regelmäßig prüfen
		const intervalMs = intervalHours * 60 * 60 * 1000;
		this.updateCheckInterval = setInterval(() => {
			this.checkForUpdates().catch((error) => {
				this.logger.error("update", `Fehler bei automatischer Update-Prüfung: ${error}`);
			});
		}, intervalMs);

		this.logger.info("update", `Automatische Update-Prüfung alle ${intervalHours} Stunden aktiviert`);
	}

	/**
	 * Stoppt automatische Update-Prüfungen.
	 */
	stopAutoCheck(): void {
		if (this.updateCheckInterval) {
			clearInterval(this.updateCheckInterval);
			this.updateCheckInterval = null;
		}
	}

	/**
	 * Benachrichtigt den Renderer-Prozess über Update-Events.
	 */
	private notifyRenderer(event: string, data?: unknown): void {
		if (this.mainWindow && !this.mainWindow.isDestroyed()) {
			this.mainWindow.webContents.send(`update:${event}`, data);
		}
	}
}

// Singleton-Instanz
let updateServiceInstance: UpdateService | null = null;

/**
 * Gibt die Singleton-Instanz des Update-Services zurück.
 */
export function getUpdateService(): UpdateService {
	if (!updateServiceInstance) {
		updateServiceInstance = new UpdateService();
	}
	return updateServiceInstance;
}


