"use client";

import { useEffect, useRef, useState, useMemo } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { AlertCircle, Info, AlertTriangle, XCircle, Filter, X } from "lucide-react";
import type { SyncLog, LogLevel, LogCategory } from "../../electron/types/ipc";

interface LogViewerProps {
	logs: SyncLog[];
	maxHeight?: string;
}

/**
 * Log-Viewer-Komponente für Sync-Logs.
 * 
 * Zeigt strukturierte Log-Einträge mit Level-Farben, Filtern und Auto-Scroll.
 */
export function LogViewer({ logs, maxHeight = "400px" }: LogViewerProps) {
	const scrollRef = useRef<HTMLDivElement>(null);
	const [levelFilter, setLevelFilter] = useState<LogLevel | "all">("all");
	const [categoryFilter, setCategoryFilter] = useState<LogCategory | "all">("all");

	// Auto-Scroll zum Ende, wenn neue Logs hinzugefügt werden
	useEffect(() => {
		if (scrollRef.current) {
			scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
		}
	}, [logs]);

	// Gefilterte Logs
	const filteredLogs = useMemo(() => {
		return logs.filter((log) => {
			if (levelFilter !== "all" && log.level !== levelFilter) {
				return false;
			}
			if (categoryFilter !== "all" && log.category !== categoryFilter) {
				return false;
			}
			return true;
		});
	}, [logs, levelFilter, categoryFilter]);

	// Eindeutige Kategorien für Filter
	const uniqueCategories = useMemo(() => {
		const categories = new Set<LogCategory>();
		logs.forEach((log) => categories.add(log.category));
		return Array.from(categories).sort();
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

	const getCategoryLabel = (category: LogCategory): string => {
		const labels: Record<LogCategory, string> = {
			csv: "CSV",
			shopify: "Shopify",
			matching: "Matching",
			inventory: "Bestand",
			price: "Preis",
			system: "System",
		};
		return labels[category] || category;
	};

	const hasActiveFilters = levelFilter !== "all" || categoryFilter !== "all";
	const activeFilterCount = filteredLogs.length;
	const totalCount = logs.length;

	return (
		<Card>
			<CardHeader>
				<div className="flex items-center justify-between">
					<div>
						<CardTitle>Logs</CardTitle>
						<CardDescription>
							{hasActiveFilters ? (
								<span>
									{activeFilterCount} von {totalCount} Einträgen
								</span>
							) : (
								<span>{totalCount} Einträge</span>
							)}
						</CardDescription>
					</div>
				</div>
			</CardHeader>
			<CardContent className="space-y-4">
				{/* Filter */}
				<div className="flex items-center gap-2 flex-wrap">
					<Filter className="h-4 w-4 text-muted-foreground" />
					<Select value={levelFilter} onValueChange={(value) => setLevelFilter(value as LogLevel | "all")}>
						<SelectTrigger className="w-[140px]">
							<SelectValue placeholder="Level" />
						</SelectTrigger>
						<SelectContent>
							<SelectItem value="all">Alle Levels</SelectItem>
							<SelectItem value="debug">Debug</SelectItem>
							<SelectItem value="info">Info</SelectItem>
							<SelectItem value="warn">Warnung</SelectItem>
							<SelectItem value="error">Fehler</SelectItem>
						</SelectContent>
					</Select>

					<Select value={categoryFilter} onValueChange={(value) => setCategoryFilter(value as LogCategory | "all")}>
						<SelectTrigger className="w-[140px]">
							<SelectValue placeholder="Kategorie" />
						</SelectTrigger>
						<SelectContent>
							<SelectItem value="all">Alle Kategorien</SelectItem>
							{uniqueCategories.map((category) => (
								<SelectItem key={category} value={category}>
									{getCategoryLabel(category)}
								</SelectItem>
							))}
						</SelectContent>
					</Select>

					{hasActiveFilters && (
						<Button
							variant="ghost"
							size="sm"
							onClick={() => {
								setLevelFilter("all");
								setCategoryFilter("all");
							}}
							className="h-9"
						>
							<X className="h-4 w-4 mr-1" />
							Filter zurücksetzen
						</Button>
					)}
				</div>

				{/* Log-Liste */}
				<div
					ref={scrollRef}
					style={{ maxHeight }}
					className="rounded-md border p-4 overflow-y-auto"
				>
					<div className="space-y-2">
						{filteredLogs.length === 0 ? (
							<div className="text-center text-muted-foreground py-8">
								{logs.length === 0 ? (
									"Keine Logs vorhanden"
								) : (
									"Keine Logs entsprechen den Filtern"
								)}
							</div>
						) : (
							filteredLogs.map((log) => (
								<div
									key={log.id}
									className="flex items-start gap-3 rounded-md p-2 hover:bg-muted/50 transition-colors"
								>
									<div className="mt-0.5">{getLogIcon(log.level)}</div>
									<div className="flex-1 min-w-0">
										<div className="flex items-center gap-2 mb-1 flex-wrap">
											<Badge variant={getLogBadgeVariant(log.level)} className="text-xs">
												{log.level.toUpperCase()}
											</Badge>
											<Badge variant="outline" className="text-xs">
												{getCategoryLabel(log.category)}
											</Badge>
											<span className="text-xs text-muted-foreground">
												{formatTimestamp(log.timestamp)}
											</span>
										</div>
										<p className="text-sm break-words">{log.message}</p>
										{log.context && Object.keys(log.context).length > 0 && (
											<details className="mt-1">
												<summary className="text-xs text-muted-foreground cursor-pointer hover:text-foreground">
													Details anzeigen
												</summary>
												<pre className="text-xs mt-1 p-2 bg-muted rounded overflow-x-auto">
													{JSON.stringify(log.context, null, 2)}
												</pre>
											</details>
										)}
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

