import type { BrowserWindow } from "electron";
import type { SyncLog, LogLevel, LogCategory } from "../types/ipc.js";
import { app } from "electron";
import { join } from "path";
import { writeFile, appendFile, mkdir } from "fs/promises";
import { existsSync } from "fs";

/**
 * Logger-Service für strukturiertes Logging.
 * 
 * Schreibt Logs:
 * - in eine Log-Datei (optional)
 * - broadcastet über IPC an Renderer (sync:log)
 */
export class Logger {
	private mainWindow: BrowserWindow | null = null;
	private logFilePath: string | null = null;
	private logFileEnabled: boolean = false;

	/**
	 * Setzt das BrowserWindow für IPC-Broadcast.
	 */
	setMainWindow(window: BrowserWindow | null): void {
		this.mainWindow = window;
	}

	/**
	 * Aktiviert/deaktiviert das Schreiben in Log-Dateien.
	 */
	setLogFileEnabled(enabled: boolean): void {
		this.logFileEnabled = enabled;
		if (enabled) {
			this.initializeLogFile();
		}
	}

	/**
	 * Initialisiert die Log-Datei.
	 */
	private async initializeLogFile(): Promise<void> {
		if (!this.logFileEnabled) return;

		try {
			const logsDir = join(app.getPath("userData"), "logs");
			if (!existsSync(logsDir)) {
				await mkdir(logsDir, { recursive: true });
			}

			const timestamp = new Date().toISOString().replace(/[:.]/g, "-").slice(0, -5);
			this.logFilePath = join(logsDir, `sync-${timestamp}.log`);
			
			// Erstelle Log-Datei mit Header
			const header = `=== WAWISync Log - ${new Date().toLocaleString("de-DE")} ===\n\n`;
			await writeFile(this.logFilePath, header, "utf-8");
		} catch (error) {
			console.error("Fehler beim Initialisieren der Log-Datei:", error);
			this.logFileEnabled = false;
		}
	}

	/**
	 * Schreibt einen Log-Eintrag in die Datei.
	 */
	private async writeToLogFile(log: SyncLog): Promise<void> {
		if (!this.logFileEnabled || !this.logFilePath) return;

		try {
			const timestamp = new Date(log.timestamp).toLocaleString("de-DE");
			const level = log.level.toUpperCase().padEnd(5);
			const category = `[${log.category}]`.padEnd(12);
			const contextStr = log.context ? ` ${JSON.stringify(log.context)}` : "";
			const line = `[${timestamp}] ${level} ${category} ${log.message}${contextStr}\n`;
			
			await appendFile(this.logFilePath, line, "utf-8");
		} catch (error) {
			console.error("Fehler beim Schreiben in Log-Datei:", error);
		}
	}

	/**
	 * Sendet Log-Event zum Renderer über IPC.
	 */
	private sendToRenderer(log: SyncLog): void {
		if (this.mainWindow) {
			this.mainWindow.webContents.send("sync:log", log);
		}
	}

	/**
	 * Erstellt einen Log-Eintrag.
	 */
	private createLogEntry(
		level: LogLevel,
		category: LogCategory,
		message: string,
		context?: Record<string, unknown>
	): SyncLog {
		return {
			id: `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
			level,
			category,
			message,
			timestamp: new Date().toISOString(),
			context,
		};
	}

	/**
	 * Loggt eine Debug-Nachricht.
	 */
	debug(category: LogCategory, message: string, context?: Record<string, unknown>): void {
		const log = this.createLogEntry("debug", category, message, context);
		this.sendToRenderer(log);
		if (this.logFileEnabled) {
			this.writeToLogFile(log);
		}
	}

	/**
	 * Loggt eine Info-Nachricht.
	 */
	info(category: LogCategory, message: string, context?: Record<string, unknown>): void {
		const log = this.createLogEntry("info", category, message, context);
		this.sendToRenderer(log);
		if (this.logFileEnabled) {
			this.writeToLogFile(log);
		}
	}

	/**
	 * Loggt eine Warnung.
	 */
	warn(category: LogCategory, message: string, context?: Record<string, unknown>): void {
		const log = this.createLogEntry("warn", category, message, context);
		this.sendToRenderer(log);
		if (this.logFileEnabled) {
			this.writeToLogFile(log);
		}
	}

	/**
	 * Loggt einen Fehler.
	 */
	error(category: LogCategory, message: string, context?: Record<string, unknown>): void {
		const log = this.createLogEntry("error", category, message, context);
		this.sendToRenderer(log);
		if (this.logFileEnabled) {
			this.writeToLogFile(log);
		}
	}

	/**
	 * Allgemeine Log-Methode.
	 */
	log(level: LogLevel, category: LogCategory, message: string, context?: Record<string, unknown>): void {
		const log = this.createLogEntry(level, category, message, context);
		this.sendToRenderer(log);
		if (this.logFileEnabled) {
			this.writeToLogFile(log);
		}
	}
}

/**
 * Singleton-Instanz des Loggers.
 */
let loggerInstance: Logger | null = null;

/**
 * Gibt die Logger-Instanz zurück (Singleton).
 */
export function getLogger(): Logger {
	if (!loggerInstance) {
		loggerInstance = new Logger();
		// Log-Datei standardmäßig aktivieren
		loggerInstance.setLogFileEnabled(true);
	}
	return loggerInstance;
}

