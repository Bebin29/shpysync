"use client";

import { useState, useEffect } from "react";
import type { DashboardStats, SyncHistoryEntry } from "@/app/types/electron";

/**
 * Hook für Dashboard-Daten.
 * Lädt Dashboard-Stats und Sync-Historie via IPC.
 */
export function useDashboard() {
	const [stats, setStats] = useState<DashboardStats | null>(null);
	const [history, setHistory] = useState<SyncHistoryEntry[]>([]);
	const [loading, setLoading] = useState(true);
	const [error, setError] = useState<string | null>(null);

	/**
	 * Lädt Dashboard-Daten.
	 */
	const loadData = async (): Promise<void> => {
		try {
			setLoading(true);
			setError(null);

			// Prüfe ob Electron API verfügbar ist
			if (typeof window === "undefined" || !window.electron) {
				throw new Error("Electron API nicht verfügbar");
			}

			// Prüfe ob Dashboard-API verfügbar ist
			if (!window.electron.dashboard) {
				throw new Error("Dashboard API nicht verfügbar. Bitte App neu starten.");
			}

			// Prüfe ob getStats und getHistory verfügbar sind
			if (typeof window.electron.dashboard.getStats !== "function") {
				throw new Error("Dashboard getStats Funktion nicht verfügbar");
			}
			if (typeof window.electron.dashboard.getHistory !== "function") {
				throw new Error("Dashboard getHistory Funktion nicht verfügbar");
			}

			// Lade Stats und Historie parallel
			const [statsData, historyData] = await Promise.all([
				window.electron.dashboard.getStats(),
				window.electron.dashboard.getHistory(10),
			]);

			setStats(statsData);
			setHistory(historyData);
		} catch (err) {
			const errorMessage = err instanceof Error ? err.message : "Unbekannter Fehler";
			setError(errorMessage);
			console.error("Fehler beim Laden der Dashboard-Daten:", err);
			// Setze Standardwerte bei Fehler
			setStats(null);
			setHistory([]);
		} finally {
			setLoading(false);
		}
	};

	// Initiales Laden
	useEffect(() => {
		loadData();
	}, []);

	// Auto-Refresh alle 30 Sekunden
	useEffect(() => {
		const interval = setInterval(() => {
			loadData();
		}, 30000);

		return () => clearInterval(interval);
	}, []);

	return {
		stats,
		history,
		loading,
		error,
		refresh: loadData,
	};
}



