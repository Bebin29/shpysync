"use client";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
	Table,
	TableBody,
	TableCell,
	TableHead,
	TableHeader,
	TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { AlertCircle, CheckCircle2, XCircle } from "lucide-react";

interface PreviewRow {
	id: string;
	rowNumber: number;
	sku: string;
	name: string;
	price?: string;
	stock?: number;
	matchStatus?: "matched" | "unmatched";
	matchMethod?: "sku" | "name" | "barcode" | "prefix" | null;
	matchConfidence?: "exact" | "partial" | "low";
}

interface PreviewTableProps {
	rows: PreviewRow[];
	unmatchedCount?: number;
	showUnmatchedOnly?: boolean;
	onShowUnmatchedToggle?: (show: boolean) => void;
}

/**
 * Vorschau-Tabelle für geplante Updates.
 * 
 * Zeigt alle gemappten CSV-Zeilen mit ihren zugeordneten Werten an.
 */
export function PreviewTable({
	rows,
	unmatchedCount = 0,
	showUnmatchedOnly = false,
	onShowUnmatchedToggle,
}: PreviewTableProps) {
	// Filtere Zeilen basierend auf showUnmatchedOnly
	const filteredRows = showUnmatchedOnly
		? rows.filter((row) => row.matchStatus === "unmatched")
		: rows;

	const hasUnmatched = unmatchedCount > 0;

	return (
		<Card>
			<CardHeader>
				<CardTitle>Vorschau</CardTitle>
				<CardDescription>
					Überprüfe die geplanten Updates vor der Ausführung
				</CardDescription>
			</CardHeader>
			<CardContent className="space-y-4">
				{hasUnmatched && (
					<Alert variant="destructive">
						<AlertCircle className="h-4 w-4" />
						<AlertDescription>
							{unmatchedCount} Zeile{unmatchedCount !== 1 ? "n" : ""} konnte{unmatchedCount === 1 ? "" : "n"} nicht
							gematcht werden.
							{onShowUnmatchedToggle && (
								<button
									onClick={() => onShowUnmatchedToggle(!showUnmatchedOnly)}
									className="ml-2 underline"
								>
									{showUnmatchedOnly ? "Alle Zeilen anzeigen" : "Nur nicht gematchte anzeigen"}
								</button>
							)}
						</AlertDescription>
					</Alert>
				)}

				{filteredRows.length === 0 ? (
					<div className="py-8 text-center text-sm text-muted-foreground">
						{showUnmatchedOnly
							? "Keine nicht gematchten Zeilen vorhanden."
							: "Keine Vorschau-Daten verfügbar."}
					</div>
				) : (
					<div className="rounded-md border">
						<Table>
							<TableHeader>
								<TableRow>
									<TableHead className="w-[80px]">Zeile</TableHead>
									<TableHead>SKU</TableHead>
									<TableHead>Name</TableHead>
									<TableHead className="text-right">Preis</TableHead>
									<TableHead className="text-right">Bestand</TableHead>
									<TableHead className="w-[120px]">Status</TableHead>
								</TableRow>
							</TableHeader>
							<TableBody>
								{filteredRows.map((row) => (
									<TableRow key={row.id}>
										<TableCell className="font-mono text-xs text-muted-foreground">
											{row.rowNumber}
										</TableCell>
										<TableCell className="font-mono text-sm">{row.sku || "-"}</TableCell>
										<TableCell>{row.name || "-"}</TableCell>
										<TableCell className="text-right">
											{row.price ? `${row.price} €` : "-"}
										</TableCell>
										<TableCell className="text-right">
											{row.stock !== undefined ? row.stock : "-"}
										</TableCell>
										<TableCell>
											{row.matchStatus === "matched" ? (
												<Badge variant="default" className="bg-green-500">
													<CheckCircle2 className="mr-1 h-3 w-3" />
													Gematcht
												</Badge>
											) : row.matchStatus === "unmatched" ? (
												<Badge variant="destructive">
													<XCircle className="mr-1 h-3 w-3" />
													Nicht gematcht
												</Badge>
											) : (
												<Badge variant="secondary">Unbekannt</Badge>
											)}
										</TableCell>
									</TableRow>
								))}
							</TableBody>
						</Table>
					</div>
				)}

				{filteredRows.length > 0 && (
					<div className="text-sm text-muted-foreground">
						Zeige {filteredRows.length} von {rows.length} Zeile{rows.length !== 1 ? "n" : ""}
						{showUnmatchedOnly && ` (${rows.length - filteredRows.length} gematchte Zeilen ausgeblendet)`}
					</div>
				)}
			</CardContent>
		</Card>
	);
}

