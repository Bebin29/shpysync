"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import Link from "next/link";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Label } from "@/components/ui/label";
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "@/components/ui/select";
import { ChevronLeft, ChevronRight, Loader2, AlertCircle } from "lucide-react";
import { CsvUpload } from "@/app/components/csv-upload";
import { ColumnMappingComponent } from "@/app/components/column-mapping";
import { PreviewTable } from "@/app/components/preview-table";
import { SyncExecution } from "@/app/components/sync-execution";
import { ConfirmationDialog } from "@/app/components/confirmation-dialog";
import { useSyncStore } from "@/app/stores/sync-store";
import { useElectron } from "@/app/hooks/use-electron";
import { useConfig } from "@/app/hooks/use-config";
import { exportSyncResults, exportUnmatchedRows, exportLogs } from "@/app/lib/export-utils";
import type { ColumnMapping, SyncProgress, SyncLog, SyncResult, PlannedOperation } from "../../electron/types/ipc";

type WizardStep = 1 | 2 | 3 | 4;

/**
 * Synchronisations-Seite (Wizard).
 * 
 * Implementiert einen 4-stufigen Wizard:
 * 1. CSV-Upload
 * 2. Spalten-Mapping
 * 3. Vorschau
 * 4. Ausführung (wird in Phase 6 implementiert)
 */
export default function SyncPage() {
	const [currentStep, setCurrentStep] = useState<WizardStep>(1);
	const [csvFilePath, setCsvFilePath] = useState<string | undefined>();
	const [csvHeaders, setCsvHeaders] = useState<string[]>([]);
	const [columnMapping, setColumnMapping] = useState<ColumnMapping>({
		sku: "",
		name: "",
		price: "",
		stock: "",
	});
	const [previewData, setPreviewData] = useState<{
		rows: Array<{
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
			status?: "planned" | "success" | "failed" | "skipped";
		}>;
		unmatchedRows: Array<{
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
			status?: "planned" | "success" | "failed" | "skipped";
		}>;
	} | null>(null);
	const [plannedOperations, setPlannedOperations] = useState<PlannedOperation[]>([]);
	const [isLoadingPreview, setIsLoadingPreview] = useState(false);
	const [showConfirmationDialog, setShowConfirmationDialog] = useState(false);
	const [operationTypeFilter, setOperationTypeFilter] = useState<"all" | "price" | "inventory">("all");
	const [statusFilter, setStatusFilter] = useState<"all" | "planned" | "success" | "failed" | "skipped">("all");
	const [isSyncRunning, setIsSyncRunning] = useState(false);
	const [syncProgress, setSyncProgress] = useState<SyncProgress>({
		current: 0,
		total: 100,
		stage: "matching",
		message: "",
	});
	const [syncLogs, setSyncLogs] = useState<SyncLog[]>([]);

	// Helper-Funktion zum Erstellen von SyncLog-Objekten
	const createLog = useCallback((
		level: SyncLog["level"],
		category: SyncLog["category"],
		message: string,
		context?: Record<string, unknown>
	): SyncLog => {
		return {
			id: `log-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
			level,
			category,
			message,
			timestamp: new Date().toISOString(),
			context,
		};
	}, []);
	const [syncResult, setSyncResult] = useState<SyncResult | undefined>();
	const [updatePrices, setUpdatePrices] = useState(true);
	const [updateInventory, setUpdateInventory] = useState(true);
	const [csvError, setCsvError] = useState<string | null>(null);
	const [previewError, setPreviewError] = useState<string | null>(null);
	const [isTestRunning, setIsTestRunning] = useState(false);
	const [selectedTestOperationId, setSelectedTestOperationId] = useState<string | null>(null);

	const { csv, sync } = useElectron();
	const { columnMapping: savedMapping, saveColumnMapping, shopConfig } = useConfig();
	const { setCsvFilePath: setStoreCsvPath, setStep, addLog, setProgress, setCurrentAction, setResult } = useSyncStore();

	// Lade gespeichertes Mapping beim Mount
	useEffect(() => {
		if (savedMapping) {
			setColumnMapping(savedMapping);
		}
	}, [savedMapping]);

	// Lade Standard-Pfad beim Mount und wenn sich die Config ändert
	useEffect(() => {
		const loadDefaultPath = async () => {
			try {
				if (typeof window === "undefined" || !window.electron) {
					return;
				}
				const config = await window.electron.config.get();
				// DBF wird bevorzugt, wenn gesetzt
				const defaultPath = (config as { defaultDbfPath?: string; defaultCsvPath?: string }).defaultDbfPath || 
				                     (config as { defaultDbfPath?: string; defaultCsvPath?: string }).defaultCsvPath;
				if (defaultPath && !csvFilePath) {
					// Automatisch Standard-Pfad verwenden
					handleFileSelected(defaultPath);
				}
			} catch (err) {
				console.error("Fehler beim Laden des Standard-Pfads:", err);
			}
		};
		
		// Beim Mount: Standard-Pfad laden, wenn noch kein Pfad gesetzt ist
		if (!csvFilePath) {
			loadDefaultPath();
		}
		
		// Lade auch neu, wenn die Seite fokussiert wird (z.B. nach Änderung in Einstellungen)
		const handleFocus = () => {
			if (!csvFilePath) {
				loadDefaultPath();
			}
		};
		window.addEventListener("focus", handleFocus);
		
		return () => {
			window.removeEventListener("focus", handleFocus);
		};
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, []); // Nur beim Mount ausführen

	// Aktualisiere Store, wenn CSV-Pfad geändert wird
	useEffect(() => {
		if (csvFilePath) {
			setStoreCsvPath(csvFilePath);
		}
	}, [csvFilePath, setStoreCsvPath]);

	const handleFileSelected = useCallback(async (filePath: string) => {
		setCsvError(null);
		setCsvFilePath(filePath || undefined);
		if (!filePath) {
			setCsvHeaders([]);
			setPreviewData(null);
			setCurrentStep(1);
			return;
		}

		// Lade CSV-Header
		try {
			const result = await csv.getHeaders(filePath);
			if (result.success) {
				setCsvHeaders(result.headers);
				// Wenn Header geladen wurden, prüfe ob Mapping vorhanden ist
				if (result.headers.length > 0) {
					// Wenn Mapping bereits vorhanden ist, automatisch Vorschau laden (überspringe Schritt 2)
					if (columnMapping.sku || columnMapping.name) {
						// Mapping ist vorhanden, lade Vorschau automatisch
						// Die Vorschau wird in einem separaten useEffect geladen
						setCurrentStep(2); // Temporär zu Schritt 2, wird dann automatisch zu 3 gewechselt
					} else {
						// Kein Mapping vorhanden, zeige Mapping-Schritt
						setCurrentStep(2);
					}
				} else {
					setCsvError("Die CSV-Datei enthält keine Header.");
				}
			} else {
				setCsvError(result.error || "Fehler beim Laden der CSV-Header");
			}
		} catch (error) {
			const errorMessage = error instanceof Error ? error.message : "Unbekannter Fehler";
			setCsvError(`Fehler beim Laden der CSV-Datei: ${errorMessage}`);
			console.error("Fehler beim Laden der CSV-Header:", error);
		}
	}, [csv, columnMapping]);

	const handleMappingChange = useCallback((mapping: ColumnMapping) => {
		setColumnMapping(mapping);
	}, []);

	const handleLoadPreview = useCallback(async () => {
		if (!csvFilePath || (!columnMapping.sku && !columnMapping.name) || !shopConfig) {
			return;
		}

		setPreviewError(null);
		setIsLoadingPreview(true);
		try {
			// Verwende sync.preview für echte Vorschau mit Matching
			const result = await sync.preview({
				csvPath: csvFilePath,
				columnMapping,
				shopConfig,
				options: {
					updatePrices,
					updateInventory,
				},
			});

			if (result.success && result.data) {
				setPlannedOperations(result.data.planned);
				setSelectedTestOperationId(null); // Reset selection when preview changes
				
				// Konvertiere PlannedOperations zu PreviewRows
				const previewRows = result.data.planned.map((op: PlannedOperation, index: number) => ({
					id: op.id || `op-${index}`,
					rowNumber: index + 1,
					sku: op.sku || "",
					name: op.productTitle || op.variantTitle || "",
					productTitle: op.productTitle,
					variantTitle: op.variantTitle,
					type: op.type,
					oldPrice: op.type === "price" ? String(op.oldValue || "") : null,
					newPrice: op.type === "price" ? String(op.newValue) : null,
					oldStock: op.type === "inventory" ? (op.oldValue as number) : null,
					newStock: op.type === "inventory" ? (op.newValue as number) : null,
					matchStatus: "matched" as const,
					status: "planned" as const,
				}));

				// Konvertiere nicht-gematchte Zeilen
				const unmatchedRows = result.data.unmatchedRows.map((row: { rowNumber: number; sku: string; name: string; price?: string; stock?: number }, index: number) => ({
					id: `unmatched-${row.rowNumber}-${index}`,
					rowNumber: row.rowNumber,
					sku: row.sku,
					name: row.name,
					productTitle: null,
					variantTitle: null,
					type: undefined,
					oldPrice: row.price || null,
					newPrice: null,
					oldStock: row.stock ?? null,
					newStock: null,
					matchStatus: "unmatched" as const,
					status: "planned" as const,
				}));

				setPreviewData({
					rows: previewRows,
					unmatchedRows,
				});

				setCurrentStep(3);
			} else {
				const errorMessage = result.error || "Fehler beim Laden der Vorschau";
				setPreviewError(errorMessage);
				console.error("Fehler beim Laden der Vorschau:", result.error);
			}
		} catch (error) {
			const errorMessage = error instanceof Error ? error.message : "Unbekannter Fehler";
			setPreviewError(`Fehler beim Laden der Vorschau: ${errorMessage}`);
			console.error("Fehler beim Laden der Vorschau:", error);
		} finally {
			setIsLoadingPreview(false);
		}
	}, [csvFilePath, columnMapping, shopConfig, updatePrices, updateInventory, sync]);

	// Wenn Pfad, Header und Mapping vorhanden sind, automatisch Vorschau laden (überspringe Schritt 2)
	useEffect(() => {
		if (
			csvFilePath &&
			csvHeaders.length > 0 &&
			(columnMapping.sku || columnMapping.name) &&
			shopConfig &&
			currentStep === 2 &&
			!previewData &&
			!isLoadingPreview
		) {
			// Automatisch Vorschau laden, wenn alle Voraussetzungen erfüllt sind
			handleLoadPreview();
		}
	}, [csvFilePath, csvHeaders, columnMapping, shopConfig, currentStep, previewData, isLoadingPreview, handleLoadPreview]);

	// Sync-Event-Handler registrieren
	useEffect(() => {
		if (!sync) return;

		const handleProgress = (progress: SyncProgress) => {
			setSyncProgress(progress);
			setProgress(progress.current);
			setCurrentAction(progress.message);
		};

		const handleLog = (log: SyncLog) => {
			setSyncLogs((prev) => [...prev, log]);
			addLog(log);
		};

		// handlePreviewReady wird nicht mehr benötigt, da Vorschau jetzt über sync.preview kommt
		// Behalten für Kompatibilität, falls sync:previewReady Event noch verwendet wird
		const handlePreviewReady = (_operations: PlannedOperation[]) => {
			// Wird nicht mehr verwendet, da Vorschau jetzt über sync.preview kommt
			// Kann später entfernt werden
		};

		const handleComplete = (result: SyncResult) => {
			setSyncResult(result);
			setIsSyncRunning(false);
			setIsTestRunning(false);
			setStep("completed");
			setResult(result);
			// Progress auf 100% und stage auf "complete" setzen
			setSyncProgress({
				current: 100,
				total: 100,
				stage: "complete",
				message: "Synchronisation erfolgreich abgeschlossen",
			});
		};

		sync.onProgress(handleProgress);
		sync.onLog(handleLog);
		sync.onPreviewReady(handlePreviewReady);
		sync.onComplete(handleComplete);

		return () => {
			// Cleanup: Event-Listener entfernen
			if (typeof window !== "undefined" && window.electron) {
				window.electron.sync.removeAllListeners("sync:progress");
				window.electron.sync.removeAllListeners("sync:log");
				window.electron.sync.removeAllListeners("sync:previewReady");
				window.electron.sync.removeAllListeners("sync:complete");
			}
		};
	}, [sync, setProgress, setCurrentAction, addLog, setStep, setResult]);

	const handleStartSync = useCallback(async () => {
		if (!csvFilePath || !shopConfig || (!columnMapping.sku && !columnMapping.name)) {
			return;
		}

		setIsSyncRunning(true);
		setSyncLogs([]);
		setSyncResult(undefined);
		setSyncProgress({
			current: 0,
			total: 100,
			stage: "matching",
			message: "Synchronisation wird gestartet...",
		});
		setCurrentStep(4);
		setStep("running");

		try {
			await sync.start({
				csvPath: csvFilePath,
				columnMapping,
				shopConfig,
				options: {
					updatePrices,
					updateInventory,
					dryRun: false,
				},
			});
		} catch (error) {
			console.error("Fehler beim Starten des Syncs:", error);
			setIsSyncRunning(false);
			setStep("error");
			setCurrentStep(3); // Zurück zu Vorschau bei Fehler
			const errorLog = createLog(
				"error",
				"system",
				`Fehler beim Starten: ${error instanceof Error ? error.message : "Unbekannter Fehler"}`
			);
			addLog(errorLog);
		}
	}, [csvFilePath, shopConfig, columnMapping, updatePrices, updateInventory, sync, setStep, addLog, createLog]);

	const handleConfirmSync = useCallback(() => {
		setShowConfirmationDialog(false);
		handleStartSync();
	}, [handleStartSync]);

	const handleRequestSync = useCallback(() => {
		setShowConfirmationDialog(true);
	}, []);

	// Verfügbare Test-Operationen filtern (nur Inventory mit newValue > 0)
	const availableTestOperations = useMemo(() => {
		return plannedOperations.filter(
			(op) =>
				op.type === "inventory" &&
				typeof op.newValue === "number" &&
				op.newValue > 0
		);
	}, [plannedOperations]);

	const handleTestSync = useCallback(async () => {
		if (!shopConfig || !selectedTestOperationId) {
			return;
		}

		const selectedOperation = plannedOperations.find(
			(op) => op.id === selectedTestOperationId
		);

		if (!selectedOperation) {
			return;
		}

		setIsTestRunning(true);
		setSyncLogs([]);
		setSyncResult(undefined);
		setSyncProgress({
			current: 0,
			total: 100,
			stage: "matching",
			message: "Test-Synchronisation wird gestartet...",
		});
		setCurrentStep(4);
		setStep("running");

		try {
			await sync.test({
				shopConfig,
				plannedOperations: [selectedOperation], // Nur die ausgewählte Operation
			});
		} catch (error) {
			console.error("Fehler beim Test-Sync:", error);
			setIsSyncRunning(false);
			setIsTestRunning(false);
			setStep("error");
			setCurrentStep(3);
			const errorLog = createLog(
				"error",
				"system",
				`Fehler beim Test-Sync: ${error instanceof Error ? error.message : "Unbekannter Fehler"}`
			);
			addLog(errorLog);
		}
	}, [shopConfig, selectedTestOperationId, plannedOperations, sync, setStep, addLog, createLog]);

	const handleCancelSync = useCallback(async () => {
		try {
			await sync.cancel();
			setIsSyncRunning(false);
			setStep("error");
		} catch (error) {
			console.error("Fehler beim Abbrechen des Syncs:", error);
		}
	}, [sync, setStep]);

	const handleNext = useCallback(() => {
		if (currentStep === 1) {
			// Schritt 1 → 2: CSV wurde ausgewählt
			if (csvFilePath) {
				setCurrentStep(2);
			}
		} else if (currentStep === 2) {
			// Schritt 2 → 3: Mapping ist konfiguriert, lade Vorschau
			if (columnMapping.sku || columnMapping.name) {
				handleLoadPreview();
			}
		} else if (currentStep === 3) {
			// Schritt 3 → 4: Vorschau bestätigt, zeige Bestätigungs-Dialog
			handleRequestSync();
		}
	}, [currentStep, csvFilePath, columnMapping, handleLoadPreview, handleRequestSync]);

	const handleBack = useCallback(() => {
		if (currentStep > 1) {
			if (currentStep === 3) {
				// Vorschau zurücksetzen wenn zurück zu Mapping
				setPreviewData(null);
				setPreviewError(null);
			}
			setCurrentStep((prev) => (prev - 1) as WizardStep);
		}
	}, [currentStep]);

	const handleSaveMapping = useCallback(async () => {
		try {
			await saveColumnMapping(columnMapping);
		} catch (error) {
			console.error("Fehler beim Speichern des Mappings:", error);
		}
	}, [columnMapping, saveColumnMapping]);

	const canProceed = useMemo(() => {
		if (currentStep === 1) {
			return !!csvFilePath;
		} else if (currentStep === 2) {
			// WICHTIG: Auch shopConfig prüfen, da handleLoadPreview shopConfig benötigt
			return !!(columnMapping.sku || columnMapping.name) && !!shopConfig;
		} else if (currentStep === 3) {
			return (
				!!previewData &&
				previewData.rows.length > 0 &&
				(updatePrices || updateInventory) &&
				!!shopConfig
			);
		}
		return false;
	}, [currentStep, csvFilePath, columnMapping, previewData, updatePrices, updateInventory, shopConfig]);

	return (
		<div className="space-y-6">
			<div>
				<h1 className="text-3xl font-bold">Synchronisation</h1>
				<p className="text-muted-foreground">
					CSV-Datei hochladen und mit Shopify synchronisieren
				</p>
			</div>

			{/* Wizard-Stepper */}
			<div className="flex items-center justify-center gap-2">
				{[1, 2, 3, 4].map((step) => (
					<div key={step} className="flex items-center">
						<div
							className={`flex h-10 w-10 items-center justify-center rounded-full border-2 ${
								currentStep === step
									? "border-blue-500 bg-blue-500 text-white"
									: currentStep > step
										? "border-green-500 bg-green-500 text-white"
										: "border-gray-300 bg-white text-gray-500"
							}`}
						>
							{currentStep > step ? "✓" : step}
						</div>
						{step < 4 && (
							<div
								className={`h-1 w-16 ${
									currentStep > step ? "bg-green-500" : "bg-gray-300"
								}`}
							/>
						)}
					</div>
				))}
			</div>

			{/* Schritt 1: CSV-Upload */}
			{currentStep === 1 && (
				<>
					{csvError && (
						<Alert variant="destructive" className="mb-4">
							<AlertCircle className="h-4 w-4" />
							<AlertDescription>{csvError}</AlertDescription>
						</Alert>
					)}
					<CsvUpload
						onFileSelected={handleFileSelected}
						selectedFilePath={csvFilePath}
						disabled={false}
					/>
				</>
			)}

			{/* Schritt 2: Spalten-Mapping */}
			{currentStep === 2 && csvHeaders.length > 0 && (
				<>
					{!shopConfig && (
						<Alert variant="destructive" className="mb-4">
							<AlertCircle className="h-4 w-4" />
							<AlertDescription>
								Shop-Konfiguration fehlt. Bitte konfiguriere zuerst einen Shop in den{" "}
								<Link href="/settings" className="underline font-medium">
									Einstellungen
								</Link>
								.
							</AlertDescription>
						</Alert>
					)}
					{previewError && (
						<Alert variant="destructive" className="mb-4">
							<AlertCircle className="h-4 w-4" />
							<AlertDescription>{previewError}</AlertDescription>
						</Alert>
					)}
					<ColumnMappingComponent
						headers={csvHeaders}
						mapping={columnMapping}
						onMappingChange={handleMappingChange}
						disabled={false}
					/>
					<div className="flex justify-end">
						<Button variant="outline" onClick={handleSaveMapping}>
							Mapping speichern
						</Button>
					</div>
				</>
			)}

			{/* Schritt 3: Vorschau */}
			{currentStep === 3 && previewData && (
				<>
					<PreviewTable
						rows={previewData.rows}
						unmatchedRows={previewData.unmatchedRows}
						operationTypeFilter={operationTypeFilter}
						statusFilter={statusFilter}
						onOperationTypeFilterChange={setOperationTypeFilter}
						onStatusFilterChange={setStatusFilter}
						onExport={() => {
							if (syncResult) {
								exportSyncResults(syncResult);
							}
						}}
						onExportUnmatched={() => {
							if (previewData.unmatchedRows.length > 0) {
								exportUnmatchedRows(previewData.unmatchedRows);
							}
						}}
					/>
					<Card>
						<CardContent className="py-4 space-y-4">
							<div className="flex items-center space-x-2">
								<input
									type="checkbox"
									id="update-prices"
									checked={updatePrices}
									onChange={(e) => setUpdatePrices(e.target.checked)}
									className="h-4 w-4"
								/>
								<label htmlFor="update-prices" className="text-sm font-medium">
									Preise aktualisieren
								</label>
							</div>
							<div className="flex items-center space-x-2">
								<input
									type="checkbox"
									id="update-inventory"
									checked={updateInventory}
									onChange={(e) => setUpdateInventory(e.target.checked)}
									className="h-4 w-4"
								/>
								<label htmlFor="update-inventory" className="text-sm font-medium">
									Bestände aktualisieren
								</label>
							</div>
							{!updatePrices && !updateInventory && (
								<Alert variant="destructive">
									<AlertCircle className="h-4 w-4" />
									<AlertDescription>
										Bitte wähle mindestens eine Option aus, um fortzufahren.
									</AlertDescription>
								</Alert>
							)}
						</CardContent>
					</Card>

					{/* Test-Button */}
					<Card>
						<CardContent className="py-4">
							<div className="space-y-4">
								<div>
									<h3 className="text-sm font-medium mb-1">Test-Synchronisation</h3>
									<p className="text-sm text-muted-foreground">
										Wähle einen Artikel aus, um die Synchronisation zu testen (Bestand &gt; 0)
									</p>
								</div>

								<div className="space-y-2">
									<Label htmlFor="test-product-select">Artikel auswählen</Label>
									<Select
										value={selectedTestOperationId || ""}
										onValueChange={setSelectedTestOperationId}
										disabled={isTestRunning || availableTestOperations.length === 0}
									>
										<SelectTrigger id="test-product-select">
											<SelectValue placeholder="Artikel auswählen..." />
										</SelectTrigger>
										<SelectContent>
											{availableTestOperations.map((op) => (
												<SelectItem key={op.id} value={op.id}>
													{op.productTitle || op.variantTitle || op.sku || "Unbekannt"}
													{op.sku && ` (SKU: ${op.sku})`}
													{` - Neuer Bestand: ${op.newValue}`}
												</SelectItem>
											))}
										</SelectContent>
									</Select>
								</div>

								<Button
									variant="outline"
									onClick={handleTestSync}
									disabled={isTestRunning || !selectedTestOperationId}
									className="w-full"
								>
									{isTestRunning ? (
										<>
											<Loader2 className="mr-2 h-4 w-4 animate-spin" />
											Test läuft...
										</>
									) : (
										"🧪 Test durchführen"
									)}
								</Button>
							</div>
						</CardContent>
					</Card>

					{/* Bestätigungs-Dialog */}
					<ConfirmationDialog
						open={showConfirmationDialog}
						onOpenChange={setShowConfirmationDialog}
						priceUpdatesCount={previewData.rows.filter((r) => r.type === "price").length}
						inventoryUpdatesCount={previewData.rows.filter((r) => r.type === "inventory").length}
						unmatchedRowsCount={previewData.unmatchedRows.length}
						onConfirm={handleConfirmSync}
						onCancel={() => setShowConfirmationDialog(false)}
					/>
				</>
			)}

			{/* Schritt 4: Ausführung */}
			{currentStep === 4 && (
				<SyncExecution
					progress={syncProgress}
					logs={syncLogs}
					result={syncResult}
					isRunning={isSyncRunning}
					onCancel={handleCancelSync}
					onExportResults={() => {
						if (syncResult) {
							exportSyncResults(syncResult);
						}
					}}
					onExportLogs={() => {
						if (syncLogs.length > 0) {
							exportLogs(syncLogs);
						}
					}}
				/>
			)}

			{/* Navigation */}
			<div className="flex justify-between">
				<Button
					variant="outline"
					onClick={handleBack}
					disabled={currentStep === 1}
				>
					<ChevronLeft className="mr-2 h-4 w-4" />
					Zurück
				</Button>

				{currentStep < 4 && (
					<Button
						onClick={handleNext}
						disabled={!canProceed || isLoadingPreview || isSyncRunning}
					>
						{isLoadingPreview ? (
							<>
								<Loader2 className="mr-2 h-4 w-4 animate-spin" />
								Lädt...
							</>
						) : currentStep === 3 ? (
							<>
								🔄 Synchronisieren
								<ChevronRight className="ml-2 h-4 w-4" />
							</>
						) : (
							<>
								Weiter
								<ChevronRight className="ml-2 h-4 w-4" />
							</>
						)}
					</Button>
				)}
			</div>
		</div>
	);
}
