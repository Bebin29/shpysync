"use client";

import { useEffect, useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { CheckCircle2, XCircle, Loader2 } from "lucide-react";

/**
 * IPC-Verbindungstest-Komponente für Phase 1.
 * 
 * Testet die IPC-Verbindung zwischen Renderer und Main Process.
 */
export function IpcTest() {
	const [status, setStatus] = useState<"idle" | "testing" | "success" | "error">("idle");
	const [message, setMessage] = useState<string>("");

	const testIpc = async () => {
		setStatus("testing");
		setMessage("");

		try {
			if (typeof window !== "undefined" && window.electron) {
				const result = await window.electron.ping();
				if (result === "pong") {
					setStatus("success");
					setMessage("IPC-Verbindung erfolgreich! ✅");
				} else {
					setStatus("error");
					setMessage(`Unerwartete Antwort: ${result}`);
				}
			} else {
				setStatus("error");
				setMessage("Electron API nicht verfügbar (läuft im Browser-Modus?)");
			}
		} catch (error) {
			setStatus("error");
			setMessage(`Fehler: ${error instanceof Error ? error.message : String(error)}`);
		}
	};

	// Automatischer Test beim Mount (nur im Electron-Kontext)
	useEffect(() => {
		if (typeof window !== "undefined" && window.electron) {
			testIpc();
		}
	}, []);

	return (
		<Card>
			<CardHeader>
				<CardTitle>IPC-Verbindungstest</CardTitle>
				<CardDescription>
					Testet die Kommunikation zwischen Renderer und Main Process
				</CardDescription>
			</CardHeader>
			<CardContent className="space-y-4">
				<div className="flex items-center gap-2">
					{status === "idle" && <div className="h-5 w-5" />}
					{status === "testing" && <Loader2 className="h-5 w-5 animate-spin text-blue-500" />}
					{status === "success" && <CheckCircle2 className="h-5 w-5 text-green-500" />}
					{status === "error" && <XCircle className="h-5 w-5 text-red-500" />}
					<span className={status === "success" ? "text-green-600" : status === "error" ? "text-red-600" : ""}>
						{message || (status === "testing" ? "Teste IPC-Verbindung..." : "Bereit zum Testen")}
					</span>
				</div>
				<Button onClick={testIpc} disabled={status === "testing"} variant="outline">
					Erneut testen
				</Button>
			</CardContent>
		</Card>
	);
}

