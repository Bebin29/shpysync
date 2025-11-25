/**
 * Sync-Operation-Types für geplante und ausgeführte Updates.
 * 
 * Diese Types sind Teil des Core-Domain-Layers und unabhängig von Electron/IPC.
 */

export type OperationType = "price" | "inventory";

/**
 * Geplante Operation für Vorschau.
 * Wird vor der Ausführung generiert, um dem Benutzer eine Vorschau zu zeigen.
 */
export interface PlannedOperation {
	id: string;
	type: OperationType;
	sku?: string | null;
	productTitle?: string | null;
	variantTitle?: string | null;
	oldValue?: string | number | null;
	newValue: string | number;
}

/**
 * Status einer ausgeführten Operation.
 */
export type OperationStatus = "planned" | "success" | "failed" | "skipped";

/**
 * Ausgeführte Operation mit Status und optionaler Fehlermeldung.
 * Erweitert PlannedOperation um Status-Informationen.
 */
export interface OperationExecution extends PlannedOperation {
	status: OperationStatus;
	message?: string;
	errorCode?: string;
}

/**
 * Sync-Result mit geplanten und ausgeführten Operationen.
 * 
 * - `planned`: Alle geplanten Operationen (für Vorschau)
 * - `executed`: Ausgeführte Operationen (nach Sync-Ausführung)
 */
export interface SyncPreviewResult {
	planned: PlannedOperation[];
	unmatchedRows: Array<{
		rowNumber: number;
		sku: string;
		name: string;
		price?: string;
		stock?: number;
	}>;
}


