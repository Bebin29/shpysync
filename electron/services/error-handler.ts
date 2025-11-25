/**
 * Error-Handler für IPC-Kommunikation.
 * 
 * Konvertiert WawiError zu ErrorInfo für IPC-Übertragung.
 */

import { WawiError } from "../../core/domain/errors.js";
import type { ErrorInfo } from "../types/ipc.js";

/**
 * Konvertiert einen Error zu ErrorInfo für IPC-Übertragung.
 */
export function errorToErrorInfo(error: unknown): ErrorInfo {
	if (error instanceof WawiError) {
		return {
			code: error.code,
			message: error.message,
			severity: error.severity,
			details: error.details,
			userMessage: error.getUserMessage(),
		};
	}

	if (error instanceof Error) {
		return {
			code: "INTERNAL_UNEXPECTED",
			message: error.message,
			severity: "error",
			details: {
				name: error.name,
				stack: error.stack,
			},
			userMessage: "Ein unerwarteter Fehler ist aufgetreten.",
		};
	}

	return {
		code: "INTERNAL_UNEXPECTED",
		message: String(error),
		severity: "error",
		details: { originalError: error },
		userMessage: "Ein unerwarteter Fehler ist aufgetreten.",
	};
}

/**
 * Wrapper für IPC-Handler, der Fehler automatisch zu ErrorInfo konvertiert.
 * 
 * @param handler - Async Handler-Funktion
 * @returns Wrapped Handler mit Error-Handling
 */
export function withErrorHandling<T extends (...args: unknown[]) => Promise<unknown>>(
	handler: T
): T {
	return (async (...args: Parameters<T>) => {
		try {
			const result = await handler(...args);
			return result;
		} catch (error) {
			const errorInfo = errorToErrorInfo(error);
			console.error(`IPC Handler Error [${errorInfo.code}]:`, errorInfo.message, errorInfo.details);
			
			// Werfe den Fehler weiter (wird von Electron behandelt)
			// IPC-Handler sollten selbst entscheiden, wie sie Fehler zurückgeben
			throw error;
		}
	}) as T;
}

