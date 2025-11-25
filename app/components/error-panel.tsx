"use client";

import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { AlertCircle, XCircle, Info, AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/button";
import Link from "next/link";

/**
 * Fehler-Information für UI-Darstellung.
 */
export interface ErrorInfo {
	code: string;
	message: string;
	severity: "info" | "warning" | "error" | "fatal";
	details?: unknown;
	userMessage: string;
}

interface ErrorPanelProps {
	error: ErrorInfo | null | undefined;
	onDismiss?: () => void;
	showDetails?: boolean;
	className?: string;
}

/**
 * Error-Panel-Komponente für konsistente Fehlerdarstellung.
 * 
 * Zeigt Fehler basierend auf Severity an:
 * - info: Blaue Info-Box
 * - warning: Orange Warnung
 * - error: Rote Fehlermeldung
 * - fatal: Rote Fehlermeldung mit zusätzlicher Betonung
 */
export function ErrorPanel({
	error,
	onDismiss,
	showDetails = false,
	className,
}: ErrorPanelProps) {
	if (!error) {
		return null;
	}

	const getIcon = () => {
		switch (error.severity) {
			case "info":
				return <Info className="h-4 w-4" />;
			case "warning":
				return <AlertTriangle className="h-4 w-4" />;
			case "error":
			case "fatal":
				return <XCircle className="h-4 w-4" />;
			default:
				return <AlertCircle className="h-4 w-4" />;
		}
	};

	const getVariant = (): "default" | "destructive" => {
		return error.severity === "error" || error.severity === "fatal"
			? "destructive"
			: "default";
	};

	const getSeverityColor = () => {
		switch (error.severity) {
			case "info":
				return "border-blue-500 bg-blue-50 dark:bg-blue-950 dark:border-blue-800";
			case "warning":
				return "border-orange-500 bg-orange-50 dark:bg-orange-950 dark:border-orange-800";
			case "error":
			case "fatal":
				return "";
			default:
				return "";
		}
	};

	const getActionLink = () => {
		// Bestimme Link basierend auf Fehlercode
		if (error.code.startsWith("CONFIG_")) {
			return { href: "/settings", text: "Zu den Einstellungen" };
		}
		if (error.code.startsWith("CSV_")) {
			return null; // CSV-Fehler haben keinen direkten Link
		}
		if (error.code.startsWith("SHOPIFY_")) {
			if (error.code === "SHOPIFY_INVALID_TOKEN" || error.code === "SHOPIFY_INSUFFICIENT_SCOPES") {
				return { href: "/settings", text: "Token erneuern" };
			}
		}
		return null;
	};

	const actionLink = getActionLink();

	return (
		<Alert
			variant={getVariant()}
			className={`${getSeverityColor()} ${className || ""}`}
		>
			{getIcon()}
			<AlertTitle className="flex items-center justify-between">
				<span>
					{error.severity === "fatal"
						? "Kritischer Fehler"
						: error.severity === "error"
							? "Fehler"
							: error.severity === "warning"
								? "Warnung"
								: "Information"}
				</span>
				{onDismiss && (
					<Button
						variant="ghost"
						size="sm"
						onClick={onDismiss}
						className="h-auto p-0 ml-2"
					>
						×
					</Button>
				)}
			</AlertTitle>
			<AlertDescription className="mt-2">
				<div className="space-y-2">
					<p>{error.userMessage || error.message}</p>

					{showDetails && error.details !== undefined && error.details !== null && (
						<details className="mt-2 text-xs opacity-75">
							<summary className="cursor-pointer">Technische Details</summary>
							<pre className="mt-2 p-2 bg-black/10 dark:bg-white/10 rounded overflow-auto">
								{JSON.stringify(error.details, null, 2)}
							</pre>
						</details>
					)}

					{actionLink && (
						<div className="mt-3">
							<Link href={actionLink.href}>
								<Button variant="outline" size="sm">
									{actionLink.text}
								</Button>
							</Link>
						</div>
					)}
				</div>
			</AlertDescription>
		</Alert>
	);
}

/**
 * Konvertiert einen Error zu ErrorInfo für UI-Darstellung.
 */
export function errorToErrorInfo(error: unknown): ErrorInfo | null {
	if (!error) {
		return null;
	}

	// Wenn bereits ErrorInfo, direkt zurückgeben
	if (
		typeof error === "object" &&
		error !== null &&
		"code" in error &&
		"severity" in error &&
		"userMessage" in error
	) {
		return error as ErrorInfo;
	}

	// Wenn Standard Error, konvertieren
	if (error instanceof Error) {
		return {
			code: "INTERNAL_UNEXPECTED",
			message: error.message,
			severity: "error",
			userMessage: error.message,
		};
	}

	// Fallback
	return {
		code: "INTERNAL_UNEXPECTED",
		message: String(error),
		severity: "error",
		userMessage: "Ein unerwarteter Fehler ist aufgetreten.",
	};
}

