"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Download, CheckCircle, AlertCircle, X, RefreshCw, Loader2 } from "lucide-react";
import type { UpdateInfo, UpdateStatus } from "@/app/types/electron";

/**
 * Update-Section Komponente für die Verwaltung von App-Updates.
 * 
 * Zeigt Update-Status, ermöglicht manuelle Prüfung, Download und Installation.
 */
export function UpdateSection() {
	const [status, setStatus] = useState<UpdateStatus | null>(null);
	const [showNotification, setShowNotification] = useState(false);

	useEffect(() => {
		if (typeof window === "undefined" || !window.electron) return;

		// Lade initialen Status
		window.electron.update.getStatus().then(setStatus).catch((error) => {
			console.error("Fehler beim Laden des Update-Status:", error);
		});

		// Event-Listener
		window.electron.update.onChecking(() => {
			setStatus((prev) =>
				prev
					? {
							...prev,
							checking: true,
							error: null,
						}
					: null
			);
		});

		window.electron.update.onAvailable((info) => {
			setStatus((prev) => ({
				...prev,
				checking: false,
				available: true,
				info,
			}));
			setShowNotification(true);
		});

		window.electron.update.onNotAvailable(() => {
			setStatus((prev) =>
				prev
					? {
							...prev,
							checking: false,
							available: false,
						}
					: null
			);
		});

		window.electron.update.onDownloadProgress((progress) => {
			setStatus((prev) =>
				prev
					? {
							...prev,
							downloading: true,
							progress: progress.percent,
						}
					: null
			);
		});

		window.electron.update.onDownloaded(() => {
			setStatus((prev) =>
				prev
					? {
							...prev,
							downloading: false,
							downloaded: true,
						}
					: null
			);
		});

		window.electron.update.onError((error) => {
			setStatus((prev) =>
				prev
					? {
							...prev,
							checking: false,
							downloading: false,
							error: error.message,
						}
					: null
			);
		});

		return () => {
			window.electron.update.removeAllListeners("update:checking-for-update");
			window.electron.update.removeAllListeners("update:update-available");
			window.electron.update.removeAllListeners("update:update-not-available");
			window.electron.update.removeAllListeners("update:update-download-progress");
			window.electron.update.removeAllListeners("update:update-downloaded");
			window.electron.update.removeAllListeners("update:update-error");
		};
	}, []);

	const handleCheckForUpdates = async () => {
		if (!window.electron) return;
		try {
			await window.electron.update.check();
		} catch (error) {
			console.error("Fehler bei Update-Prüfung:", error);
		}
	};

	const handleDownload = async () => {
		if (!window.electron) return;
		try {
			await window.electron.update.download();
		} catch (error) {
			console.error("Fehler beim Update-Download:", error);
		}
	};

	const handleInstall = async () => {
		if (!window.electron) return;
		try {
			await window.electron.update.install();
		} catch (error) {
			console.error("Fehler bei Update-Installation:", error);
		}
	};

	if (!status) {
		return (
			<Button
				variant="outline"
				size="sm"
				onClick={handleCheckForUpdates}
				disabled={false}
			>
				<RefreshCw className="mr-2 h-4 w-4" />
				Auf Updates prüfen
			</Button>
		);
	}

	if (status.error) {
		return (
			<Alert variant="destructive">
				<AlertCircle className="h-4 w-4" />
				<AlertDescription>
					Update-Fehler: {status.error}
				</AlertDescription>
			</Alert>
		);
	}

	if (status.downloaded) {
		return (
			<Alert className="bg-green-50 border-green-200">
				<CheckCircle className="h-4 w-4 text-green-600" />
				<AlertDescription className="flex items-center justify-between">
					<div>
						<p className="font-semibold text-green-900">
							Update bereit zur Installation
						</p>
						<p className="text-sm text-green-700">
							Version {status.info?.version} wurde heruntergeladen
						</p>
					</div>
					<Button
						onClick={handleInstall}
						className="bg-green-600 hover:bg-green-700 text-white ml-4"
						size="sm"
					>
						Jetzt installieren
					</Button>
				</AlertDescription>
			</Alert>
		);
	}

	if (status.available && showNotification) {
		return (
			<Alert className="bg-blue-50 border-blue-200">
				<div className="flex items-start justify-between">
					<div className="flex-1">
						<p className="font-semibold text-blue-900 mb-1">
							Update verfügbar: Version {status.info?.version}
						</p>
						{status.info?.releaseNotes && (
							<p className="text-sm text-blue-700 mb-3">
								{status.info.releaseNotes}
							</p>
						)}

						{status.downloading && (
							<div className="space-y-2 mt-3">
								<Progress value={status.progress} />
								<p className="text-sm text-blue-700">
									Download: {Math.round(status.progress)}%
								</p>
							</div>
						)}

						{!status.downloading && (
							<Button
								onClick={handleDownload}
								className="w-full mt-2"
								size="sm"
							>
								<Download className="mr-2 h-4 w-4" />
								Update herunterladen
							</Button>
						)}
					</div>
					<Button
						variant="ghost"
						size="sm"
						onClick={() => setShowNotification(false)}
						className="ml-2"
					>
						<X className="h-4 w-4" />
					</Button>
				</div>
			</Alert>
		);
	}

	return (
		<div className="space-y-2">
			<Button
				variant="outline"
				size="sm"
				onClick={handleCheckForUpdates}
				disabled={status.checking}
			>
				{status.checking ? (
					<>
						<Loader2 className="mr-2 h-4 w-4 animate-spin" />
						Prüfe...
					</>
				) : (
					<>
						<RefreshCw className="mr-2 h-4 w-4" />
						Auf Updates prüfen
					</>
				)}
			</Button>
			{status.checking && (
				<p className="text-sm text-muted-foreground">
					Prüfe auf verfügbare Updates...
				</p>
			)}
		</div>
	);
}


