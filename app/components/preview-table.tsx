"use client";

import { useState, useMemo } from "react";
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
import { Button } from "@/components/ui/button";
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { AlertCircle, CheckCircle2, XCircle, ArrowUpDown, Download } from "lucide-react";

interface PreviewRow {
	id: string;
	rowNumber: number;
	sku: string;
	name: string;
	productTitle?: string | null;
	variantTitle?: string | null;
	type?: "price" | "inventory";
	oldPrice?: string | null;
	newPrice?: string | null;
	oldStock?: number | null;
	newStock?: number | null;
	matchStatus?: "matched" | "unmatched";
	matchMethod?: "sku" | "name" | "barcode" | "prefix" | null;
	matchConfidence?: "exact" | "partial" | "low";
	status?: "planned" | "success" | "failed" | "skipped";
	message?: string;
}

interface PreviewTableProps {
	rows: PreviewRow[];
	unmatchedRows?: PreviewRow[];
	operationTypeFilter?: "all" | "price" | "inventory";
	statusFilter?: "all" | "planned" | "success" | "failed" | "skipped";
	onOperationTypeFilterChange?: (filter: "all" | "price" | "inventory") => void;
	onStatusFilterChange?: (filter: "all" | "planned" | "success" | "failed" | "skipped") => void;
	onExport?: () => void;
	onExportUnmatched?: () => void;
}

type SortField = "rowNumber" | "sku" | "name" | "price" | "stock";
type SortDirection = "asc" | "desc";

/**
 * Vorschau-Tabelle für geplante Updates.
 * 
 * Zeigt alle gemappten CSV-Zeilen mit ihren zugeordneten Werten an.
 * Unterstützt Filter, Sortierung und Tabs für nicht-gematchte Zeilen.
 */
export function PreviewTable({
	rows,
	unmatchedRows = [],
	operationTypeFilter = "all",
	statusFilter = "all",
	onOperationTypeFilterChange,
	onStatusFilterChange,
	onExport,
	onExportUnmatched,
}: PreviewTableProps) {
	const [sortField, setSortField] = useState<SortField>("rowNumber");
	const [sortDirection, setSortDirection] = useState<SortDirection>("asc");
	const [activeTab, setActiveTab] = useState<"all" | "unmatched">("all");

	const unmatchedCount = unmatchedRows.length;
	const hasUnmatched = unmatchedCount > 0;

	// Filtere Zeilen basierend auf Tab, OperationType und Status
	const filteredRows = useMemo(() => {
		let filtered = activeTab === "unmatched" ? unmatchedRows : rows;

		// Filter nach OperationType
		if (operationTypeFilter !== "all") {
			filtered = filtered.filter((row) => row.type === operationTypeFilter);
		}

		// Filter nach Status (nur wenn Status vorhanden)
		if (statusFilter !== "all") {
			filtered = filtered.filter((row) => row.status === statusFilter);
		}

		// Sortierung
		const sorted = [...filtered].sort((a, b) => {
			let aValue: string | number | null | undefined;
			let bValue: string | number | null | undefined;

			switch (sortField) {
				case "rowNumber":
					aValue = a.rowNumber;
					bValue = b.rowNumber;
					break;
				case "sku":
					aValue = a.sku || "";
					bValue = b.sku || "";
					break;
				case "name":
					aValue = a.name || "";
					bValue = b.name || "";
					break;
				case "price":
					aValue = a.newPrice ? parseFloat(a.newPrice) : null;
					bValue = b.newPrice ? parseFloat(b.newPrice) : null;
					break;
				case "stock":
					aValue = a.newStock ?? null;
					bValue = b.newStock ?? null;
					break;
			}

			if (aValue === null || aValue === undefined) return 1;
			if (bValue === null || bValue === undefined) return -1;

			const comparison = aValue < bValue ? -1 : aValue > bValue ? 1 : 0;
			return sortDirection === "asc" ? comparison : -comparison;
		});

		return sorted;
	}, [rows, unmatchedRows, activeTab, operationTypeFilter, statusFilter, sortField, sortDirection]);

	const handleSort = (field: SortField) => {
		if (sortField === field) {
			setSortDirection(sortDirection === "asc" ? "desc" : "asc");
		} else {
			setSortField(field);
			setSortDirection("asc");
		}
	};

	const SortButton = ({ field, children }: { field: SortField; children: React.ReactNode }) => (
		<button
			onClick={() => handleSort(field)}
			className="flex items-center gap-1 hover:text-foreground"
		>
			{children}
			<ArrowUpDown className="h-3 w-3" />
		</button>
	);

	const priceOperations = rows.filter((r) => r.type === "price").length;
	const inventoryOperations = rows.filter((r) => r.type === "inventory").length;

	return (
		<Card>
			<CardHeader>
				<div className="flex items-center justify-between">
					<div>
						<CardTitle>Vorschau</CardTitle>
						<CardDescription>
							Überprüfe die geplanten Updates vor der Ausführung
						</CardDescription>
					</div>
					{onExport && (
						<Button variant="outline" size="sm" onClick={onExport}>
							<Download className="mr-2 h-4 w-4" />
							Exportieren
						</Button>
					)}
				</div>
			</CardHeader>
			<CardContent className="space-y-4">
				{hasUnmatched && (
					<Alert variant="destructive">
						<AlertCircle className="h-4 w-4" />
						<AlertDescription>
							{unmatchedCount} Zeile{unmatchedCount !== 1 ? "n" : ""} konnte{unmatchedCount === 1 ? "" : "n"} nicht
							gematcht werden.
						</AlertDescription>
					</Alert>
				)}

				{/* Filter und Tabs */}
				<div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
					<Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as "all" | "unmatched")}>
						<TabsList>
							<TabsTrigger value="all">
								Alle ({rows.length})
							</TabsTrigger>
							{hasUnmatched && (
								<TabsTrigger value="unmatched">
									Nicht gematcht ({unmatchedCount})
								</TabsTrigger>
							)}
						</TabsList>
					</Tabs>

					<div className="flex flex-wrap gap-2">
						{onOperationTypeFilterChange && (
							<Select value={operationTypeFilter} onValueChange={onOperationTypeFilterChange}>
								<SelectTrigger className="w-[140px]">
									<SelectValue placeholder="Typ" />
								</SelectTrigger>
								<SelectContent>
									<SelectItem value="all">Alle Typen</SelectItem>
									<SelectItem value="price">Preise ({priceOperations})</SelectItem>
									<SelectItem value="inventory">Bestände ({inventoryOperations})</SelectItem>
								</SelectContent>
							</Select>
						)}

						{onStatusFilterChange && (
							<Select value={statusFilter} onValueChange={onStatusFilterChange}>
								<SelectTrigger className="w-[140px]">
									<SelectValue placeholder="Status" />
								</SelectTrigger>
								<SelectContent>
									<SelectItem value="all">Alle Status</SelectItem>
									<SelectItem value="planned">Geplant</SelectItem>
									<SelectItem value="success">Erfolgreich</SelectItem>
									<SelectItem value="failed">Fehlgeschlagen</SelectItem>
									<SelectItem value="skipped">Übersprungen</SelectItem>
								</SelectContent>
							</Select>
						)}
					</div>
				</div>

				{/* Tabelle */}
				{filteredRows.length === 0 ? (
					<div className="py-8 text-center text-sm text-muted-foreground">
						{activeTab === "unmatched"
							? "Keine nicht gematchten Zeilen vorhanden."
							: "Keine Vorschau-Daten verfügbar."}
					</div>
				) : (
					<div className="rounded-md border">
						<Table>
							<TableHeader>
								<TableRow>
									<TableHead className="w-[80px]">
										<SortButton field="rowNumber">Zeile</SortButton>
									</TableHead>
									<TableHead>
										<SortButton field="sku">SKU</SortButton>
									</TableHead>
									<TableHead>
										<SortButton field="name">Name</SortButton>
									</TableHead>
									<TableHead className="text-right">
										<SortButton field="price">Preis</SortButton>
									</TableHead>
									<TableHead className="text-right">
										<SortButton field="stock">Bestand</SortButton>
									</TableHead>
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
										<TableCell>
											<div>
												{row.productTitle && (
													<div className="font-medium">{row.productTitle}</div>
												)}
												{row.variantTitle && (
													<div className="text-xs text-muted-foreground">{row.variantTitle}</div>
												)}
												{!row.productTitle && !row.variantTitle && (row.name || "-")}
											</div>
										</TableCell>
										<TableCell className="text-right">
											{row.type === "price" ? (
												<div>
													{row.oldPrice && (
														<div className="text-xs text-muted-foreground line-through">
															{row.oldPrice} €
														</div>
													)}
													<div className="font-medium">{row.newPrice || "-"} €</div>
												</div>
											) : (
												"-"
											)}
										</TableCell>
										<TableCell className="text-right">
											{row.type === "inventory" ? (
												<div>
													{row.oldStock !== null && row.oldStock !== undefined && (
														<div className="text-xs text-muted-foreground line-through">
															{row.oldStock}
														</div>
													)}
													<div className="font-medium">{row.newStock ?? "-"}</div>
												</div>
											) : (
												"-"
											)}
										</TableCell>
										<TableCell>
											{row.status === "success" ? (
												<Badge variant="default" className="bg-green-500">
													<CheckCircle2 className="mr-1 h-3 w-3" />
													Erfolgreich
												</Badge>
											) : row.status === "failed" ? (
												<Badge variant="destructive">
													<XCircle className="mr-1 h-3 w-3" />
													Fehlgeschlagen
												</Badge>
											) : row.status === "skipped" ? (
												<Badge variant="secondary">Übersprungen</Badge>
											) : row.matchStatus === "matched" ? (
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
												<Badge variant="secondary">Geplant</Badge>
											)}
										</TableCell>
									</TableRow>
								))}
							</TableBody>
						</Table>
					</div>
				)}

				{/* Footer mit Statistiken */}
				<div className="flex items-center justify-between text-sm text-muted-foreground">
					<div>
						Zeige {filteredRows.length} von {activeTab === "unmatched" ? unmatchedCount : rows.length} Zeile
						{(activeTab === "unmatched" ? unmatchedCount : rows.length) !== 1 ? "n" : ""}
					</div>
					{activeTab === "unmatched" && onExportUnmatched && (
						<Button variant="outline" size="sm" onClick={onExportUnmatched}>
							<Download className="mr-2 h-4 w-4" />
							Nicht gematchte exportieren
						</Button>
					)}
				</div>
			</CardContent>
		</Card>
	);
}

