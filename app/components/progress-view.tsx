"use client";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Loader2, CheckCircle2, AlertCircle } from "lucide-react";
import type { SyncProgress } from "../../electron/types/ipc";

interface ProgressViewProps {
	progress: SyncProgress;
	isRunning: boolean;
}

/**
 * Fortschrittsanzeige-Komponente für die Synchronisation.
 * 
 * Zeigt den aktuellen Fortschritt, die aktuelle Phase und eine Statusmeldung an.
 */
export function ProgressView({ progress, isRunning }: ProgressViewProps) {
	const getStageLabel = (stage: SyncProgress["stage"]): string => {
		switch (stage) {
			case "matching":
				return "Matching";
			case "updating-prices":
				return "Preise aktualisieren";
			case "updating-inventory":
				return "Bestände aktualisieren";
			case "complete":
				return "Abgeschlossen";
			default:
				return "Unbekannt";
		}
	};

	const getStageIcon = (stage: SyncProgress["stage"], isRunning: boolean) => {
		if (stage === "complete") {
			return <CheckCircle2 className="h-5 w-5 text-green-500" />;
		}
		if (isRunning) {
			return <Loader2 className="h-5 w-5 animate-spin text-blue-500" />;
		}
		return <AlertCircle className="h-5 w-5 text-gray-400" />;
	};

	return (
		<Card>
			<CardHeader>
				<CardTitle className="flex items-center gap-2">
					{getStageIcon(progress.stage, isRunning)}
					{getStageLabel(progress.stage)}
				</CardTitle>
				<CardDescription>
					{progress.message || "Synchronisation läuft..."}
				</CardDescription>
			</CardHeader>
			<CardContent className="space-y-4">
				<div className="space-y-2">
					<div className="flex justify-between text-sm">
						<span className="text-muted-foreground">Fortschritt</span>
						<span className="font-medium">{progress.current}%</span>
					</div>
					<Progress value={progress.current} className="h-2" />
				</div>

				{progress.stage !== "complete" && (
					<div className="text-sm text-muted-foreground">
						{progress.message}
					</div>
				)}
			</CardContent>
		</Card>
	);
}

