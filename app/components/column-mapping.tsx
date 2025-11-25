"use client";

import { useCallback, useMemo } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { AlertCircle, CheckCircle2 } from "lucide-react";
import type { ColumnMapping } from "../../electron/types/ipc";
import { indexToColumnLetter } from "../../core/utils/normalization";

interface ColumnMappingProps {
	headers: string[];
	mapping: ColumnMapping;
	onMappingChange: (mapping: ColumnMapping) => void;
	disabled?: boolean;
}

/**
 * Spalten-Mapping-Komponente.
 * 
 * Ermöglicht die Zuordnung von CSV-Spalten zu logischen Feldern (SKU, Name, Preis, Bestand).
 */
export function ColumnMappingComponent({
	headers,
	mapping,
	onMappingChange,
	disabled,
}: ColumnMappingProps) {
	// Erstelle Mapping von Spaltennamen zu Buchstaben
	const columnOptions = useMemo(() => {
		return headers.map((header, index) => ({
			value: indexToColumnLetter(index),
			label: `${indexToColumnLetter(index)}: ${header}`,
			header,
		}));
	}, [headers]);

	const handleFieldChange = useCallback(
		(field: keyof ColumnMapping, columnLetter: string) => {
			onMappingChange({
				...mapping,
				[field]: columnLetter,
			});
		},
		[mapping, onMappingChange]
	);

	// Validierung: Mindestens SKU oder Name muss gemappt sein
	const isValid = useMemo(() => {
		return mapping.sku !== "" || mapping.name !== "";
	}, [mapping]);

	// Prüfe auf doppelte Zuordnungen
	const duplicateColumns = useMemo(() => {
		const values = Object.values(mapping);
		const duplicates = values.filter((value, index) => {
			if (value === "") {
				return false;
			}
			return values.indexOf(value) !== index;
		});
		return duplicates;
	}, [mapping]);

	return (
		<Card>
			<CardHeader>
				<CardTitle>Spalten zuordnen</CardTitle>
				<CardDescription>
					Ordne die CSV-Spalten den Shopify-Feldern zu
				</CardDescription>
			</CardHeader>
			<CardContent className="space-y-4">
				{!isValid && (
					<Alert variant="destructive">
						<AlertCircle className="h-4 w-4" />
						<AlertDescription>
							Mindestens SKU oder Name muss zugeordnet werden.
						</AlertDescription>
					</Alert>
				)}

				{duplicateColumns.length > 0 && (
					<Alert variant="destructive">
						<AlertCircle className="h-4 w-4" />
						<AlertDescription>
							Einige Spalten sind mehrfach zugeordnet. Bitte wähle unterschiedliche Spalten.
						</AlertDescription>
					</Alert>
				)}

				{isValid && duplicateColumns.length === 0 && (
					<Alert>
						<CheckCircle2 className="h-4 w-4" />
						<AlertDescription>
							Mapping ist gültig. Du kannst mit der Vorschau fortfahren.
						</AlertDescription>
					</Alert>
				)}

				<div className="grid gap-4 md:grid-cols-2">
					<div className="space-y-2">
						<Label htmlFor="sku-column">
							SKU <span className="text-red-500">*</span>
						</Label>
						<Select
							value={mapping.sku}
							onValueChange={(value) => handleFieldChange("sku", value)}
							disabled={disabled}
						>
							<SelectTrigger id="sku-column">
								<SelectValue placeholder="Spalte auswählen" />
							</SelectTrigger>
							<SelectContent>
								<SelectItem value="">Keine</SelectItem>
								{columnOptions.map((option) => (
									<SelectItem key={option.value} value={option.value}>
										{option.label}
									</SelectItem>
								))}
							</SelectContent>
						</Select>
					</div>

					<div className="space-y-2">
						<Label htmlFor="name-column">
							Name <span className="text-red-500">*</span>
						</Label>
						<Select
							value={mapping.name}
							onValueChange={(value) => handleFieldChange("name", value)}
							disabled={disabled}
						>
							<SelectTrigger id="name-column">
								<SelectValue placeholder="Spalte auswählen" />
							</SelectTrigger>
							<SelectContent>
								<SelectItem value="">Keine</SelectItem>
								{columnOptions.map((option) => (
									<SelectItem key={option.value} value={option.value}>
										{option.label}
									</SelectItem>
								))}
							</SelectContent>
						</Select>
					</div>

					<div className="space-y-2">
						<Label htmlFor="price-column">Preis</Label>
						<Select
							value={mapping.price}
							onValueChange={(value) => handleFieldChange("price", value)}
							disabled={disabled}
						>
							<SelectTrigger id="price-column">
								<SelectValue placeholder="Spalte auswählen" />
							</SelectTrigger>
							<SelectContent>
								<SelectItem value="">Keine</SelectItem>
								{columnOptions.map((option) => (
									<SelectItem key={option.value} value={option.value}>
										{option.label}
									</SelectItem>
								))}
							</SelectContent>
						</Select>
					</div>

					<div className="space-y-2">
						<Label htmlFor="stock-column">Bestand</Label>
						<Select
							value={mapping.stock}
							onValueChange={(value) => handleFieldChange("stock", value)}
							disabled={disabled}
						>
							<SelectTrigger id="stock-column">
								<SelectValue placeholder="Spalte auswählen" />
							</SelectTrigger>
							<SelectContent>
								<SelectItem value="">Keine</SelectItem>
								{columnOptions.map((option) => (
									<SelectItem key={option.value} value={option.value}>
										{option.label}
									</SelectItem>
								))}
							</SelectContent>
						</Select>
					</div>
				</div>
			</CardContent>
		</Card>
	);
}

