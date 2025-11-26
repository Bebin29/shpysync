"use strict";
/**
 * Zentraler Error-Typ für die gesamte Anwendung.
 *
 * Alle internen Fehler werden in WawiError gewrappt, um konsistente
 * Fehlerbehandlung und UI-Darstellung zu ermöglichen.
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.WawiError = void 0;
/**
 * WawiError - Zentraler Error-Typ für die Anwendung.
 *
 * Erweitert die Standard Error-Klasse um:
 * - code: Eindeutiger Fehlercode für programmatische Behandlung
 * - severity: Schweregrad für UI-Darstellung
 * - details: Zusätzliche Fehlerdetails (optional)
 */
class WawiError extends Error {
    constructor(code, message, severity = "error", details) {
        super(message);
        this.name = "WawiError";
        this.code = code;
        this.severity = severity;
        this.details = details;
        // Stelle sicher, dass Error.prototype.stack korrekt gesetzt wird
        if (Error.captureStackTrace) {
            Error.captureStackTrace(this, WawiError);
        }
    }
    /**
     * Erstellt eine benutzerfreundliche Fehlermeldung mit konkreten Hinweisen.
     */
    getUserMessage() {
        switch (this.code) {
            case "CSV_INVALID_FORMAT":
                return "Die CSV-Datei hat ein ungültiges Format. Bitte überprüfen Sie die Datei.";
            case "CSV_MISSING_COLUMN":
                return `Die CSV-Datei enthält nicht alle erforderlichen Spalten. Details: ${this.message}`;
            case "CSV_EMPTY":
                return "Die CSV-Datei ist leer oder enthält keine Datenzeilen.";
            case "CSV_FILE_NOT_FOUND":
                return `Die CSV-Datei wurde nicht gefunden: ${this.message}`;
            case "CSV_MAPPING_INVALID":
                return `Das Spalten-Mapping ist ungültig: ${this.message}`;
            case "SHOPIFY_UNAUTHORIZED":
                return "Die Verbindung zu Shopify konnte nicht authentifiziert werden. Bitte überprüfen Sie Ihr Access-Token.";
            case "SHOPIFY_FORBIDDEN":
                return "Sie haben keine Berechtigung für diese Aktion. Bitte überprüfen Sie die Scopes Ihres Access-Tokens.";
            case "SHOPIFY_RATE_LIMIT":
                return "Das Rate-Limit von Shopify wurde überschritten. Bitte versuchen Sie es später erneut.";
            case "SHOPIFY_SERVER_ERROR":
                return "Ein Server-Fehler ist bei Shopify aufgetreten. Bitte versuchen Sie es später erneut.";
            case "SHOPIFY_INVALID_TOKEN":
                return "Das Access-Token ist ungültig oder abgelaufen. Bitte erstellen Sie ein neues Token in Shopify.";
            case "SHOPIFY_INSUFFICIENT_SCOPES": {
                // Versuche, fehlende Scopes aus Details zu extrahieren
                const details = this.details;
                if (details?.missingScopes && details.missingScopes.length > 0) {
                    return `Das Access-Token hat nicht die erforderlichen Berechtigungen. Fehlende Scopes: ${details.missingScopes.join(", ")}. Bitte erstellen Sie ein neues Token in Shopify mit diesen Scopes.`;
                }
                return "Das Access-Token hat nicht die erforderlichen Berechtigungen. Bitte erstellen Sie ein neues Token mit den erforderlichen Scopes (read_products, write_products, read_inventory, write_inventory, read_locations).";
            }
            case "SHOPIFY_LOCATION_NOT_FOUND":
                return `Die Location wurde nicht gefunden: ${this.message}`;
            case "NETWORK_ERROR":
                return "Ein Netzwerk-Fehler ist aufgetreten. Bitte überprüfen Sie Ihre Internetverbindung.";
            case "CONFIG_INVALID":
                return `Die Konfiguration ist ungültig: ${this.message}`;
            case "CONFIG_SHOP_URL_INVALID":
                return "Die Shop-URL ist ungültig. Sie muss auf '.myshopify.com' enden.";
            case "CONFIG_TOKEN_INVALID":
                return "Das Access-Token-Format ist ungültig. Es muss mit 'shpat_' oder 'shpca_' beginnen.";
            case "CONFIG_LOCATION_MISSING":
                return "Keine Location ausgewählt. Bitte wählen Sie eine Location in den Einstellungen.";
            case "INTERNAL_UNEXPECTED":
                return "Ein unerwarteter Fehler ist aufgetreten. Bitte kontaktieren Sie den Support.";
            case "SYNC_CANCELLED":
                return "Die Synchronisation wurde abgebrochen.";
            case "SYNC_PARTIAL_SUCCESS":
                return `Die Synchronisation wurde teilweise erfolgreich abgeschlossen: ${this.message}`;
            default:
                return this.message || "Ein unbekannter Fehler ist aufgetreten.";
        }
    }
    /**
     * Erstellt eine detaillierte Fehlermeldung für Logs.
     */
    getDetailedMessage() {
        const detailsStr = this.details
            ? ` | Details: ${JSON.stringify(this.details)}`
            : "";
        return `[${this.code}] ${this.message}${detailsStr}`;
    }
    /**
     * Konvertiert einen Standard-Error zu einem WawiError.
     */
    static fromError(error, code = "INTERNAL_UNEXPECTED") {
        if (error instanceof WawiError) {
            return error;
        }
        if (error instanceof Error) {
            return new WawiError(code, error.message, "error", {
                originalError: error.name,
                stack: error.stack,
            });
        }
        return new WawiError(code, `Unbekannter Fehler: ${String(error)}`, "error", { originalError: error });
    }
    /**
     * Erstellt einen CSV-Fehler.
     */
    static csvError(code, message, details) {
        return new WawiError(code, message, "error", details);
    }
    /**
     * Erstellt einen Shopify-Fehler.
     */
    static shopifyError(code, message, details) {
        const severity = code === "SHOPIFY_RATE_LIMIT" || code === "SHOPIFY_SERVER_ERROR"
            ? "warning"
            : "error";
        return new WawiError(code, message, severity, details);
    }
    /**
     * Erstellt einen Config-Fehler.
     */
    static configError(code, message, details) {
        return new WawiError(code, message, "error", details);
    }
    /**
     * Erstellt einen Netzwerk-Fehler.
     */
    static networkError(message, details) {
        return new WawiError("NETWORK_ERROR", message, "error", details);
    }
}
exports.WawiError = WawiError;
