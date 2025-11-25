"use client";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { ProgressView } from "./progress-view";
import { LogViewer } from "./log-viewer";
import { CheckCircle2, XCircle, AlertCircle, Loader2, X, Download } from "lucide-react";
import type { SyncProgress, SyncResult, SyncLog } from "../../electron/types/ipc";
import { useSyncStore } from "../stores/sync-store";

interface SyncExecutionProps {
	progress: SyncProgress;
	logs: Array<{ level: "info" | "warn" | "error"; message: string; timestamp: string }>;
	result?: SyncResult;
	isRunning: boolean;
	onCancel: () => void;
	onExportResults?: () => void;
	onExportLogs?: () => void;
}

/**
 * Sync-Execution-Komponente für Schritt 4 (Ausführung).
 * 
 * Zeigt Fortschritt, Logs und Ergebnis der Synchronisation an.
 */
export function SyncExecution({
	progress,
	logs,
	result,
	isRunning,
	onCancel,
	onExportResults,
	onExportLogs,
}: SyncExecutionProps) {
	const getResultSummary = () => {
		if (!result) return null;

		const successRate = result.totalPlanned > 0
			? Math.round((result.totalSuccess / result.totalPlanned) * 100)
			: 0;

		return {
			totalPlanned: result.totalPlanned,
			totalExecuted: result.totalExecuted,
			totalSuccess: result.totalSuccess,
			totalFailed: result.totalFailed,
			totalSkipped: result.totalSkipped,
			successRate,
		};
	};

	const summary = getResultSummary();

	return (
		<div className="space-y-6">
			{/* Fortschrittsanzeige */}
			<ProgressView progress={progress} isRunning={isRunning} />

			{/* Ergebnis-Zusammenfassung (wenn abgeschlossen) */}
			{result && summary && (
				<Card>
					<CardHeader>
						<div className="flex items-center justify-between">
							<div>
								<CardTitle className="flex items-center gap-2">
									{summary.totalFailed === 0 ? (
										<CheckCircle2 className="h-5 w-5 text-green-500" />
									) : (
										<AlertCircle className="h-5 w-5 text-yellow-500" />
									)}
									Ergebnis
								</CardTitle>
								<CardDescription>
									Synchronisation abgeschlossen
								</CardDescription>
							</div>
							{onExportResults && (
								<Button variant="outline" size="sm" onClick={onExportResults}>
									<Download className="mr-2 h-4 w-4" />
									Ergebnisse exportieren
								</Button>
							)}
						</div>
					</CardHeader>
					<CardContent className="space-y-4">
						<div className="grid grid-cols-2 md:grid-cols-4 gap-4">
							<div className="space-y-1">
								<div className="text-sm text-muted-foreground">Geplant</div>
								<div className="text-2xl font-bold">{summary.totalPlanned}</div>
							</div>
							<div className="space-y-1">
								<div className="text-sm text-muted-foreground">Erfolgreich</div>
								<div className="text-2xl font-bold text-green-600">
									{summary.totalSuccess}
								</div>
							</div>
							<div className="space-y-1">
								<div className="text-sm text-muted-foreground">Fehlgeschlagen</div>
								<div className="text-2xl font-bold text-red-600">
									{summary.totalFailed}
								</div>
							</div>
							<div className="space-y-1">
								<div className="text-sm text-muted-foreground">Erfolgsrate</div>
								<div className="text-2xl font-bold">{summary.successRate}%</div>
							</div>
						</div>

						{summary.totalFailed > 0 && (
							<Alert variant="destructive">
								<XCircle className="h-4 w-4" />
								<AlertDescription>
									{summary.totalFailed} von {summary.totalPlanned} Updates sind fehlgeschlagen.
									Bitte überprüfe die Logs für Details.
								</AlertDescription>
							</Alert>
						)}

						{summary.totalFailed === 0 && summary.totalSuccess > 0 && (
							<Alert>
								<CheckCircle2 className="h-4 w-4" />
								<AlertDescription>
									Alle Updates wurden erfolgreich durchgeführt!
								</AlertDescription>
							</Alert>
						)}
					</CardContent>
				</Card>
			)}

			{/* Logs */}
			<div className="space-y-2">
				<div className="flex items-center justify-between">
					<h3 className="text-lg font-semibold">Logs</h3>
					{onExportLogs && logs.length > 0 && (
						<Button variant="outline" size="sm" onClick={onExportLogs}>
							<Download className="mr-2 h-4 w-4" />
							Logs exportieren
						</Button>
					)}
				</div>
				<LogViewer logs={logs} maxHeight="500px" />
			</div>

			{/* Cancel-Button (während Ausführung) */}
			{isRunning && (
				<div className="flex justify-center">
					<Button variant="destructive" onClick={onCancel}>
						<X className="mr-2 h-4 w-4" />
						Synchronisation abbrechen
					</Button>
				</div>
			)}
		</div>
	);
}

