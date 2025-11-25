"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ChevronLeft, ChevronRight, Loader2 } from "lucide-react";
import { CsvUpload } from "@/app/components/csv-upload";
import { ColumnMappingComponent } from "@/app/components/column-mapping";
import { PreviewTable } from "@/app/components/preview-table";
import { useSyncStore } from "@/app/stores/sync-store";
import { useElectron } from "@/app/hooks/use-electron";
import { useConfig } from "@/app/hooks/use-config";
import type { ColumnMapping } from "../../electron/types/ipc";

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
			price?: string;
			stock?: number;
			matchStatus?: "matched" | "unmatched";
		}>;
		unmatchedCount: number;
	} | null>(null);
	const [isLoadingPreview, setIsLoadingPreview] = useState(false);
	const [showUnmatchedOnly, setShowUnmatchedOnly] = useState(false);

	const { csv } = useElectron();
	const { columnMapping: savedMapping, saveColumnMapping } = useConfig();
	const { setCsvFilePath: setStoreCsvPath, setStep } = useSyncStore();

	// Lade gespeichertes Mapping beim Mount
	useEffect(() => {
		if (savedMapping) {
			setColumnMapping(savedMapping);
		}
	}, [savedMapping]);

	// Aktualisiere Store, wenn CSV-Pfad geändert wird
	useEffect(() => {
		if (csvFilePath) {
			setStoreCsvPath(csvFilePath);
		}
	}, [csvFilePath, setStoreCsvPath]);

	const handleFileSelected = useCallback(async (filePath: string) => {
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
				// Wenn Header geladen wurden, gehe zu Schritt 2
				if (result.headers.length > 0) {
					setCurrentStep(2);
				}
			}
		} catch (error) {
			console.error("Fehler beim Laden der CSV-Header:", error);
		}
	}, [csv]);

	const handleMappingChange = useCallback((mapping: ColumnMapping) => {
		setColumnMapping(mapping);
	}, []);

	const handleLoadPreview = useCallback(async () => {
		if (!csvFilePath || !columnMapping.sku && !columnMapping.name) {
			return;
		}

		setIsLoadingPreview(true);
		try {
			const result = await csv.preview({
				filePath: csvFilePath,
				mapping: columnMapping,
				maxRows: 200,
			});

			if (result.success && result.data) {
				setCsvHeaders(result.data.headers);
				
				// Konvertiere Preview-Rows zu PreviewTable-Format
				const previewRows = result.data.previewRows.map((row) => ({
					id: `row-${row.rowNumber}`,
					rowNumber: row.rowNumber,
					sku: row.sku,
					name: row.name,
					price: row.price,
					stock: row.stock,
					matchStatus: "matched" as const, // TODO: Wird in Phase 6 mit Matching-Logik gefüllt
				}));

				setPreviewData({
					rows: previewRows,
					unmatchedCount: 0, // TODO: Wird in Phase 6 berechnet
				});

				setCurrentStep(3);
			} else {
				console.error("Fehler beim Laden der Vorschau:", result.error);
			}
		} catch (error) {
			console.error("Fehler beim Laden der Vorschau:", error);
		} finally {
			setIsLoadingPreview(false);
		}
	}, [csvFilePath, columnMapping, csv]);

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
			// Schritt 3 → 4: Vorschau bestätigt (wird in Phase 6 implementiert)
			setCurrentStep(4);
			setStep("running");
		}
	}, [currentStep, csvFilePath, columnMapping, handleLoadPreview, setStep]);

	const handleBack = useCallback(() => {
		if (currentStep > 1) {
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
			return !!(columnMapping.sku || columnMapping.name);
		} else if (currentStep === 3) {
			return !!previewData && previewData.rows.length > 0;
		}
		return false;
	}, [currentStep, csvFilePath, columnMapping, previewData]);

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
				<CsvUpload
					onFileSelected={handleFileSelected}
					selectedFilePath={csvFilePath}
					disabled={false}
				/>
			)}

			{/* Schritt 2: Spalten-Mapping */}
			{currentStep === 2 && csvHeaders.length > 0 && (
				<>
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
				<PreviewTable
					rows={previewData.rows}
					unmatchedCount={previewData.unmatchedCount}
					showUnmatchedOnly={showUnmatchedOnly}
					onShowUnmatchedToggle={setShowUnmatchedOnly}
				/>
			)}

			{/* Schritt 4: Ausführung (Platzhalter für Phase 6) */}
			{currentStep === 4 && (
				<Card>
					<CardContent className="py-8 text-center">
						<p className="text-muted-foreground">
							Ausführung wird in Phase 6 implementiert.
						</p>
					</CardContent>
				</Card>
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
						disabled={!canProceed || isLoadingPreview}
					>
						{isLoadingPreview ? (
							<>
								<Loader2 className="mr-2 h-4 w-4 animate-spin" />
								Lädt...
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
