"use client";

import { useCallback, useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Upload, FileText, X, AlertCircle } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { useElectron } from "../hooks/use-electron";

interface CsvUploadProps {
	onFileSelected: (filePath: string) => void;
	selectedFilePath?: string;
	disabled?: boolean;
}

/**
 * CSV-Upload-Komponente mit Drag & Drop und Dateiauswahl.
 * 
 * Übergibt nur den Dateipfad an den Main-Prozess (keine Datei-Inhalte).
 */
export function CsvUpload({ onFileSelected, selectedFilePath, disabled }: CsvUploadProps) {
	const [isDragging, setIsDragging] = useState(false);
	const [error, setError] = useState<string | null>(null);
	const [isLoading, setIsLoading] = useState(false);
	const { csv } = useElectron();

	const handleFileSelect = useCallback(
		async (filePath: string) => {
			setError(null);
			setIsLoading(true);

			try {
				// Validiere Dateityp
				const lowerPath = filePath.toLowerCase();
				if (!lowerPath.endsWith(".csv") && !lowerPath.endsWith(".dbf")) {
					setError("Nur CSV- und DBF-Dateien werden unterstützt.");
					return;
				}

				// Übergebe Dateipfad an Parent-Komponente
				onFileSelected(filePath);
			} catch (err) {
				setError(err instanceof Error ? err.message : "Fehler beim Auswählen der Datei.");
			} finally {
				setIsLoading(false);
			}
		},
		[onFileSelected]
	);

	const handleBrowseClick = useCallback(async () => {
		if (disabled) {
			return;
		}

		setError(null);
		setIsLoading(true);

		try {
			const result = await csv.selectFile();
			if (result.success && result.filePath) {
				await handleFileSelect(result.filePath);
			}
		} catch (err) {
			setError(err instanceof Error ? err.message : "Fehler beim Öffnen des Datei-Dialogs.");
		} finally {
			setIsLoading(false);
		}
	}, [csv, handleFileSelect, disabled]);

	const handleDragEnter = useCallback((e: React.DragEvent<HTMLDivElement>) => {
		e.preventDefault();
		e.stopPropagation();
		if (!disabled) {
			setIsDragging(true);
		}
	}, [disabled]);

	const handleDragOver = useCallback((e: React.DragEvent<HTMLDivElement>) => {
		e.preventDefault();
		e.stopPropagation();
		if (!disabled) {
			setIsDragging(true);
		}
	}, [disabled]);

	const handleDragLeave = useCallback((e: React.DragEvent<HTMLDivElement>) => {
		e.preventDefault();
		e.stopPropagation();
		setIsDragging(false);
	}, []);

	const handleDrop = useCallback(
		async (e: React.DragEvent<HTMLDivElement>) => {
			e.preventDefault();
			e.stopPropagation();
			setIsDragging(false);

			if (disabled) {
				return;
			}

			const files = e.dataTransfer.files;
			if (files.length > 0) {
				const file = files[0];
				// Im Electron-Kontext müssen wir den Dateipfad über IPC holen
				// Für Drag & Drop verwenden wir den Dateinamen als Platzhalter
				// In einer vollständigen Implementierung würde man den Pfad aus dem Drag-Event extrahieren
				await handleFileSelect(file.name);
			}
		},
		[handleFileSelect, disabled]
	);

	const handleRemove = useCallback(() => {
		setError(null);
		onFileSelected("");
	}, [onFileSelected]);

	return (
		<Card>
			<CardHeader>
				<CardTitle>CSV/DBF-Datei hochladen</CardTitle>
				<CardDescription>
					Lade deine CSV- oder DBF-Datei mit Produktdaten hoch
				</CardDescription>
			</CardHeader>
			<CardContent className="space-y-4">
				{error && (
					<Alert variant="destructive">
						<AlertCircle className="h-4 w-4" />
						<AlertDescription>{error}</AlertDescription>
					</Alert>
				)}

				{selectedFilePath ? (
					<div className="flex items-center justify-between rounded-lg border border-gray-200 bg-gray-50 p-4">
						<div className="flex items-center gap-3">
							<FileText className="h-5 w-5 text-gray-600" />
							<div>
								<p className="text-sm font-medium text-gray-900">{selectedFilePath}</p>
								<p className="text-xs text-gray-500">
									{selectedFilePath.toLowerCase().endsWith(".dbf") ? "DBF-Datei" : "CSV-Datei"} ausgewählt
								</p>
							</div>
						</div>
						<Button
							variant="ghost"
							size="sm"
							onClick={handleRemove}
							disabled={disabled}
							aria-label="Datei entfernen"
						>
							<X className="h-4 w-4" />
						</Button>
					</div>
				) : (
					<div
						onDragEnter={handleDragEnter}
						onDragOver={handleDragOver}
						onDragLeave={handleDragLeave}
						onDrop={handleDrop}
						className={`flex flex-col items-center justify-center rounded-lg border-2 border-dashed p-12 transition-colors ${
							isDragging
								? "border-blue-500 bg-blue-50"
								: disabled
									? "border-gray-200 bg-gray-50"
									: "border-gray-300 bg-white hover:border-gray-400"
						}`}
					>
						<Upload
							className={`mb-4 h-12 w-12 ${
								isDragging ? "text-blue-500" : "text-gray-400"
							}`}
						/>
						<p className="mb-2 text-sm font-medium text-gray-700">
							{isDragging ? "Datei hier ablegen" : "CSV/DBF-Datei auswählen"}
						</p>
						<p className="mb-4 text-xs text-gray-500">
							Drag & Drop oder klicke zum Auswählen (CSV oder DBF)
						</p>
						<Button onClick={handleBrowseClick} disabled={disabled || isLoading}>
							<FileText className="mr-2 h-4 w-4" />
							{isLoading ? "Lädt..." : "Datei auswählen"}
						</Button>
					</div>
				)}
			</CardContent>
		</Card>
	);
}

