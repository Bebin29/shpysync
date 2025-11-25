"use client";

import { useEffect, useRef } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { AlertCircle, Info, AlertTriangle, XCircle } from "lucide-react";
import type { SyncLog } from "../../electron/types/ipc";

interface LogViewerProps {
	logs: SyncLog[];
	maxHeight?: string;
}

/**
 * Log-Viewer-Komponente für Sync-Logs.
 * 
 * Zeigt strukturierte Log-Einträge mit Level-Farben und Auto-Scroll.
 */
export function LogViewer({ logs, maxHeight = "400px" }: LogViewerProps) {
	const scrollRef = useRef<HTMLDivElement>(null);

	// Auto-Scroll zum Ende, wenn neue Logs hinzugefügt werden
	useEffect(() => {
		if (scrollRef.current) {
			scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
		}
	}, [logs]);

	const getLogIcon = (level: SyncLog["level"]) => {
		switch (level) {
			case "info":
				return <Info className="h-4 w-4 text-blue-500" />;
			case "warn":
				return <AlertTriangle className="h-4 w-4 text-yellow-500" />;
			case "error":
				return <XCircle className="h-4 w-4 text-red-500" />;
			default:
				return <AlertCircle className="h-4 w-4 text-gray-500" />;
		}
	};

	const getLogBadgeVariant = (level: SyncLog["level"]): "default" | "destructive" | "secondary" => {
		switch (level) {
			case "error":
				return "destructive";
			case "warn":
				return "secondary";
			default:
				return "default";
		}
	};

	const formatTimestamp = (timestamp: string): string => {
		try {
			const date = new Date(timestamp);
			return date.toLocaleTimeString("de-DE", {
				hour: "2-digit",
				minute: "2-digit",
				second: "2-digit",
			});
		} catch {
			return timestamp;
		}
	};

	return (
		<Card>
			<CardHeader>
				<CardTitle>Logs</CardTitle>
				<CardDescription>
					{logs.length} Einträge
				</CardDescription>
			</CardHeader>
			<CardContent>
				<div
					ref={scrollRef}
					style={{ maxHeight }}
					className="rounded-md border p-4 overflow-y-auto"
				>
					<div className="space-y-2">
						{logs.length === 0 ? (
							<div className="text-center text-muted-foreground py-8">
								Keine Logs vorhanden
							</div>
						) : (
							logs.map((log, index) => (
								<div
									key={index}
									className="flex items-start gap-3 rounded-md p-2 hover:bg-muted/50 transition-colors"
								>
									<div className="mt-0.5">{getLogIcon(log.level)}</div>
									<div className="flex-1 min-w-0">
										<div className="flex items-center gap-2 mb-1">
											<Badge variant={getLogBadgeVariant(log.level)} className="text-xs">
												{log.level.toUpperCase()}
											</Badge>
											<span className="text-xs text-muted-foreground">
												{formatTimestamp(log.timestamp)}
											</span>
										</div>
										<p className="text-sm break-words">{log.message}</p>
									</div>
								</div>
							))
						)}
					</div>
				</div>
			</CardContent>
		</Card>
	);
}

