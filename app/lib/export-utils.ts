/**
 * Export-Utilities für Sync-Ergebnisse, nicht-gematchte Zeilen und Logs.
 */

import type { SyncResult, SyncLog } from "../../electron/types/ipc";

/**
 * Konvertiert Sync-Ergebnisse zu CSV-Format.
 */
export function exportSyncResultsToCsv(result: SyncResult): string {
	const headers = [
		"Zeit",
		"SKU",
		"Name",
		"Typ",
		"Alter Wert",
		"Neuer Wert",
		"Status",
		"Fehlermeldung",
	];

	const rows = result.operations.map((op) => {
		const time = result.endTime || result.startTime;
		const csvRow = op.csvRow;

		return [
			time,
			csvRow.sku || "",
			csvRow.name || "",
			op.type === "price" ? "Preis" : "Bestand",
			op.oldValue?.toString() || "",
			op.newValue?.toString() || "",
			op.status === "success" ? "Erfolgreich" : op.status === "failed" ? "Fehlgeschlagen" : "Übersprungen",
			op.message || "",
		];
	});

	return [headers, ...rows].map((row) => row.map((cell) => `"${String(cell).replace(/"/g, '""')}"`).join(";")).join("\n");
}

/**
 * Konvertiert nicht-gematchte Zeilen zu CSV-Format.
 */
export function exportUnmatchedRowsToCsv(
	unmatchedRows: Array<{
		rowNumber: number;
		sku: string;
		name: string;
		price?: string;
		stock?: number;
	}>
): string {
	const headers = ["Zeile", "SKU", "Name", "Preis", "Bestand"];

	const rows = unmatchedRows.map((row) => [
		row.rowNumber.toString(),
		row.sku || "",
		row.name || "",
		row.price || "",
		row.stock?.toString() || "",
	]);

	return [headers, ...rows].map((row) => row.map((cell) => `"${String(cell).replace(/"/g, '""')}"`).join(";")).join("\n");
}

/**
 * Konvertiert Logs zu Text-Format.
 */
export function exportLogsToText(logs: SyncLog[]): string {
	const lines = logs.map((log) => {
		const timestamp = new Date(log.timestamp).toLocaleString("de-DE");
		const level = log.level.toUpperCase().padEnd(5);
		const category = `[${log.category}]`.padEnd(12);
		const contextStr = log.context ? ` ${JSON.stringify(log.context)}` : "";
		return `[${timestamp}] ${level} ${category} ${log.message}${contextStr}`;
	});

	return lines.join("\n");
}

/**
 * Lädt eine Datei im Browser herunter.
 */
export function downloadFile(content: string, filename: string, mimeType: string = "text/csv;charset=utf-8;"): void {
	const blob = new Blob(["\uFEFF" + content], { type: mimeType }); // BOM für Excel-Kompatibilität
	const url = URL.createObjectURL(blob);
	const link = document.createElement("a");
	link.href = url;
	link.download = filename;
	document.body.appendChild(link);
	link.click();
	document.body.removeChild(link);
	URL.revokeObjectURL(url);
}

/**
 * Exportiert Sync-Ergebnisse als CSV-Datei.
 */
export function exportSyncResults(result: SyncResult): void {
	const csv = exportSyncResultsToCsv(result);
	const timestamp = new Date().toISOString().replace(/[:.]/g, "-").slice(0, -5);
	const filename = `sync-ergebnisse-${timestamp}.csv`;
	downloadFile(csv, filename);
}

/**
 * Exportiert nicht-gematchte Zeilen als CSV-Datei.
 */
export function exportUnmatchedRows(
	unmatchedRows: Array<{
		rowNumber: number;
		sku: string;
		name: string;
		price?: string;
		stock?: number;
	}>
): void {
	const csv = exportUnmatchedRowsToCsv(unmatchedRows);
	const timestamp = new Date().toISOString().replace(/[:.]/g, "-").slice(0, -5);
	const filename = `nicht-gematchte-zeilen-${timestamp}.csv`;
	downloadFile(csv, filename);
}

/**
 * Exportiert Logs als Text-Datei.
 */
export function exportLogs(logs: SyncLog[]): void {
	const text = exportLogsToText(logs);
	const timestamp = new Date().toISOString().replace(/[:.]/g, "-").slice(0, -5);
	const filename = `sync-logs-${timestamp}.txt`;
	downloadFile(text, filename, "text/plain;charset=utf-8;");
}

