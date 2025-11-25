"use client";

import { create } from "zustand";
import type { SyncResult, SyncLog } from "../../electron/types/ipc";

/**
 * Sync-Step-Typen für den Wizard-Flow.
 */
export type SyncStep = "idle" | "mapping" | "preview" | "running" | "completed" | "error";

/**
 * Preview-Row für die Vorschau-Tabelle.
 */
export interface PreviewRow {
	id: string;
	sku?: string;
	name: string;
	productTitle?: string;
	variantTitle?: string;
	oldPrice?: string;
	newPrice?: string;
	oldStock?: number;
	newStock?: number;
	matchMethod?: "sku" | "name" | "barcode" | "prefix" | null;
	matchConfidence?: "exact" | "partial" | "low";
}

/**
 * Sync-UI-State für die gesamte Synchronisations-UI.
 */
interface SyncUIState {
	// Wizard-Step
	step: SyncStep;

	// Fortschritt (0-100)
	progress: number;

	// Aktuelle Aktion (z.B. "CSV wird geparst", "Produkte laden")
	currentAction?: string;

	// Log-Einträge
	logEntries: SyncLog[];

	// Vorschau-Zeilen (max 200 für Performance)
	previewRows: PreviewRow[];

	// Sync-Ergebnis (nach Abschluss)
	result?: SyncResult;

	// CSV-Datei-Pfad
	csvFilePath?: string;

	// Fehler-Meldung
	error?: string;
}

/**
 * Actions für den Sync-Store.
 */
interface SyncUIActions {
	// Step-Management
	setStep: (step: SyncStep) => void;
	reset: () => void;

	// Fortschritt
	setProgress: (progress: number) => void;
	setCurrentAction: (action?: string) => void;

	// Logs
	addLog: (log: SyncLog) => void;
	clearLogs: () => void;

	// Vorschau
	setPreviewRows: (rows: PreviewRow[]) => void;
	clearPreview: () => void;

	// Ergebnis
	setResult: (result: SyncResult) => void;
	clearResult: () => void;

	// CSV
	setCsvFilePath: (path?: string) => void;

	// Fehler
	setError: (error?: string) => void;
}

/**
 * Initialer State.
 */
const initialState: SyncUIState = {
	step: "idle",
	progress: 0,
	currentAction: undefined,
	logEntries: [],
	previewRows: [],
	result: undefined,
	csvFilePath: undefined,
	error: undefined,
};

/**
 * Zustand-Store für Sync-UI.
 */
export const useSyncStore = create<SyncUIState & SyncUIActions>((set) => ({
	...initialState,

	// Step-Management
	setStep: (step) => set({ step, error: undefined }),

	reset: () => set(initialState),

	// Fortschritt
	setProgress: (progress) => set({ progress }),
	setCurrentAction: (action) => set({ currentAction: action }),

	// Logs
	addLog: (log) =>
		set((state) => ({
			logEntries: [...state.logEntries, log].slice(-1000), // Max 1000 Logs
		})),

	clearLogs: () => set({ logEntries: [] }),

	// Vorschau
	setPreviewRows: (rows) =>
		set({
			previewRows: rows.slice(0, 200), // Max 200 Zeilen für Performance
		}),

	clearPreview: () => set({ previewRows: [] }),

	// Ergebnis
	setResult: (result) =>
		set({
			result,
			step: "completed",
			progress: 100,
		}),

	clearResult: () => set({ result: undefined }),

	// CSV
	setCsvFilePath: (path) => set({ csvFilePath: path }),

	// Fehler
	setError: (error) =>
		set({
			error,
			step: error ? "error" : "idle",
		}),
}));

