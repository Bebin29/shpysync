# Sentry Error Monitoring Setup

## Übersicht

WAWISync nutzt [Sentry](https://sentry.io/) für Remote Error Monitoring. Dies ermöglicht es, Fehler aus der Ferne zu überwachen und zu analysieren, um Support zu verbessern und Probleme schneller zu beheben.

## Features

- **Automatische Fehlerberichterstattung:** Alle kritischen Fehler (`error` und `fatal` Severity) werden automatisch an Sentry gesendet
- **Anonymisierung:** Alle sensiblen Daten (Tokens, Shop-URLs, persönliche Daten) werden automatisch entfernt oder anonymisiert
- **Opt-in:** Error Reporting ist standardmäßig deaktiviert und muss vom Benutzer aktiviert werden
- **Breadcrumbs:** Kontext-Tracking für besseres Debugging
- **Source Maps:** Unterstützung für lesbare Stack-Traces

## Setup

### 1. Sentry-Projekt erstellen

1. Erstelle ein kostenloses Konto auf [sentry.io](https://sentry.io/)
2. Erstelle ein neues Projekt für Electron
3. Kopiere den DSN (Data Source Name) aus den Projekteinstellungen

### 2. DSN konfigurieren

Der Sentry DSN kann auf zwei Arten konfiguriert werden:

#### Option 1: Umgebungsvariable (empfohlen für Produktion)

```bash
# Windows (PowerShell)
$env:SENTRY_DSN="https://...@sentry.io/..."

# Linux/macOS
export SENTRY_DSN="https://...@sentry.io/..."
```

#### Option 2: In der Config-Datei (nur für Entwicklung)

Die DSN kann auch direkt in der Config gespeichert werden, aber dies wird nicht empfohlen für Produktion.

### 3. Error Reporting aktivieren

1. Öffne die App
2. Gehe zu **Einstellungen** → **Fehlerberichterstattung**
3. Aktiviere "Fehlerberichte an Entwickler senden"

## Datenschutz

### Was wird gesendet

- Fehlermeldungen und Stack-Traces
- App-Version und Betriebssystem
- Electron-Version
- Fehler-Kontext (z.B. während Sync)
- Breadcrumbs (letzte Aktionen vor dem Fehler)

### Was wird NICHT gesendet

- ❌ Keine persönlichen Daten (Namen, E-Mails)
- ❌ Keine Access-Tokens oder Passwörter
- ❌ Keine Shop-URLs im Klartext (nur Hash)
- ❌ Keine CSV-Daten oder Produktinformationen
- ❌ Keine IP-Adressen

### Anonymisierung

Alle sensiblen Daten werden automatisch entfernt oder anonymisiert:

- **Tokens:** Werden durch `[REDACTED]` ersetzt
- **Shop-URLs:** Werden durch Hash ersetzt (z.B. `[SHOP_HASH:example...]`)
- **Persönliche Daten:** Werden komplett entfernt

## Implementierung

### Error-Monitoring-Service

Der `ErrorMonitoringService` (`electron/services/error-monitoring-service.ts`) ist für die Sentry-Integration zuständig:

- Initialisiert Sentry beim App-Start (wenn aktiviert)
- Sendet Fehler automatisch an Sentry
- Anonymisiert sensible Daten
- Verwaltet Opt-in/Opt-out

### Integration in Logger

Der `Logger` (`electron/services/logger.ts`) sendet automatisch alle `error`-Level-Logs an Sentry (wenn aktiviert).

### Integration in Error-Handler

Der `ErrorHandler` (`electron/services/error-handler.ts`) sendet alle kritischen IPC-Handler-Fehler an Sentry.

## Verwendung

### Fehler manuell senden

```typescript
import { getErrorMonitoringService } from "./services/error-monitoring-service.js";

const errorMonitoringService = getErrorMonitoringService();

// Fehler senden
try {
  // ... Code ...
} catch (error) {
  if (error instanceof Error) {
    errorMonitoringService.captureError(error, {
      context: "sync",
      additionalInfo: "Wertvolle Informationen",
    });
  }
}
```

### Breadcrumbs hinzufügen

```typescript
const errorMonitoringService = getErrorMonitoringService();

errorMonitoringService.addBreadcrumb("Sync gestartet", "sync", "info", {
  csvPath: "/path/to/file.csv", // Wird automatisch anonymisiert
});
```

### Kontext setzen

```typescript
const errorMonitoringService = getErrorMonitoringService();

errorMonitoringService.setContext("sync", {
  shopUrl: "example.myshopify.com", // Wird automatisch anonymisiert
  totalProducts: 100,
});
```

## Konfiguration

### Config-Schema

```typescript
interface ErrorReportingConfig {
  enabled: boolean;
  dsn?: string; // Optional, kann auch über Umgebungsvariable gesetzt werden
}
```

### Standardwerte

- `enabled`: `false` (Opt-in)
- `dsn`: Wird aus Umgebungsvariable `SENTRY_DSN` geladen, falls nicht gesetzt

## Support-Workflow

1. Benutzer erlebt Fehler in der App
2. Fehler wird automatisch an Sentry gesendet (wenn Opt-in aktiviert)
3. Entwickler sieht Fehler im Sentry-Dashboard
4. Entwickler analysiert Stack-Trace und Kontext
5. Entwickler behebt Fehler und veröffentlicht Fix

## Kostenloser Plan

Sentry bietet einen kostenlosen Plan mit:

- **5.000 Events/Monat** (ausreichend für kritische Fehler)
- **1 Projekt**
- **30 Tage Datenaufbewahrung**
- **Source Maps Support**
- **Breadcrumbs**
- **User Context** (anonymisiert)
- **E-Mail-Alerts** bei neuen Fehlern

## Troubleshooting

### Sentry wird nicht initialisiert

1. Prüfe, ob Error Reporting in den Einstellungen aktiviert ist
2. Prüfe, ob `SENTRY_DSN` Umgebungsvariable gesetzt ist
3. Prüfe die Logs für Fehlermeldungen

### Fehler werden nicht gesendet

1. Prüfe, ob Error Reporting aktiviert ist
2. Prüfe, ob Fehler `error` oder `fatal` Severity haben (nur diese werden gesendet)
3. Prüfe die Sentry-Konsole für Rate-Limits

### Sensible Daten werden gesendet

Dies sollte nicht passieren, da alle sensiblen Daten automatisch anonymisiert werden. Falls doch, bitte einen Issue erstellen.

## Weitere Informationen

- [Sentry Electron Documentation](https://docs.sentry.io/platforms/javascript/guides/electron/)
- [Sentry Pricing](https://sentry.io/pricing/)
- [Sentry Privacy Policy](https://sentry.io/privacy/)
