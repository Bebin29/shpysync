# Projektplan: WAWISync - Electron App mit Next.js

## 📋 Inhaltsverzeichnis

1. [Projektübersicht](#projektübersicht)
2. [MVP-Definition (v1.0)](#mvp-definition-v10)
3. [Post-MVP Features (v1.1+)](#post-mvp-features-v11)
4. [Analyse des Python-Skripts](#analyse-des-python-skripts)
5. [Verbesserungsvorschläge für das Skript](#verbesserungsvorschläge-für-das-skript)
6. [Architektur der Electron-App](#architektur-der-electron-app)
7. [Core-Domain-Layer](#core-domain-layer)
8. [Persistenz & Caching](#persistenz--caching)
9. [Fehler- & Recovery-Strategie](#fehler--recovery-strategie)
10. [Technologie-Stack](#technologie-stack)
11. [Projektstruktur](#projektstruktur)
12. [Detaillierte Implementierungsphasen](#detaillierte-implementierungsphasen)
13. [Teststrategie & Python-Parität](#teststrategie--python-parität)
14. [UI/UX Konzept](#uiux-konzept)
15. [Datenfluss](#datenfluss)
16. [Sicherheit & Best Practices](#sicherheit--best-practices)

---

## 🎯 Projektübersicht

**Ziel:** Entwicklung einer modernen, benutzerfreundlichen Electron-App zur Synchronisation von Warenbeständen zwischen einem POS-System und Shopify.

**Hauptfunktionen:**

- CSV/DBF-Datei-Upload und -Verarbeitung
- Shopify-Verbindung konfigurieren
- Spalten-Mapping (SKU, Name, Preis, Bestand)
- Vorschau der Updates vor Ausführung
- Test-Modus für einzelne Artikel
- Echtzeit-Fortschrittsanzeige
- Logging und Fehlerbehandlung
- Automatische Synchronisation (Scheduler)
- Automatische Updates über GitHub Releases
- Sichere Token-Speicherung mit Verschlüsselung
- Code-Signing Support
- Mehrere Shop-Konfigurationen verwalten (v1.2)

---

## 🎯 MVP-Definition (v1.0)

**Ziel:** Minimale, aber vollständig funktionierende Version für den produktiven Einsatz.

### MVP-Funktionsumfang

#### ✅ Muss-Features (v1.0)

1. **Manuelle Synchronisation**
   - CSV/DBF-Upload (Drag & Drop oder Dateiauswahl)
   - Spalten-Mapping (SKU, Name, Preis, Bestand)
   - Vorschau der geplanten Updates
   - Bestätigung vor Ausführung
   - Echtzeit-Fortschrittsanzeige
   - Ergebnis-Report mit Erfolg/Fehler-Statistiken
   - **Test-Modus** für einzelne Artikel (Bestand > 0)
   - Automatisches Überspringen von Schritten (wenn Pfad/Mapping gespeichert)

2. **Shop-Konfiguration**
   - **Ein Shop** pro Installation
   - Shop-URL und Access-Token konfigurieren
   - Verbindungstest
   - **Eine Location** pro Shop-Konfiguration
   - Location-Auswahl aus verfügbaren Locations

3. **Update-Typen**
   - Preise aktualisieren
   - Bestände aktualisieren
   - **Option:** "Nur Preise" / "Nur Bestände" (MVP-Feature, da wenig Aufwand, viel Nutzen)

4. **Fehlerbehandlung**
   - Strukturierte Fehlerklassen (User/Remote/System)
   - Partial-Success-Strategie (erfolgreiche Updates werden durchgeführt)
   - Fehler-Report mit Details

5. **Persistenz**
   - Shop-Konfiguration speichern (verschlüsselt)
   - Produkt-/Variant-Cache (SQLite)
   - Sync-Historie (letzte 10 Syncs)

6. **Export**
   - Sync-Ergebnisse als CSV exportieren (Zeit, SKU, Alter Wert, Neuer Wert, Status, Fehlermeldung)
   - Logs exportieren
   - Nicht-gematchte Zeilen als CSV exportieren

7. **Automatische Synchronisation** ✅ (v1.0)
   - Scheduler-basierte Auto-Sync
   - Konfigurierbares Intervall (15, 30, 60, 120 Minuten)
   - CSV/DBF-Pfad-Konfiguration
   - Auto-Sync-Status und Historie
   - Start/Stop-Funktionalität

8. **Update-Service** ✅ (v1.0)
   - Automatische Update-Prüfung über GitHub Releases
   - Konfigurierbares Prüf-Intervall
   - Manuelles Update-Check
   - Download und Installation von Updates
   - Unterstützung für öffentliche und private Repositories

9. **Code-Signing Support** ✅ (v1.0)
   - Self-Signed-Zertifikat für Entwicklung
   - Support für echte Code-Signing-Zertifikate
   - Automatische Signierung im Build-Prozess

#### ❌ Nicht im MVP (Post-MVP)

- **Multi-Shop-Management** → v1.2
- **API-Version-Manager** (automatische Updates) → v1.2
- **Multi-Location-Support** → v1.2
- **E2E-Tests** (Unit- und Integration-Tests reichen für MVP) → v1.1

### MVP-Success-Kriterien

- ✅ CSV/DBF kann hochgeladen und verarbeitet werden
- ✅ Spalten können gemappt werden
- ✅ Vorschau zeigt alle geplanten Updates korrekt an
- ✅ Sync führt Updates erfolgreich aus (Preise + Bestände)
- ✅ Test-Modus für einzelne Artikel funktioniert
- ✅ Fehler werden benutzerfreundlich angezeigt
- ✅ Partial-Success funktioniert (einige Updates fehlgeschlagen, andere erfolgreich)
- ✅ Ergebnisse können exportiert werden
- ✅ Matching-Logik identisch zum Python-Skript (Paritäts-Tests bestehen)
- ✅ Auto-Sync funktioniert mit konfigurierbarem Intervall
- ✅ Update-Service prüft automatisch auf neue Releases
- ✅ Code-Signing wird unterstützt

---

## 🚀 Post-MVP Features (v1.1+)

### v1.1 - Erweiterte Features & Stabilität

- ✅ Automatische Synchronisation (Scheduler) - **Bereits in v1.0 implementiert**
- ✅ Auto-Updater - **Bereits in v1.0 implementiert**
- Erweiterte E2E-Tests
- Performance-Optimierungen
- Erweiterte Export-Formate (JSON, Excel)
- **Remote Error Monitoring & Fernwartung mit Sentry** 🆕

### v1.2 - Multi-Shop & Erweiterungen

- Multi-Shop-Management
- Multi-Location-Support
- API-Version-Manager (automatische Updates)
- Erweiterte Export-Formate (JSON, Excel)

### v1.3+ - Zukünftige Features

- Batch-Processing mehrerer CSVs
- Webhook-Integration
- Erweiterte Analytics
- Cloud-Sync (optional)

---

## 🔍 Remote Error Monitoring & Fernwartung (v1.1)

### Übersicht

**Ziel:** Fehler aus der Ferne überwachen und analysieren, um Support zu verbessern und Probleme schneller zu beheben.

**Szenario:** Ein Benutzer hat einen Fehler mit dem Tool, meldet sich beim Entwickler, und dieser kann dann im Sentry-Dashboard die Fehlermeldung, den Stack-Trace und den Kontext sehen, um schnell den Fehler zu identifizieren und zu beheben.

### Sentry Integration

**Service:** [Sentry](https://sentry.io/) - Kostenloser Plan

- **5.000 Events/Monat** (ausreichend für kritische Fehler)
- **1 Projekt**
- **30 Tage Datenaufbewahrung**
- **Source Maps Support** für besseres Debugging
- **Breadcrumbs** für Kontext-Tracking
- **User Context** (anonymisiert)
- **E-Mail-Alerts** bei neuen Fehlern

**Vorteile:**

- ✅ Gute Electron-Unterstützung (`@sentry/electron`)
- ✅ Einfache Integration
- ✅ Source Maps für lesbare Stack-Traces
- ✅ Breadcrumbs für besseren Kontext
- ✅ Automatische Gruppierung ähnlicher Fehler
- ✅ Release-Tracking

### Features

#### 1. Automatische Fehlerberichterstattung

- **Alle `WawiError` werden automatisch erfasst:**
  - Fehler-Code und Schweregrad
  - Stack-Trace mit Source Maps
  - Kontext-Informationen (App-Version, OS, Sync-Status)
  - Breadcrumbs (letzte Aktionen vor dem Fehler)

- **Nur kritische Fehler senden:**
  - `error` und `fatal` Severity
  - `warning` nur bei wichtigen System-Fehlern
  - `info` wird nicht gesendet (spart Events)

#### 2. Benutzer-Kontext (anonymisiert)

**Gesendete Informationen:**

- App-Version (z.B. "1.0.0")
- Betriebssystem und Version (z.B. "Windows 10", "macOS 14.0")
- Electron-Version
- Fehler-Zeitpunkt
- Sync-Status (während Sync oder nicht)
- Fehler-Code und Kategorie
- **Keine persönlichen Daten:**
  - ❌ Keine Namen
  - ❌ Keine E-Mails
  - ❌ Keine Shop-URLs im Klartext (nur Hash)
  - ❌ Keine Access-Tokens
  - ❌ Keine CSV-Daten

#### 3. Opt-in/Opt-out

- **Einstellung in Settings:**
  - Toggle: "Fehlerberichte an Entwickler senden"
  - Standard: **Opt-in** (aber mit klarer Information)
  - Benutzer kann jederzeit deaktivieren
  - Link zu Datenschutzerklärung

- **Transparenz:**
  - Klare Information, was gesendet wird
  - Was nicht gesendet wird (Datenschutz)
  - Warum es hilfreich ist (schnellere Fehlerbehebung)

#### 4. Support-Workflow

**Ablauf:**

1. Benutzer erlebt Fehler in der App
2. Fehler wird automatisch an Sentry gesendet (wenn Opt-in aktiviert)
3. Benutzer meldet sich beim Entwickler (z.B. per E-Mail)
4. Entwickler kann im Sentry-Dashboard:
   - Fehler-ID sehen (wenn Benutzer sie mitteilt)
   - Stack-Trace analysieren
   - Kontext-Informationen prüfen
   - Breadcrumbs durchsehen
   - Ähnliche Fehler finden
5. Schnelle Fehleranalyse und Fix

**Fehler-ID:**

- Jeder Fehler hat eine eindeutige ID
- Kann in der UI angezeigt werden (optional)
- Benutzer kann diese ID beim Support angeben

### Implementierung

#### 1. Dependencies

```bash
npm install @sentry/electron
```

#### 2. Service-Implementierung

**Datei:** `electron/services/error-monitoring-service.ts`

```typescript
import * as Sentry from "@sentry/electron";
import { app } from "electron";
import { getConfig } from "./config-service.js";

/**
 * Error Monitoring Service für Sentry Integration.
 *
 * Sendet Fehler automatisch an Sentry für Remote-Monitoring.
 */
export class ErrorMonitoringService {
  private isInitialized = false;
  private isEnabled = false;

  /**
   * Initialisiert Sentry mit DSN und Konfiguration.
   */
  initialize(): void {
    if (this.isInitialized) {
      return;
    }

    const config = getConfig();
    this.isEnabled = config.errorReporting?.enabled ?? true; // Default: Opt-in

    if (!this.isEnabled) {
      return;
    }

    // Sentry DSN aus Umgebungsvariable oder Config
    const dsn = process.env.SENTRY_DSN || config.errorReporting?.dsn;

    if (!dsn) {
      console.warn("Sentry DSN nicht konfiguriert. Error Monitoring deaktiviert.");
      return;
    }

    Sentry.init({
      dsn,
      environment: app.isPackaged ? "production" : "development",
      release: app.getVersion(),
      // Nur kritische Fehler senden
      beforeSend(event, hint) {
        // Filtere nur error und fatal
        if (event.level === "info" || event.level === "warning") {
          return null; // Nicht senden
        }
        return event;
      },
      // Anonymisiere sensible Daten
      beforeBreadcrumb(breadcrumb) {
        // Entferne sensible Daten aus Breadcrumbs
        if (breadcrumb.data) {
          // Entferne Token-ähnliche Strings
          Object.keys(breadcrumb.data).forEach((key) => {
            const value = breadcrumb.data[key];
            if (
              typeof value === "string" &&
              (value.includes("shpat_") || value.includes("token"))
            ) {
              breadcrumb.data[key] = "[REDACTED]";
            }
          });
        }
        return breadcrumb;
      },
    });

    // Setze User Context (anonymisiert)
    Sentry.setUser({
      id: undefined, // Keine User-ID
      username: undefined, // Kein Username
      email: undefined, // Keine E-Mail
      // Nur technische Informationen
      ip_address: undefined, // Keine IP
    });

    // Setze Tags
    Sentry.setTag("app_version", app.getVersion());
    Sentry.setTag("electron_version", process.versions.electron);
    Sentry.setTag("platform", process.platform);

    this.isInitialized = true;
    console.log("Sentry Error Monitoring initialisiert");
  }

  /**
   * Sendet einen Fehler an Sentry.
   */
  captureError(error: Error, context?: Record<string, unknown>): void {
    if (!this.isEnabled || !this.isInitialized) {
      return;
    }

    // Setze zusätzlichen Kontext
    if (context) {
      Sentry.setContext("error_context", context);
    }

    // Sende Fehler
    Sentry.captureException(error);
  }

  /**
   * Sendet eine benutzerdefinierte Nachricht.
   */
  captureMessage(message: string, level: Sentry.SeverityLevel = "error"): void {
    if (!this.isEnabled || !this.isInitialized) {
      return;
    }

    Sentry.captureMessage(message, level);
  }

  /**
   * Aktiviert oder deaktiviert Error Monitoring.
   */
  setEnabled(enabled: boolean): void {
    this.isEnabled = enabled;

    if (enabled && !this.isInitialized) {
      this.initialize();
    }
  }

  /**
   * Gibt zurück, ob Error Monitoring aktiviert ist.
   */
  getEnabled(): boolean {
    return this.isEnabled && this.isInitialized;
  }
}

// Singleton-Instanz
let errorMonitoringServiceInstance: ErrorMonitoringService | null = null;

export function getErrorMonitoringService(): ErrorMonitoringService {
  if (!errorMonitoringServiceInstance) {
    errorMonitoringServiceInstance = new ErrorMonitoringService();
  }
  return errorMonitoringServiceInstance;
}
```

#### 3. Integration in Error-Handler

**Datei:** `electron/services/error-handler.ts` (erweitern)

```typescript
import { getErrorMonitoringService } from "./error-monitoring-service.js";
import { WawiError } from "../../core/domain/errors.js";

export function handleError(error: unknown, context?: Record<string, unknown>): void {
  const errorMonitoring = getErrorMonitoringService();

  // Konvertiere zu Error-Objekt
  let errorObj: Error;
  if (error instanceof WawiError) {
    errorObj = error;
    // Setze zusätzlichen Kontext für Sentry
    errorMonitoring.captureError(errorObj, {
      code: error.code,
      severity: error.severity,
      details: error.details,
      ...context,
    });
  } else if (error instanceof Error) {
    errorObj = error;
    errorMonitoring.captureError(errorObj, context);
  } else {
    errorObj = new Error(String(error));
    errorMonitoring.captureError(errorObj, context);
  }
}
```

#### 4. Config-Erweiterung

**Datei:** `electron/types/ipc.ts` (erweitern)

```typescript
export interface AppConfig {
  // ... bestehende Felder
  errorReporting?: {
    enabled: boolean;
    dsn?: string; // Optional, kann auch über Umgebungsvariable gesetzt werden
  };
}
```

#### 5. Settings-UI

**Datei:** `app/settings/page.tsx` (erweitern)

- Toggle für "Fehlerberichte an Entwickler senden"
- Information über Datenschutz
- Link zu Datenschutzerklärung
- Optional: Anzeige der letzten gesendeten Fehler

#### 6. Main Process Initialisierung

**Datei:** `electron/main.ts` (erweitern)

```typescript
import { getErrorMonitoringService } from "./services/error-monitoring-service.js";

// Initialisiere Error Monitoring beim App-Start
app.whenReady().then(() => {
  const errorMonitoring = getErrorMonitoringService();
  errorMonitoring.initialize();

  // ... restliche Initialisierung
});
```

### Datenschutz & Sicherheit

**Gesendete Daten:**

- ✅ App-Version
- ✅ Betriebssystem und Version
- ✅ Electron-Version
- ✅ Fehler-Code und Stack-Trace
- ✅ Breadcrumbs (letzte Aktionen)
- ✅ Zeitpunkt des Fehlers

**Nicht gesendete Daten:**

- ❌ Persönliche Informationen (Namen, E-Mails)
- ❌ Shop-URLs im Klartext (nur Hash, falls nötig)
- ❌ Access-Tokens
- ❌ CSV-Daten
- ❌ Produktdaten
- ❌ IP-Adressen

**Anonymisierung:**

- Alle sensiblen Daten werden vor dem Senden entfernt
- Breadcrumbs werden gefiltert
- User Context enthält keine persönlichen Daten

### Konfiguration

**Sentry DSN:**

- Kann über Umgebungsvariable `SENTRY_DSN` gesetzt werden
- Oder in der Config gespeichert (optional)
- Für Production: DSN sollte nicht im Code hardcoded sein

**Setup-Schritte:**

1. Sentry-Account erstellen (kostenlos)
2. Neues Projekt erstellen (Electron)
3. DSN kopieren
4. DSN als Umgebungsvariable setzen oder in Config speichern
5. Source Maps für Production-Builds hochladen (optional, aber empfohlen)

### Vorteile

- ✅ **Schnellere Fehlerbehebung:** Stack-Traces und Kontext sofort verfügbar
- ✅ **Proaktive Fehlererkennung:** Siehst Fehler, bevor Benutzer sich melden
- ✅ **Besseres Verständnis:** Welche Fehler treten häufig auf?
- ✅ **Professioneller Support:** Kannst Benutzern gezielt helfen
- ✅ **Release-Tracking:** Siehst, welche Version welche Fehler hat

### Metriken & Limits

**Kostenloser Plan:**

- 5.000 Events/Monat
- **Strategie:** Nur kritische Fehler senden (error/fatal)
- **Schätzung:** Bei 100 aktiven Benutzern und durchschnittlich 1 kritischem Fehler pro Monat = ~100 Events/Monat (weit unter Limit)

---

## 🔍 Analyse des Python-Skripts

### Kernfunktionalitäten

1. **CSV/DBF-Verarbeitung**
   - Robuste Encoding-Erkennung (UTF-8-SIG, UTF-8, CP1252, Latin1)
   - Semikolon-getrennte CSV-Dateien
   - DBF-Datei-Unterstützung (dBase-Format)
   - Spalten-Mapping via Buchstaben (A, B, C, etc.)
   - Automatische Standard-Pfad-Erkennung (defaultCsvPath/defaultDbfPath)

2. **Shopify GraphQL Admin API Integration**
   - **API-Version:** `2025-07` (im Skript) → **Aktualisierung auf `2025-10` erforderlich**
   - **Wichtig:** REST Admin API ist seit 1. Oktober 2024 veraltet, ab 1. April 2025 nur noch GraphQL Admin API
   - Produkt- und Varianten-Abruf (Cursor-Pagination)
   - Location-Abruf
   - Bulk-Preis-Updates (`productVariantsBulkUpdate`)
   - Inventory-Updates (`inventorySetQuantities`)
   - Rate-Limit-Handling mit `X-Shopify-Shop-Api-Call-Limit`
   - Cost-Tracking mit `X-Request-Cost` Header

3. **Matching-Logik**
   - SKU-basiert (Priorität 1)
   - Produktname (normalisiert)
   - Kombinierter Name (Product + Variant)
   - Barcode
   - Prefix-Matching als Fallback

4. **Preis-Normalisierung**
   - Unterstützt verschiedene Formate (6,5 / 6.5 / 1.234,56 / 1,234.56)
   - Währungszeichen-Entfernung
   - Konvertierung zu Shopify-Format (2 Dezimalstellen)

5. **Retry-Logik**
   - Exponential Backoff
   - Rate-Limit-Handling (429)
   - Server-Error-Retry (5xx)

6. **Inventory-Koaleszierung**
   - Duplikat-Erkennung
   - Last-write-wins Strategie

---

## 💡 Verbesserungsvorschläge für das Skript

### 1. Code-Qualität

- **Doppelte Validierung:** `stock_raw` wird zweimal validiert (Zeilen 473-478 und 489-492)
- **Redundanter Code:** Preis-Validierung doppelt (Zeilen 467-471 und 484-487)
- **Hardcoded Credentials:** Shop-URL und Access-Token sollten aus Konfiguration kommen

### 2. Funktionalität

- **Fehlende Features:**
  - Keine Option, nur Preise ODER nur Bestände zu aktualisieren
  - Keine Validierung der Spaltenindizes vor CSV-Verarbeitung
  - Keine Unterstützung für mehrere Locations gleichzeitig
  - Keine Caching-Mechanismen für Produktdaten (bei wiederholten Syncs)
  - Keine Möglichkeit, Updates rückgängig zu machen

### 3. Benutzerfreundlichkeit

- **Fehlende Validierung:**
  - Keine Überprüfung, ob Spalten existieren
  - Keine Warnung bei leeren CSV-Dateien
  - Keine Zusammenfassung der nicht gematchten Zeilen

### 4. Performance

- **Optimierungen:**
  - Produktdaten könnten gecacht werden
  - Inventory-Item-IDs könnten beim ersten Laden gespeichert werden (statt bei jeder Zeile zu suchen)

### 5. Sicherheit

- **Sicherheitslücken:**
  - Access-Token im Klartext im Code
  - Keine Verschlüsselung für gespeicherte Credentials

---

## 🏗️ Architektur der Electron-App

### High-Level Architektur (Layered)

```
┌─────────────────────────────────────────────────────────┐
│              Electron Main Process                      │
│                                                          │
│  ┌──────────────────────────────────────────────────┐  │
│  │         Next.js Renderer Process                │  │
│  │  ┌──────────────┐                                │  │
│  │  │   React UI   │  (keine API Routes im MVP)    │  │
│  │  └──────────────┘                                │  │
│  └──────────────────────────────────────────────────┘  │
│                    ↕ IPC (getypt)                      │
│  ┌──────────────────────────────────────────────────┐  │
│  │         App Layer (Electron Main)                 │  │
│  │  - IPC Handlers                                  │  │
│  │  - Electron-spezifische Services                │  │
│  └──────────────────────────────────────────────────┘  │
│                    ↕                                   │
│  ┌──────────────────────────────────────────────────┐  │
│  │         Core Domain Layer                        │  │
│  │  - Pure Business Logic (kein Electron/IPC)      │  │
│  │  - Matching, Preis-Normalisierung, etc.          │  │
│  └──────────────────────────────────────────────────┘  │
│                    ↕                                   │
│  ┌──────────────────────────────────────────────────┐  │
│  │         Infrastructure Layer                     │  │
│  │  - Shopify Client                               │  │
│  │  - CSV Parser                                   │  │
│  │  - Cache/Persistenz                             │  │
│  └──────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────┘
```

### Architektur-Prinzipien

1. **Trennung von Concerns**
   - **Core Domain:** Pure Business Logic, testbar ohne Electron
   - **Infrastructure:** Externe Abhängigkeiten (Shopify, CSV, DB)
   - **App Layer:** Electron/IPC-spezifische Anpassungen
   - **UI Layer:** React/Next.js, keine Business Logic

2. **Sicherheit**
   - `contextIsolation: true`
   - `nodeIntegration: false` im BrowserWindow
   - Zugriff auf Node nur über `preload.ts` + getypte IPC-Interfaces
   - Renderer-Prozess hat keine direkten Node-Rechte
   - Sämtliche FS/Netzwerk-Zugriffe laufen über Main-Prozess

3. **Keine Doppel-Backend-Situation**
   - **Business-Logik / Shopify-Zugriffe laufen ausschließlich im Main-Prozess**
   - Next.js API-Routen werden im MVP **nicht** genutzt
   - (Später optional für UI-Helfer ohne Secrets)

### Kommunikationsfluss

1. **UI → IPC → Main Process:** Benutzeraktionen (CSV-Upload, Sync starten)
2. **Main Process → Core Domain:** Business Logic ausführen
3. **Core Domain → Infrastructure:** Shopify API, CSV-Parsing, Cache
4. **Main Process → UI (IPC):** Fortschritt, Logs, Ergebnisse
5. **Persistenz:** SQLite für Cache, electron-store für Config

---

## 🛠️ Implementierte Services (v1.0)

### Auto-Sync-Service

**Zweck:** Automatische, zeitgesteuerte Synchronisation von Preisen und Beständen.

**Features:**

- Scheduler-basierte Ausführung (konfigurierbares Intervall: 15, 30, 60, 120 Minuten)
- CSV/DBF-Pfad-Konfiguration
- Start/Stop-Funktionalität
- Status-Tracking und Historie
- Läuft nur, solange die App geöffnet ist

**Implementierung:**

- `electron/services/auto-sync-service.ts`
- IPC-Handler für Auto-Sync-Konfiguration
- UI-Komponente in Settings-Seite

### Update-Service

**Zweck:** Automatische Update-Prüfung und Installation über GitHub Releases.

**Features:**

- Automatische Update-Prüfung (konfigurierbares Intervall)
- Manuelles Update-Check
- Download und Installation von Updates
- Unterstützung für öffentliche und private Repositories
- GitHub Token-Support (optional)

**Implementierung:**

- `electron/services/update-service.ts`
- Verwendet `electron-updater`
- Konfigurierbar über Settings

### Code-Signing-Support

**Zweck:** Signierung von Build-Artefakten für vertrauenswürdige Installation.

**Features:**

- Self-Signed-Zertifikat für Entwicklung
- Support für echte Code-Signing-Zertifikate
- Automatische Signierung im Build-Prozess
- Windows, macOS und Linux Support

**Implementierung:**

- `scripts/create-cert.ps1` (Windows)
- `scripts/build-with-signing.js`
- Konfiguration über Umgebungsvariablen (`CSC_LINK`, `CSC_KEY_PASSWORD`)

### DBF-Parser

**Zweck:** Unterstützung für dBase-Format Dateien (zusätzlich zu CSV).

**Features:**

- DBF-Datei-Parsing
- Encoding-Erkennung
- Spalten-Mapping-Unterstützung
- Automatische Standard-Pfad-Erkennung (defaultDbfPath)

**Implementierung:**

- `core/infra/dbf/parser.ts`
- Integration in CSV-Service

### Test-Modus

**Zweck:** Testen von Synchronisationen an einzelnen Artikeln.

**Features:**

- Auswahl einzelner Artikel (nur Bestand > 0)
- Test-Synchronisation ohne vollständigen Sync
- Ergebnis-Anzeige für Test-Operationen

**Implementierung:**

- UI-Komponente in Sync-Wizard (Schritt 3)
- `sync.test()` IPC-Handler

### Verbesserte UI-Features

**Features:**

- Automatisches Überspringen von Schritten (wenn Pfad/Mapping gespeichert)
- Standard-Pfad-Unterstützung (defaultCsvPath/defaultDbfPath)
- Mapping-Persistierung
- Verbesserte Fehlerbehandlung (404-Fehler bei Updates)

---

## 🧩 Core-Domain-Layer

**Ziel:** Pure Business Logic, unabhängig von Electron/IPC, vollständig testbar.

### Struktur

```
electron/core/
├── domain/
│   ├── types.ts              # Domain-Types (Product, Variant, CsvRow, etc.)
│   ├── config.ts             # Config-Types (ShopConfig, AppConfig)
│   ├── sync-types.ts         # Sync-Operation-Types (PlannedOperation, etc.)
│   ├── errors.ts             # Error-Types (WawiError)
│   ├── matching.ts           # Matching-Logik (SKU, Name, Barcode)
│   ├── price-normalizer.ts   # Preis-Normalisierung
│   ├── inventory-coalescing.ts # Inventory-Duplikat-Koaleszierung
│   └── sync-pipeline.ts      # Sync-Pipeline (pure Funktionen)
├── infra/
│   ├── shopify/
│   │   └── client.ts         # Shopify API Client (abstrahiert)
│   └── csv/
│       └── parser.ts         # CSV-Parser (abstrahiert)
└── utils/
    └── normalization.ts      # String-Normalisierung (_norm)
```

### Domain-Types

```typescript
// core/domain/types.ts

export interface Product {
  id: string; // Shopify GID
  title: string;
  variants: Variant[];
}

export interface Variant {
  id: string; // Shopify GID
  productId: string;
  sku: string | null;
  barcode: string | null;
  title: string;
  price: string;
  inventoryItemId: string | null;
}

export interface CsvRow {
  rowNumber: number;
  sku: string;
  name: string;
  price: string;
  stock: number;
  rawData: Record<string, string>; // Original CSV-Daten
}

export interface MappedRow {
  csvRow: CsvRow;
  variantId: string | null;
  matchMethod: "sku" | "name" | "barcode" | "prefix" | null;
  matchConfidence: "exact" | "partial" | "low";
}

export type UpdateStatus = "success" | "skipped" | "failed";

export interface OperationResult {
  type: "price" | "inventory";
  csvRow: CsvRow;
  variantId: string | null;
  status: UpdateStatus;
  oldValue?: string | number;
  newValue?: string | number;
  message?: string;
  errorCode?: string;
}

export interface SyncResult {
  totalPlanned: number;
  totalExecuted: number;
  totalSuccess: number;
  totalFailed: number;
  totalSkipped: number;
  operations: OperationResult[];
  startTime: Date;
  endTime?: Date;
  duration?: number; // in ms
}

export interface MatchResult {
  variantId: string | null;
  method: "sku" | "name" | "barcode" | "prefix" | null;
  confidence: "exact" | "partial" | "low";
}
```

### Core-Domain-Funktionen

```typescript
// electron/core/domain/matching.ts
export function findVariantId(csvRow: CsvRow, products: Product[]): MatchResult;

// electron/core/domain/price-normalizer.ts
export function normalizePrice(price: string): string;

// electron/core/domain/inventory-coalescing.ts
export function coalesceInventoryUpdates(
  updates: Array<{ inventoryItemId: string; quantity: number }>
): Array<{ inventoryItemId: string; quantity: number }>;

// electron/core/domain/sync-pipeline.ts
export function processCsvToUpdates(
  csvRows: CsvRow[],
  products: Product[],
  options: { updatePrices: boolean; updateInventory: boolean }
): {
  priceUpdates: Array<{ variantId: string; price: string }>;
  inventoryUpdates: Array<{ inventoryItemId: string; quantity: number }>;
  unmatchedRows: CsvRow[];
};
```

### Vorteile dieser Struktur

1. **Testbarkeit:** 80-90% der Logik testbar ohne Electron/IPC
2. **Wiederverwendbarkeit:** Core könnte auch für CLI oder Headless-Modus genutzt werden
3. **Paritäts-Tests:** Direkte Tests gegen Python-Skript-Output möglich
4. **Wartbarkeit:** Klare Trennung von Business Logic und Framework-Code

---

## 💾 Persistenz & Caching

### Architektur

```
Persistenz-Schicht:
├── electron-store (Config)
│   └── shop-config.json (verschlüsselt)
├── SQLite (Produkt-/Variant-Cache)
│   └── cache.db
└── Sync-Historie
    └── sync-history.json (letzte 10 Syncs)
```

### 1. Konfiguration (electron-store)

**Verwendung:**

- Shop-Konfiguration (URL, Token)
- Spalten-Mapping (Standard)
- UI-Einstellungen

**Sicherheit:**

- Tokens verschlüsselt speichern
- Optional: OS Keychain (Windows Credential Manager, macOS Keychain)

### 2. Produkt-/Variant-Cache (SQLite)

**Schema:**

```sql
-- Produkte
CREATE TABLE products (
  id TEXT PRIMARY KEY,              -- Shopify GID
  title TEXT NOT NULL,
  updated_at INTEGER NOT NULL       -- Unix timestamp
);

-- Varianten
CREATE TABLE variants (
  id TEXT PRIMARY KEY,              -- Shopify GID
  product_id TEXT NOT NULL,         -- Foreign key zu products
  sku TEXT,
  barcode TEXT,
  title TEXT NOT NULL,
  price TEXT NOT NULL,
  inventory_item_id TEXT,
  updated_at INTEGER NOT NULL,
  FOREIGN KEY (product_id) REFERENCES products(id)
);

-- Indizes für schnelles Matching
CREATE INDEX idx_variants_sku ON variants(sku) WHERE sku IS NOT NULL;
CREATE INDEX idx_variants_barcode ON variants(barcode) WHERE barcode IS NOT NULL;
```

**Cache-Strategie:**

1. **Erstes Laden:** Alle Produkte/Varianten von Shopify laden und in SQLite speichern
2. **Wiederholte Syncs:**
   - Zuerst aus Cache matchen
   - Nur bei Cache-Miss oder nach X Stunden Shopify abfragen
   - Cache bei erfolgreichem Sync aktualisieren
3. **Cache-Invalidierung:**
   - `schemaVersion` im Cache (z.B. `1`)
   - Bei Änderungen an Matching-Logik: Cache löschen
   - "Cache neu aufbauen"-Button in UI
   - Automatische Invalidierung nach 24 Stunden (optional)

**Vorteile:**

- Schnellere Wiederholungs-Syncs
- Reduzierte API-Calls (Rate-Limit-Schonung)
- Offline-Matching möglich (für Vorschau)

### 3. Sync-Historie

**Format:**

```typescript
interface SyncHistoryEntry {
  id: string;
  timestamp: string;
  csvFileName: string;
  result: SyncResult;
  config: {
    shopUrl: string;
    locationName: string;
    columnMapping: ColumnMapping;
  };
}
```

**Speicherung:**

- Letzte 10 Syncs in `sync-history.json`
- Ältere Einträge automatisch löschen
- Export-Funktion für alle Historie

### Cache-Management-UI

- **Cache-Status anzeigen:** Anzahl Produkte/Varianten, letzte Aktualisierung
- **Cache neu aufbauen:** Button zum kompletten Reload von Shopify
- **Cache löschen:** Button zum Zurücksetzen

---

## 🛠️ Technologie-Stack

### Frontend

- **Next.js 14+** (App Router)
- **React 18+**
- **TypeScript**
- **Tailwind CSS**
- **shadcn/ui** (UI-Komponenten)
- **Lucide Icons**
- **Zustand** oder **Jotai** (State Management)
- **React Hook Form** (Formular-Handling)
- **Zod** (Schema-Validierung)
- **Recharts** oder **Chart.js** (Visualisierungen)

### Backend (Electron Main Process)

- **TypeScript**
- **Node.js** (via Electron)
- **electron-store** (Konfigurations-Persistierung)
- **better-sqlite3** (SQLite für Produkt-/Variant-Cache)
- **csv-parse** (CSV-Verarbeitung)
- **node-fetch** oder **axios** (HTTP-Requests)
- **winston** oder **pino** (Logging)
- **keytar** (optional, für OS Keychain-Integration)

### Electron

- **Electron 28+**
- **electron-builder** (Build & Distribution)
- **electron-updater** (Auto-Updates)

### Development Tools

- **ESLint** (Linting)
- **Prettier** (Code-Formatierung)
- **Vitest** (Testing)
- **Playwright** (E2E-Tests)

---

## 📁 Projektstruktur

```
wawisync-app/
├── .github/
│   └── workflows/
│       └── ci.yml
├── .vscode/
│   └── settings.json
├── electron/                    # Electron App Layer
│   ├── main.ts                  # Electron Main Process
│   ├── preload.ts               # Preload Script (getypte IPC)
│   ├── services/
│   │   ├── ipc-handlers.ts      # IPC-Handler
│   │   ├── shopify-service.ts   # Shopify Service (Wrapper für testConnection, getLocations)
│   │   ├── shopify-product-service.ts # Shopify Domain-Service (Products)
│   │   ├── shopify-inventory-service.ts # Shopify Domain-Service (Inventory)
│   │   ├── api-version-manager.ts # API-Version-Verwaltung
│   │   ├── config-service.ts    # Config-Management (electron-store)
│   │   ├── sync-engine.ts       # Sync Service (nutzt core/domain) - wird später implementiert
│   │   ├── cache-service.ts     # Cache-Management (SQLite) - wird später implementiert
│   │   └── logger.ts            # Logging-Service - wird später implementiert
│   └── types/
│       └── ipc.ts                # IPC-Type-Definitionen
├── core/                        # Core Domain Layer (pure Business Logic)
│   ├── domain/
│   │   ├── types.ts             # Domain-Types (Product, Variant, CsvRow, etc.)
│   │   ├── matching.ts          # Matching-Logik
│   │   ├── price-normalizer.ts  # Preis-Normalisierung
│   │   ├── inventory-coalescing.ts # Inventory-Koaleszierung
│   │   └── sync-pipeline.ts     # Sync-Pipeline
│   ├── infra/
│   │   ├── shopify/
│   │   │   ├── client.ts        # Shopify API Client (GraphQL, Retry, Rate-Limit)
│   │   │   └── queries.ts       # GraphQL Queries/Mutations
│   │   └── csv/
│   │       └── parser.ts        # CSV-Parser (sync, streaming, preview)
│   └── utils/
│       └── normalization.ts     # String-Normalisierung
├── src/                         # Next.js Renderer (UI)
│   ├── app/                     # Next.js App Router
│   │   ├── layout.tsx
│   │   ├── page.tsx             # Dashboard
│   │   ├── settings/
│   │   │   └── page.tsx         # Einstellungen
│   │   └── sync/
│   │       └── page.tsx         # Sync-Ansicht (Wizard)
│   ├── components/
│   │   ├── ui/                  # shadcn/ui Komponenten
│   │   ├── csv-upload.tsx       # CSV-Upload-Komponente
│   │   ├── column-mapping.tsx   # Spalten-Mapping
│   │   ├── preview-table.tsx    # Vorschau-Tabelle
│   │   ├── progress-view.tsx   # Fortschrittsanzeige
│   │   ├── log-viewer.tsx       # Log-Viewer
│   │   ├── shop-config.tsx      # Shop-Konfiguration
│   │   └── sync-wizard.tsx     # Wizard-Stepper
│   ├── hooks/
│   │   ├── use-electron.ts       # Electron IPC Hooks
│   │   ├── use-sync.ts          # Sync-State Management
│   │   └── use-config.ts        # Konfigurations-Hooks
│   ├── lib/
│   │   ├── utils.ts             # Utility-Funktionen
│   │   └── validators.ts        # Zod-Schemas
│   └── stores/
│       └── sync-store.ts        # Zustand Store
├── tests/
│   ├── unit/
│   │   ├── core/                # Core-Domain-Tests
│   │   └── electron/           # Electron-Service-Tests
│   ├── integration/
│   │   └── sync-flow.test.ts    # Integration-Tests
│   ├── fixtures/                # Test-Daten
│   │   ├── sample.csv          # Beispiel-CSV
│   │   └── expected-outputs.json # Erwartete Outputs (Python-Parität)
│   └── e2e/                     # E2E-Tests (Post-MVP)
├── public/
│   └── icons/
├── dist-electron/               # Kompilierte Electron-Dateien (Build-Output)
├── renderer/                    # Statisch exportierte Next.js App (Build-Output)
├── package.json
├── tsconfig.json
├── tsconfig.electron.json       # TypeScript-Config für Electron
├── tailwind.config.ts
├── next.config.js
├── electron-builder.yml
└── README.md
```

---

## 🚀 Detaillierte Implementierungsphasen

### Phase 1: Projekt-Setup & Electron-Integration (1-2 Tage)

**Ziel:** Next.js (App Router) und Electron laufen zusammen im Dev-Modus. Electron lädt die Next-Oberfläche, TypeScript wird sauber für Electron kompiliert, IPC funktioniert minimal (Ping/Pong).

#### 1.1 Projekt initialisieren

```bash
# Next.js App erstellen
npx create-next-app@latest wawisync-app --typescript --tailwind --app

# Electron hinzufügen
npm install --save-dev electron electron-builder concurrently cross-env electron-is-dev @types/node @types/electron
npm install electron-store

# Dependencies installieren
npm install zod react-hook-form @hookform/resolvers
npm install lucide-react
npm install zustand
npm install csv-parse
npm install axios

# Tool für ES Module Import-Fixes (fügt .js-Endungen nach TypeScript-Kompilierung hinzu)
npm install --save-dev tsc-esm-fix
```

**Optional:** `.tsc-esm-fix.json` Konfiguration erstellen (falls bestimmte Dateien ausgeschlossen werden sollen):

```json
{
  "exclude": ["electron/dist/electron/main.js", "electron/dist/electron/preload.js"]
}
```

**Hinweis:** Diese Konfiguration ist optional. Das Problem mit Variablennamen wurde durch Umbenennung gelöst (siehe Phase 1.3).

#### 1.2 Verzeichnisstruktur anlegen

```
wawisync-app/
├── electron/
│   ├── main.ts
│   ├── preload.ts
│   └── types/
│       └── ipc.ts     # IPC-Type-Definitionen
├── src/
│   └── app/
├── tsconfig.json
└── tsconfig.electron.json
```

#### 1.3 TypeScript für Electron konfigurieren

- `electron/tsconfig.json` anlegen:

```jsonc
{
  "extends": "../tsconfig.json",
  "compilerOptions": {
    "outDir": "./dist",
    "module": "ES2020",
    "target": "ES2020",
    "lib": ["ES2020"],
    "noEmit": false,
    "moduleResolution": "node",
    "esModuleInterop": true,
    "resolveJsonModule": true,
    "strict": true,
  },
  "include": ["**/*.ts", "../core/**/*.ts"],
  "exclude": ["node_modules", "dist"],
}
```

- **Hinweis:** ES Modules werden verwendet (nicht CommonJS), da der Code `import/export` nutzt
- **Wichtig:** `rootDir` wird weggelassen, damit TypeScript automatisch den gemeinsamen Root für `electron/` und `core/` bestimmt. Dies führt dazu, dass TypeScript die Dateien nach `electron/dist/electron/` kompiliert (nicht `electron/dist/`). Daher muss `package.json` auf `electron/dist/electron/main.js` zeigen.
- **Wichtig:** Alle relativen Imports müssen mit `.js`-Endungen versehen werden, da Node.js bei ES Modules explizite Dateiendungen erfordert. Beispiel:

  ```typescript
  // ✅ Korrekt (im TypeScript-Quellcode)
  import { registerIpcHandlers } from "./services/ipc-handlers.js";
  import type { ShopConfig } from "../types/ipc.js";
  import { parseCsvStream } from "../../core/infra/csv/parser.js";

  // ❌ Falsch (funktioniert nicht in kompiliertem Code)
  import { registerIpcHandlers } from "./services/ipc-handlers";
  import type { ShopConfig } from "../types/ipc";
  ```

  **Hinweis:** TypeScript entfernt die `.js`-Endungen beim Kompilieren (bei `moduleResolution: "node"`), aber Node.js benötigt sie zur Laufzeit. Daher wird `tsc-esm-fix` verwendet, um die `.js`-Endungen nach der Kompilierung automatisch wieder hinzuzufügen. Das Tool wird im Build-Script nach `tsc` ausgeführt:

  ```json
  "electron:build:ts": "tsc -p electron/tsconfig.json && tsc-esm-fix --target electron/dist"
  ```

  **Wichtig:** `tsc-esm-fix` kann Variablennamen fälschlich transformieren. Daher sollten `__filename` und `__dirname` vermieden werden. Stattdessen verwende `filename` und `dirnamePath`:

  ```typescript
  // ❌ Problem: TypeScript transformiert diese falsch
  const __filename = fileURLToPath(import.meta.url);
  const __dirname = dirname(__filename);

  // ✅ Korrekt: Alternative Variablennamen verwenden
  const filename = fileURLToPath(import.meta.url);
  const dirnamePath = dirname(filename);
  ```

  Dies gilt für alle relativen Imports in `electron/` und `core/` Dateien.

#### 1.4 Electron Main-Prozess (minimal)

- `electron/main.ts`:
  - `BrowserWindow` mit:
    - `contextIsolation: true`
    - `nodeIntegration: false`
    - `preload: path.join(dirnamePath, "preload.js")` (siehe Hinweis zu Variablennamen)
  - **Dev-Modus-Erkennung:** Verwende `app.isPackaged` statt `process.env.NODE_ENV`:
    ```typescript
    const isDev = !app.isPackaged;
    if (isDev) {
      mainWindow.loadURL("http://localhost:3000");
      mainWindow.webContents.openDevTools();
    } else {
      mainWindow.loadFile(path.join(dirnamePath, "../out/index.html"));
    }
    ```
    **Hinweis:** `app.isPackaged` ist die Electron-native Methode zur Erkennung des Dev-Modus. `process.env.NODE_ENV` wird im `electron:dev` Script nicht automatisch gesetzt.
  - Prod: `mainWindow.loadFile(path.join(dirnamePath, "../out/index.html"))`
  - Standard-Lifecycle: `ready`, `window-all-closed`, `activate`
  - `ipcMain.handle("ping", ...)` implementieren

#### 1.5 Preload-Skript

- `electron/preload.ts`:
  - `contextBridge.exposeInMainWorld("electron", { ping: () => ipcRenderer.invoke("ping"), ... })`
  - Sicherheitsanforderung: Renderer hat keine Node-APIs, nur das explizit exponierte API-Objekt
  - **Hinweis:** Die API wird als `window.electron` exponiert (nicht `electronAPI`)
  - **WICHTIG - Preload-Script als CommonJS kompilieren:**
    - Electron lädt Preload-Scripts standardmäßig als CommonJS, auch wenn die `package.json` `"type": "module"` hat
    - Das Preload-Script muss als CommonJS kompiliert werden, um den Fehler "Cannot use import statement outside a module" zu vermeiden
    - Lösung: Separate TypeScript-Konfiguration `electron/tsconfig.preload.json` erstellen:

    ```jsonc
    {
      "extends": "./tsconfig.json",
      "compilerOptions": {
        "target": "ES2020",
        "module": "CommonJS", // WICHTIG: CommonJS statt ES2020
        "lib": ["ES2020"],
        "outDir": "./dist/electron",
        "noEmit": false,
        "strict": true,
        "esModuleInterop": true,
        "skipLibCheck": true,
        "forceConsistentCasingInFileNames": true,
        "resolveJsonModule": true,
        "moduleResolution": "node",
        "types": ["node"],
      },
      "include": ["preload.ts"],
      "exclude": ["node_modules", "dist"],
    }
    ```

    - Das Preload-Script muss aus der Haupt-TypeScript-Konfiguration ausgeschlossen werden:

    ```jsonc
    // electron/tsconfig.json
    {
      "exclude": ["node_modules", "dist", "preload.ts"], // preload.ts ausschließen
    }
    ```

    - Build-Script anpassen, um beide Kompilierungen auszuführen:

    ```jsonc
    {
      "scripts": {
        "electron:build:ts": "tsc -p electron/tsconfig.json && tsc -p electron/tsconfig.preload.json && tsc-esm-fix --target electron/dist",
      },
    }
    ```

    - **Ergebnis:**
      - Main Process (`main.ts`) wird als ES Module kompiliert (mit `import/export`)
      - Preload Script (`preload.ts`) wird als CommonJS kompiliert (mit `require`)
    - **Debugging:** Preload-Pfad muss absolut sein (verwende `path.resolve()` statt `path.join()`)

#### 1.6 Renderer – einfacher IPC-Test

- TypeScript-Definitionen in `app/types/electron.d.ts`:
  ```typescript
  declare global {
    interface Window {
      electron: ElectronAPI;
    }
  }
  ```
- Test-Komponente `app/components/ipc-test.tsx`:
  - Client-Komponente, die `window.electron.ping()` aufruft
  - Zeigt Status (success/error) und Ergebnis (`"pong"`) im UI an
  - Automatischer Test beim Mount (nur im Electron-Kontext)
  - Wird im Dashboard angezeigt, um IPC-Verbindung zu verifizieren

#### 1.7 Scripts in `package.json`

```jsonc
{
  "scripts": {
    "dev": "next dev",
    "build": "next build",
    "start": "next start",
    "electron:build:ts": "tsc -p electron/tsconfig.json && tsc -p electron/tsconfig.preload.json && tsc-esm-fix --target electron/dist",
    "electron:dev": "npm run electron:build:ts && concurrently \"npm run dev\" \"wait-on http://localhost:3000 && electron .\"",
    "electron:build": "npm run build && npm run electron:build:ts && electron-builder",
  },
  "main": "electron/dist/electron/main.js",
}
```

- **Hinweis:** `wait-on` stellt sicher, dass Next.js läuft, bevor Electron startet
- **Wichtig:** `tsc-esm-fix` wird nach der TypeScript-Kompilierung ausgeführt, um die `.js`-Endungen zu relativen Imports hinzuzufügen, die Node.js bei ES Modules benötigt
- **Wichtig:** `main` verweist auf `electron/dist/electron/main.js` (nicht `electron/dist/main.js`), da TypeScript die Dateien in eine verschachtelte Struktur kompiliert

#### 1.8 ESLint/Prettier/Tailwind

- ESLint-Konfiguration erweitern (`.eslintrc.json`):
  - Overrides für `electron/**/*.ts` und `core/**/*.ts` hinzufügen
  - Electron-spezifische Regeln (z.B. `no-console` als warn statt error)
- Tailwind bleibt rein im Renderer
- shadcn/ui initialisieren

**Deliverables Phase 1:**

- ✅ `npm run electron:dev` startet Next-Dev und Electron
- ✅ Fenster öffnet deine Next-Seite
- ✅ IPC-Ping-Test funktioniert (`"pong"` wird angezeigt) - Test-Komponente im Dashboard
- ✅ Electron-TS wird fehlerfrei nach `electron/dist/electron/` kompiliert
  - `main.js` und `preload.js` werden korrekt nach `electron/dist/electron/` kompiliert
  - `rootDir` wird weggelassen, damit TypeScript automatisch den gemeinsamen Root bestimmt
  - `package.json` zeigt auf `electron/dist/electron/main.js`
- ✅ TypeScript-Definitionen für `window.electron` vorhanden
- ✅ ESLint-Konfiguration für Electron-Dateien erweitert
- ✅ `.js`-Endungen werden automatisch von `tsc-esm-fix` hinzugefügt
- ✅ Dev-Modus wird korrekt über `app.isPackaged` erkannt
- ✅ Variablennamen `filename` und `dirnamePath` werden verwendet (statt `__filename` und `__dirname`)
- ✅ Preload-Script wird als CommonJS kompiliert (separate `tsconfig.preload.json`)
- ✅ Preload-Pfad ist absolut (`path.resolve()` statt `path.join()`)
- ✅ Electron API (`window.electron`) ist im Dev-Modus verfügbar

---

### Phase 2: UI-Grundgerüst & State-Modell (2-3 Tage)

**Ziel:** Grundlayout der App steht (Dashboard, Sync, Settings), getrennt in dumb UI-Komponenten und "smarte" Seiten mit IPC-Anbindung. Basis-State für Sync ist definiert.

#### 2.1 Layout & Navigation

- App-Shell:
  - Sidebar mit Navigation: Dashboard, Sync, Einstellungen
  - Header mit Status-Indikator (z. B. aktiver Shop, Verbindung Shopify)
- Responsives Layout (Tailwind)

#### 2.2 Seitenstruktur

- `src/app/page.tsx`: Dashboard
- `src/app/sync/page.tsx`: Sync-Ansicht
- `src/app/settings/page.tsx`: Einstellungen
- Diese Seiten nutzen nur eigene Hooks und Komponenten, keine direkte Electron-Logik

#### 2.3 Trennung UI vs. Backend

- `src/components/ui/*`: rein visuelle Komponenten (Buttons, Inputs, Cards, Tabellen)
- "Smarte" Komponenten:
  - z. B. `SyncPage`, `SettingsPage` greifen ausschließlich über Hooks wie `useElectron`, `useSyncStore`, `useConfig` auf Backend-Daten zu
  - Renderer enthält keinerlei Shopify-/FS-Code; alles läuft über IPC

#### 2.4 Sync-UI-State definieren

- In `src/stores/sync-store.ts` (Zustand):

```typescript
type SyncStep = "idle" | "mapping" | "preview" | "running" | "completed" | "error";

interface SyncUIState {
  step: SyncStep;
  progress: number; // 0–100
  currentAction?: string; // "CSV wird geparst", "Produkte laden", ...
  logEntries: LogEntry[];
  previewRows: PreviewRow[]; // z. B. max 200 Zeilen
  result?: SyncResult;
}
```

- Phase 2: zunächst mit Dummy-Daten befüllen

#### 2.5 Hooks-Grundgerüst

- `src/hooks/use-electron.ts`:
  - Stellt typsichere Wrapper für IPC-Aufrufe bereit (z. B. `invoke("sync:start", ...)`)
- `src/hooks/use-config.ts`:
  - Greift auf gespeicherte Konfiguration via IPC zu (Platzhalter für später)

#### 2.6 Basis-Komponenten

- Button, Input, Select (shadcn/ui)
- Card, Dialog, Alert
- Table für Datenanzeige
- Progress-Bar

**Deliverables Phase 2:**

- ✅ Navigation funktioniert (Dashboard, Sync, Settings)
- ✅ Layout ist grob fertig (MainLayout mit Sidebar und Header)
- ✅ Header mit Status-Indikator (Shop-Verbindung)
- ✅ `sync-store.ts` existiert mit `SyncStep`-Lifecycle und vollständigem State-Management
- ✅ `use-electron.ts` Hook existiert mit typsicheren IPC-Wrappern
- ✅ `use-config.ts` Hook existiert für Konfigurations-Management
- ✅ UI nutzt nur Hooks (`use-electron`, `use-config`, `useSyncStore`) als Schnittstelle zum Backend, keine Node-/Shopify-Logik im Renderer
- ✅ Alle Basis-UI-Komponenten vorhanden (shadcn/ui)

---

### Phase 3: Backend-Services (Shopify, CSV, Domain-Layer) (4-6 Tage) ⚠️ Puffer: +50%

**Hinweis:** Diese Phase trägt die meiste Komplexität. Puffer von +50% empfohlen.

**Ziel:** Klare Schichten: Shopify-Client (infra), Domänen-Services (Products/Inventory), CSV-Parser und Domain-Logik (Matching, Preis-Normalisierung) sind getrennt und in TS getypt.

#### 3.0 Shopify API-Vorbereitung

- GraphiQL Explorer testen (https://shopify.dev/api/usage/api-exploration/admin-graphiql-explorer)
- Queries/Mutations validieren
- API-Version `2025-10` konfigurieren
- Rate-Limit-Tests durchführen
- API-Version-Verwaltung implementieren (für zukünftige Updates)

#### 3.1 Shopify-Infra-Layer

- `electron/services/shopify-client.ts`:
  - Zentrale Funktion:

````typescript
    interface ShopifyClientConfig {
      shopUrl: string;
      accessToken: string;
      apiVersion: string;
      fetchImpl?: typeof fetch;
    }

    class ShopifyClient {
      constructor(config: ShopifyClientConfig, logger: Logger) { ... }
      request<T>(query: string, variables?: Record<string, unknown>): Promise<T> { ... }
    }
    ```
  - Verantwortlich für:
    - HTTP-Requests (GraphQL Admin API)
    - Rate-Limit-Auswertung (`X-Shopify-Shop-Api-Call-Limit`)
    - Retry-Logik (429, 5xx) mit Exponential Backoff
    - Error-Parsing (GraphQL Errors, UserErrors)
    - Cost-Tracking (`X-Request-Cost` Header)
  - Keine CSV/Mappings, keine Wawi-spezifische Logik

#### 3.2 Shopify-Domain-Services
- `electron/services/shopify-product-service.ts`:
  - Nutzt `core/infra/shopify/client.ts`
  - Methoden:
    - `getAllProductsWithVariants()` (Cursor-Pagination, max 250/Seite)
    - `updateVariantPrices()` (Bulk-Update pro Produkt)
  - Paging via Cursor
  - Lädt API-Version automatisch aus Config
- `electron/services/shopify-inventory-service.ts`:
  - Nutzt `core/infra/shopify/client.ts`
  - Methoden:
    - `getLocations()` (Cursor-Pagination)
    - `setInventoryQuantities(...)` (Batches von 250)
  - Lädt API-Version automatisch aus Config
- Domain-Interfaces definieren (Product, Variant, Location etc.) - in `core/domain/types.ts`

#### 3.3 Domain-Layer (Core)
- Ordner `electron/core/domain/`:
  - `types.ts`: `CsvRow`, `MappedRow`, `MatchResult`, `UpdateOperation`, `SyncResult`
  - `price-normalizer.ts`: Portierung der Python-Logik (`normalize_price_to_money_str`), Tests in Phase 11
  - `matching.ts`: Matching-Strategie: SKU → Name → Name+Variant → Barcode → Prefix
  - `inventory-coalescing.ts`: Duplikat-Koaleszierung, Last-write-wins
  - `sync-pipeline.ts`: Reine Funktionen, die Input/Output-Objekte verarbeiten, ohne Electron/IPC

#### 3.4 CSV-Parser (Streaming)
- `core/infra/csv/parser.ts`:
  - **Synchroner Modus:** `parseCsv()` - für kleine Dateien (lädt gesamte Datei)
  - **Streaming-Modus:** `parseCsvStream()` - für große Dateien (AsyncIterator)
  - **Preview-Modus:** `parseCsvPreview()` - erste N Zeilen (max 200 Standard)
  - Verwendet `csv-parse` (sowohl sync als auch async/streaming)
  - Erkennt Encoding (UTF-8-SIG, UTF-8, CP1252, Latin1) anhand erster Bytes
  - Unterstützt Semikolon-Trennung
  - Liefert:
    - Für Preview: erste N Zeilen als `RawCsvRow[]` (via `parseCsvPreview`)
    - Für Sync: AsyncIterator von `RawCsvRow` (via `parseCsvStream`)
  - Renderer bekommt nie die gesamte Datei, sondern nur eine reduzierte Vorschau

#### 3.5 Typing der GraphQL-Responses
- Entweder:
  - GraphQL-Codegen nutzen, oder
  - manuelle TS-Interfaces definieren (z. B. `ProductsResponse`, `LocationsResponse`)
- Ziel: Keine `any` in `shopify-product-service`/`shopify-inventory-service`

**Deliverables Phase 3:**
- ✅ `core/infra/shopify/client.ts` funktioniert mit Dev-Credentials
- ✅ `shopify-product-service.ts` kann alle Produkte/Varianten lesen und Preise aktualisieren
- ✅ `shopify-inventory-service.ts` kann Locations lesen und Inventar setzen (Batches von 250)
- ✅ `price-normalizer`, `matching`, `inventory-coalescing`, `sync-pipeline` implementiert
- ✅ CSV kann im Main-Prozess geparst werden:
  - Synchron (`parseCsv`) für kleine Dateien
  - Streaming (`parseCsvStream`) für große Dateien
  - Preview (`parseCsvPreview`) für UI-Vorschau (erste N Zeilen)
- ✅ GraphQL-Responses sind vollständig getypt (keine `any`)
- ✅ Separate Domain-Services für Products und Inventory (getrennt von Client)

---

### Phase 4: Konfigurations-Management (2 Tage)

**Ziel:** Versionierte, validierte Konfigurationen (Shops, Mapping, Location) werden im Main-Prozess verwaltet und über IPC vom Renderer genutzt.

#### 4.1 Config-Schema
- `electron/types/ipc.ts`:
```typescript
  // Shop-Config für Verwendung (mit Access-Token)
  interface ShopConfig {
    shopUrl: string;
    accessToken: string; // Token wird aus Token-Store geladen
    locationId: string;
    locationName: string;
  }

  // Shop-Config für Persistierung (mit Token-Referenz)
  interface ShopConfigStored {
    shopUrl: string;
    accessTokenRef: string; // Referenz auf Token im Token-Store
    locationId: string;
    locationName: string;
  }

  interface AppConfig {
    shop: ShopConfigStored | null; // Gespeicherte Config mit accessTokenRef
    defaultColumnMapping: ColumnMapping | null;
    apiVersion?: string;
    autoSync: {
      enabled: boolean;
      interval?: number;
      schedule?: string;
    };
  }
````

- **Hinweis:** MVP unterstützt nur einen Shop. Multi-Shop-Management kommt in v1.2.

#### 4.2 Zod-Validierung

- `electron/lib/validators.ts`:
  - Zod-Schemas für `ShopConfig`, `ShopConfigStored`, `AppConfig`, `ColumnMapping`
  - Type-safe Validierung mit automatischer Fehlerbehandlung
- `config-service` validiert beim Laden und Speichern die Configs gegen Zod-Schema
- Fallback auf Defaults bei ungültiger Config

#### 4.3 Config-Manager

- `electron/services/config-service.ts`:
  - Nutzt `electron-store` für verschlüsselte Speicherung
  - Methoden:
    - `getConfig(): AppConfig` - lädt und validiert Config
    - `setConfig(AppConfig): void` - speichert und validiert Config
    - `getShopConfig(): ShopConfig | null` - lädt Shop-Config mit Token (aus Token-Store)
    - `setShopConfig(ShopConfig | null): void` - speichert Shop-Config (Token → Token-Store)
    - `getDefaultColumnMapping(): ColumnMapping | null`
    - `setDefaultColumnMapping(ColumnMapping | null): void`
    - `validateShopConfig(ShopConfig): { valid, errors }`
  - Migrationslogik:
    - Automatische Migration von alter Struktur (accessToken → accessTokenRef)
    - Validierung gegen Zod-Schema mit Fallback

#### 4.4 IPC-Endpunkte für Config

- Im Main-Prozess (`electron/services/ipc-handlers.ts`):
  - `ipcMain.handle("config:get", ...)` - lädt gesamte App-Config
  - `ipcMain.handle("config:set", ...)` - speichert gesamte App-Config
  - `ipcMain.handle("config:get-shop", ...)` - lädt Shop-Config mit Token
  - `ipcMain.handle("config:set-shop", ...)` - speichert Shop-Config (Token → Token-Store)
  - `ipcMain.handle("config:get-column-mapping", ...)`
  - `ipcMain.handle("config:set-column-mapping", ...)`
  - `ipcMain.handle("config:test-connection", ...)` - testet Shopify-Verbindung
  - `ipcMain.handle("config:get-locations", ...)` - lädt Locations von Shopify
- Renderer nutzt `use-config` Hook, der diese IPC-Aufrufe kapselt
- **Hinweis:** MVP unterstützt nur einen Shop. Multi-Shop-Endpunkte (`getAllShops`, `deleteShop`) kommen in v1.2.

#### 4.5 Token-Speicherung

- Access-Token wird nicht im Klartext in `AppConfig` gespeichert
- Implementierung: `electron/services/token-store.ts`
  - Separater `electron-store` nur für Tokens (zusätzliche Sicherheitsschicht)
  - Tokens werden mit AES-256-GCM verschlüsselt
  - `accessTokenRef` (eindeutige ID) in `ShopConfigStored`
  - Token selbst im verschlüsselten Token-Store
  - Methoden:
    - `storeToken(token): tokenRef` - speichert Token, gibt Referenz zurück
    - `loadToken(tokenRef): token | null` - lädt Token anhand Referenz
    - `updateToken(tokenRef, token): void` - aktualisiert Token
    - `deleteToken(tokenRef): void` - löscht Token
- **Sicherheit:** Tokens werden niemals im Klartext im Config-JSON gespeichert
- **Optional (zukünftig):** OS-Keychain-Integration via `keytar` für zusätzliche Sicherheit

#### 4.6 Settings-UI

- Shop-Konfiguration (URL, Token)
  - URL-Validierung (`.myshopify.com` Domain)
  - Token-Format-Validierung (`shpat_` oder `shpca_`)
  - Verbindungstest-Button
  - Rate-Limit-Status anzeigen
- Spalten-Mapping-Editor
- Location-Auswahl (mit Live-Abruf von Shopify)
- Auto-Sync-Einstellungen
- API-Version-Anzeige (Info)

**Deliverables Phase 4:**

- ✅ App kann einen Shop verwalten (MVP: ein Shop pro Installation)
- ✅ Konfiguration wird persistiert und beim Start geladen
- ✅ Zod-Validierung für alle Config-Types (type-safe)
- ✅ Validierungsfehler führen zu klaren Fehlermeldungen im UI
- ✅ Tokens sind verschlüsselt im separaten Token-Store gespeichert (nicht im Config-JSON)
- ✅ Automatische Migration von alter Config-Struktur (accessToken → accessTokenRef)
- ✅ Settings-UI vollständig funktionsfähig (Shop-Config, Mapping, Location-Auswahl, Verbindungstest)

---

### Phase 5: CSV-Upload & Mapping (2-3 Tage)

**Ziel:** CSV-Datei wird über UI ausgewählt, Pfad an den Main-Prozess übergeben, Mapping konfiguriert, Vorschau generiert. Mapping ist pro Shop konfigurierbar.

#### 5.1 CSV-Upload im Renderer

- `csv-upload.tsx`:
  - `<input type="file">` oder Drag&Drop
  - Nur Datei-Metadaten im Renderer nutzen
- **Wichtig:** Über IPC an Main-Prozess wird nur der **Dateipfad** übergeben (keine Datei-Inhalte)

#### 5.2 IPC: CSV-Preview

- `ipcMain.handle("csv:preview", ...)`:
  - Input: `{ filePath, mapping, maxRows }`
  - Nutzt `csv-parser` im Preview-Modus
  - Gibt die ersten N normalisierten Zeilen zurück (mit angewandtem Mapping)
- Renderer zeigt Vorschau-Tabelle anhand dieser Daten

#### 5.3 Spalten-Mapping UI

- `column-mapping.tsx`:
  - Dropdowns mit Spaltennamen (aus CSV-Header)
  - Zuordnung zu logischen Feldern (SKU, Name, Preis, Bestand)
  - Validierung:
    - Pflichtfelder kontrollieren (z. B. mindestens SKU oder Name)
  - Mapping wird:
    - im `SyncUIState` gehalten
    - beim Speichern in `ShopConfig.columnMapping` persistiert (per `config:saveShop`)

#### 5.4 Shop-spezifisches Mapping

- Beim Wechsel des aktiven Shops:
  - Mapping aus der entsprechenden `ShopConfig` laden und UI vorbelegen

**Deliverables Phase 5:**

- ✅ CSV-Datei kann ausgewählt werden
- ✅ Spalten-Mapping kann definiert und gespeichert werden
- ✅ Vorschau (z. B. erste 100–200 Zeilen) wird angezeigt
- ✅ Keine großen CSV-Inhalte im Renderer, alles Parsing im Main-Prozess

---

### Phase 6: Sync-Engine (4-6 Tage) ⚠️ Puffer: +50%

**Hinweis:** Kritische Phase mit komplexer Business-Logik. Puffer empfohlen.

**Ziel:** Die Sync-Engine im Main-Prozess setzt den vollständigen Pipeline-Flow um. Fortschritt und Logs werden über IPC an den Renderer gesendet.

#### 6.1 Pipeline-Definition

- `electron/services/sync-engine.ts`:
  - Schritte:
    1. CSV → `ParsedRow` (Streaming)
    2. `ParsedRow + ColumnMapping` → `NormalizedRow`
    3. Shopify-Produkte/Varianten laden (ggf. mit lokalem Cache)
    4. `Matching(NormalizedRow, Products)` → `MatchResult[]`
    5. `MatchResult[]` → `UpdateOperations[]` (Preis & Bestand)
    6. Koaleszierung von Inventar-Updates
    7. Planung (PlannedOperations) → Vorschau
    8. Ausführung in Batches (nach Bestätigung)

#### 6.2 Fortschrittsberechnung

- Definiere "Work Units":
  - z. B.:
    - `CSV_ROWS` (Anzahl Zeilen)
    - `PRODUCT_PAGES` (Anzahl API-Seiten beim Produktladen)
    - `INVENTORY_BATCHES`, `PRICE_BATCHES`
- Fortschritt:
  - `progress = erledigteWorkUnits / GesamtWorkUnits * 100`
- Sync-Engine sendet regelmäßig `sync:progress` Events via IPC

#### 6.3 IPC-Schnittstellen

- `ipcMain.handle("sync:preview", ...)`:
  - Input: `SyncPreviewRequest` (csvPath, columnMapping, shopConfig, options)
  - Generiert Vorschau mit Matching-Ergebnissen OHNE Updates auszuführen
  - Gibt `SyncPreviewResponse` zurück mit `planned` und `unmatchedRows`
  - Wird in Phase 7 verwendet, um Vorschau vor Bestätigung zu zeigen
- `ipcMain.handle("sync:start", ...)`:
  - Input: `SyncStartConfig` (csvPath, columnMapping, shopConfig, options)
  - Startet die Pipeline und führt Updates aus
- `ipcMain.handle("sync:cancel", ...)`:
  - Setzt ein Abbruch-Flag, das in den Schleifen geprüft wird
- Events zum Renderer:
  - `sync:progress` (aktueller Fortschritt, Text)
  - `sync:log` (Log-Einträge)
  - `sync:previewReady` (PlannedOperations für Vorschau - wird während Sync gesendet, aber Vorschau sollte bereits über `sync:preview` generiert worden sein)
  - `sync:complete` (SyncResult)

#### 6.4 Modus-Auswahl (Preis/Bestand)

- In der Pipeline:
  - Branching je nach `mode`:
    - Nur Preis-Updates generieren
    - Nur Inventory-Updates generieren
    - Beides

**Deliverables Phase 6:**

- ✅ Manuelles Starten des Sync (ohne UI-Feinheiten) funktioniert
- ✅ Fortschritt und Logs kommen im Renderer an
- ✅ Vorschau-Daten (PlannedOperations) werden erzeugt
- ✅ **Hinweis:** Vorschau-Generierung wird in Phase 7 über separaten `sync:preview` Endpunkt implementiert

---

### Phase 7: Vorschau & Bestätigung (2-3 Tage)

**Ziel:** Alle geplanten Änderungen werden strukturiert angezeigt, filterbar, und die Ausführung erfolgt erst nach expliziter Bestätigung.

#### 7.1 Datenmodell für geplante/ausgeführte Updates

- `core/domain/sync-types.ts`:

  ```typescript
  type OperationType = "price" | "inventory";

  interface PlannedOperation {
    id: string;
    type: OperationType;
    sku?: string | null;
    productTitle?: string | null;
    variantTitle?: string | null;
    oldValue?: string | number | null;
    newValue: string | number;
  }

  type OperationStatus = "planned" | "success" | "failed" | "skipped";

  interface OperationExecution extends PlannedOperation {
    status: OperationStatus;
    message?: string;
    errorCode?: string;
  }

  interface SyncPreviewResult {
    planned: PlannedOperation[];
    unmatchedRows: Array<{
      rowNumber: number;
      sku: string;
      name: string;
      price?: string;
      stock?: number;
    }>;
  }
  ```

- `electron/types/ipc.ts`:

  ```typescript
  interface SyncPreviewRequest {
    csvPath: string;
    columnMapping: ColumnMapping;
    shopConfig: ShopConfig;
    options: {
      updatePrices: boolean;
      updateInventory: boolean;
    };
  }

  interface SyncPreviewResponse {
    success: boolean;
    data?: {
      planned: PlannedOperation[];
      unmatchedRows: Array<{...}>;
    };
    error?: string;
  }

  interface SyncResult {
    totalPlanned: number;
    totalExecuted: number;
    totalSuccess: number;
    totalFailed: number;
    totalSkipped: number;
    operations: OperationResult[]; // Statt OperationExecution[]
    planned?: PlannedOperation[]; // Optional, wird gesetzt wenn Vorschau generiert wurde
    startTime: string;
    endTime?: string;
    duration?: number;
  }
  ```

- **Hinweis:** `OperationExecution` wird nicht verwendet. Stattdessen wird `OperationResult` (IPC-Type) verwendet, da es mehr Informationen enthält (`csvRow`, `variantId`).
- **Hinweis:** `SyncResult.planned` ist optional, da es nur gesetzt wird, wenn eine Vorschau generiert wurde (bei normalem Sync).
- Vorschau zeigt `planned` (über `sync:preview` Endpunkt)
- Nach Ausführung enthält `SyncResult` `operations` (mit Status-Informationen)

#### 7.2 Vorschau-UI

- **Wichtig:** Vorschau wird VOR dem Sync generiert über `sync:preview` IPC-Endpunkt
- `preview-table.tsx`:
  - Tabellen-Ansicht mit Filter:
    - nach OperationType (Preis / Bestand)
    - nach Status (bei bereits ausgeführten Operationen)
  - Sortierung nach SKU, Produktname, Preis, Bestand
  - Tabs für "Alle" und "Nicht gematchte Zeilen"
  - Anzeige von altem/neuem Wert (Preis und Bestand)
  - Export-Button für Ergebnisse
- **IPC-Endpunkt:** `sync:preview` generiert Vorschau mit Matching-Ergebnissen ohne Updates auszuführen

#### 7.3 Bestätigungs-Dialog

- Zusammenfassung:
  - "X Preis-Updates, Y Inventory-Updates"
  - "Z nicht-gematchte Zeilen"
- Checkbox oder explizite Bestätigungsaktion:
  - "Ich bestätige, dass diese Änderungen in Shopify angewendet werden sollen"
- Buttons:
  - "Abbrechen"
  - "Sync ausführen"

#### 7.4 Export-Funktionen

- Sync-Ergebnisse als CSV exportieren
  - Spalten: Zeit, SKU, Name, Alter Wert, Neuer Wert, Status, Fehlermeldung
- Nicht-gematchte Zeilen als CSV exportieren
- Logs exportieren (Text-Datei)

**Deliverables Phase 7:**

- ✅ Vorschau zeigt alle geplanten Änderungen strukturiert
- ✅ Vorschau wird VOR der Bestätigung generiert (über `sync:preview`)
- ✅ Matching-Ergebnisse werden angezeigt (nicht nur CSV-Rohdaten)
- ✅ Benutzer muss vor tatsächlichen API-Calls bestätigen
- ✅ Nicht-gematchte Zeilen sind sichtbar und separat exportierbar
- ✅ Export-Funktionen für Sync-Ergebnisse, nicht-gematchte Zeilen und Logs

---

### Phase 8: Fortschrittsanzeige & Logging (2 Tage)

**Ziel:** Sync-Fortschritt und Logs sind transparent, filterbar und exportierbar.

**Hinweis:** Vorschau wird bereits in Phase 7 VOR dem Sync generiert (über `sync:preview`). Die Fortschrittsanzeige in Phase 8 bezieht sich auf die tatsächliche Ausführung der Updates.

#### 8.1 Log-Modell

- `LogEntry`:

  ```typescript
  type LogLevel = "debug" | "info" | "warn" | "error";
  type LogCategory = "csv" | "shopify" | "matching" | "inventory" | "price" | "system";

  interface LogEntry {
    id: string;
    timestamp: string;
    level: LogLevel;
    category: LogCategory;
    message: string;
    context?: Record<string, unknown>;
  }
  ```

#### 8.2 Logger-Service

- `electron/services/logger.ts`:
  - Stellt Methoden bereit: `log(level, category, message, context?)`
  - Schreibt:
    - in eine Log-Datei (optional)
    - broadcastet über IPC an Renderer (`sync:log`)

#### 8.3 UI für Fortschritt

- `progress-view.tsx`:
  - Fortschrittsbalken (0–100 %)
  - Text "Aktuelle Aktion" (`currentAction` aus `SyncUIState`)
  - Optional: geschätzte Restzeit (WorkUnits / Rate)

#### 8.4 Log-Viewer-UI

- `log-viewer.tsx`:
  - Live-Stream der LogEntries
  - Filter nach:
    - Level
    - Kategorie
  - Export-Button:
    - Export als Text/CSV

**Deliverables Phase 8:**

- ✅ Während des Syncs wird Fortschritt klar angezeigt
- ✅ Logs werden in Echtzeit angezeigt und bei Bedarf gefiltert/exportiert
- ✅ Abbruch des Syncs über UI ist möglich

---

### Phase 9: Validierung & Fehlerbehandlung (3-4 Tage) ⚠️ Puffer: +50%

**Hinweis:** Fehlerbehandlung ist komplex. Puffer empfohlen.

**Ziel:** Eindeutige Fehlertypen, saubere Darstellung in der UI, klare Unterscheidung zwischen User- und Systemfehlern.

#### 9.1 Zentraler Error-Typ

- `electron/core/domain/errors.ts`:

  ```typescript
  type ErrorSeverity = "info" | "warning" | "error" | "fatal";

  type ErrorCode =
    | "CSV_INVALID_FORMAT"
    | "CSV_MISSING_COLUMN"
    | "CSV_EMPTY"
    | "SHOPIFY_UNAUTHORIZED"
    | "SHOPIFY_FORBIDDEN"
    | "SHOPIFY_RATE_LIMIT"
    | "SHOPIFY_SERVER_ERROR"
    | "NETWORK_ERROR"
    | "CONFIG_INVALID"
    | "INTERNAL_UNEXPECTED";

  interface WawiError extends Error {
    code: ErrorCode;
    severity: ErrorSeverity;
    details?: unknown;
  }
  ```

- Alle internen Fehler werden in `WawiError` gewrappt

#### 9.2 Validierungspunkte

- CSV:
  - Datei existiert
  - Header vorhanden
  - Mapping referenziert existierende Spalten
- Config:
  - Shop-URL-Format (`.myshopify.com`)
  - Token-Format (z. B. `shpat_`, `shpca_`)
- Shopify:
  - Token gültig
  - Scopes ausreichend

#### 9.3 UI-Fehlerdarstellung

- Eigenes Fehler-Panel:
  - Zusammenfassende Meldungen mit konkreten Hinweisen
- Fehler-Level:
  - `warning`: z. B. einige Zeilen nicht gematcht, Sync aber insgesamt erfolgreich
  - `error`/`fatal`: Sync abgebrochen, Benutzer sieht klare Ursache

**Deliverables Phase 9:**

- ✅ Fehler werden konsistent als `WawiError` behandelt
- ✅ UI zeigt eindeutige und verständliche Fehlermeldungen
- ✅ Validierungen verhindern typische Benutzerfehler frühzeitig

---

### Phase 10: Automatische Synchronisation (optional, 2-3 Tage)

**Ziel:** Zeitgesteuerte Syncs für fortgeschrittene Nutzer, rein im Main-Prozess, ohne versteckte Hintergrundprozesse außerhalb der App.

#### 10.1 Scheduler im Main-Prozess

- Einfacher Intervall-Scheduler (z. B. `node-cron` oder eigener Timer)
- Konfigurierbare Intervalle:
  - alle X Minuten
  - bestimmte Uhrzeit pro Tag

#### 10.2 Konfiguration

- Felder in `ShopConfig` oder `AppConfig`:
  - `autoSyncEnabled`, `autoSyncSchedule` (z. B. Cron-String oder vordefinierte Intervalle)

#### 10.3 UI

- In Settings:
  - Checkbox "Automatische Synchronisation aktivieren"
  - Auswahlfeld für Intervall
- **Klarer Hinweis:** Auto-Sync läuft nur, solange die App offen ist

#### 10.4 Ergebnisdarstellung

- Auto-Sync-Sessions werden im Dashboard gelistet ("letzte Syncs")
- Fehler / Warnungen aus Auto-Syncs erscheinen im Log

**Deliverables Phase 10:**

- ✅ Auto-Sync kann pro Shop aktiviert/deaktiviert werden
- ✅ Zeitgesteuerter Sync läuft, solange die App geöffnet ist
- ✅ Ergebnisse sind im Dashboard und Log ersichtlich

---

### Phase 11: Testing & Qualitätssicherung (3-4 Tage)

**Ziel:** Hohe Testabdeckung der Domain-Logik, Integrationstests für die Pipeline, E2E-Tests des wichtigsten Workflows. Parität zum Python-Skript wird geprüft.

#### 11.1 Unit-Tests (Vitest)

- `core/domain`:
  - `price-normalizer` (verschiedene Preisformate)
  - `matching` (verschiedene Kombinationen von SKU/Name/Barcode)
  - `inventory-coalescing`
- `shopify-product-service` und `shopify-inventory-service` mit gemocktem `ShopifyClient`

#### 11.2 Paritäts-Tests zum Python-Skript

- `tests/fixtures/`:
  - Beispiel-CSV-Dateien
  - Erwartete Match-/Update-Ergebnisse (JSON), idealerweise aus Python-Skript generiert
- Integrationstests:
  - Gleiche CSV → Domain-Layer → `UpdateOperations` → Vergleich mit erwarteten JSONs

#### 11.3 Integrationstests

- `sync-engine`:
  - `generatePreview()` Methode:
    - CSV-Fixture + Shopify-Mock → `SyncPreviewResponse`
    - Erwartung: korrekte Anzahl geplanter Updates, richtige Zuordnung, nicht-gematchte Zeilen identifiziert
  - `startSync()` Full-Run mit:
    - CSV-Fixture
    - Shopify-Mock, der definierte Produkte zurückgibt
  - Erwartung:
    - korrekte Anzahl geplanter Updates
    - richtige Zuordnung
    - `SyncResult.planned` wird gesetzt

#### 11.4 E2E-Tests (Playwright)

- Setup:
  - Playwright nutzt dein Electron-Build oder dev-Electron
- Szenario:
  - App starten → Shop konfigurieren → CSV auswählen → Mapping → **Vorschau anfordern (`sync:preview`)** → Vorschau prüfen → Bestätigen → Sync starten → Ergebnis prüfen
- **Wichtig:** E2E-Test muss `sync:preview` Endpunkt testen, nicht nur `sync:start`

**Deliverables Phase 11:**

- ✅ Unit-Test-Coverage der Domain-Logik > 80%
- ✅ Integrationstests für die Sync-Pipeline vorhanden
- ✅ Mindestens ein E2E-Workflow testet den kompletten Weg

---

### Phase 12: Build & Distribution (2 Tage)

**Ziel:** Erzeugung von lauffähigen `.exe` (und optional `.dmg`/`.AppImage`), bei denen Electron die statisch exportierte Next-App lädt.

#### 12.1 Renderer-Build-Strategie

- Entscheidung: Static Export
- Scripts:
  ```jsonc
  {
    "scripts": {
      "build:renderer": "next build && next export -o renderer",
      "build:electron": "tsc -p tsconfig.electron.json",
      "build:desktop": "npm run build:renderer && npm run build:electron && electron-builder",
    },
  }
  ```
- `renderer/` enthält dann `index.html` + Assets

#### 12.2 Main-Prozess Prod-Path

- In `main.ts` (Prod-Zweig):
  ```typescript
  const prodIndex = path.join(__dirname, "..", "renderer", "index.html");
  mainWindow.loadFile(prodIndex);
  ```

#### 12.3 electron-builder Konfiguration

- In `package.json`:
  ```jsonc
  {
    "build": {
      "appId": "com.deinname.wawisync",
      "productName": "WAWISync",
      "directories": {
        "buildResources": "build",
        "output": "dist",
      },
      "files": ["dist-electron/**/*", "renderer/**/*", "package.json"],
      "win": {
        "target": "nsis",
      },
      "mac": {
        "target": "dmg",
      },
      "linux": {
        "target": "AppImage",
      },
    },
  }
  ```

#### 12.4 Test der Installer

- Auf Windows:
  - `.exe` installieren, Startmenü-Eintrag prüfen
- Optional macOS/Linux:
  - `.dmg`/`.AppImage` testen

**Deliverables Phase 12:**

- ✅ `npm run build:desktop` erzeugt lauffähige Installer
- ✅ Electron lädt die statische Next-App im Prod-Modus
- ✅ `.exe` startet sauber und verhält sich identisch zum Dev-Setup (abzüglich DevTools)

#### 12.5 Production Build - Bekannte Probleme & Lösungen

**⚠️ WICHTIG:** Diese Probleme traten beim Production Build auf und wurden behoben. Bei zukünftigen Builds beachten!

##### Problem 1: ES Module vs CommonJS Konflikt

**Symptom:**

```
ReferenceError: require is not defined in ES module scope
```

**Ursache:**

- `"type": "module"` in `package.json` macht alle `.js` Dateien zu ES Modules
- Build-Scripts (`scripts/build-with-signing.js`) nutzen `require()` (CommonJS)
- Konflikt zwischen ES Modules und CommonJS

**Lösung:**

- ❌ **NICHT:** `"type": "module"` in Haupt-`package.json` setzen
- ✅ **Richtig:** `extraMetadata: { type: 'module' }` in `electron-builder.yml` setzen
- Dadurch wird ES Module nur für die gepackte Electron-App verwendet, nicht für Build-Scripts

**Konfiguration:**

```yaml
# electron-builder.yml
extraMetadata:
  type: module
```

##### Problem 2: Asset-Pfade im `file://` Protokoll

**Symptom:**

```
Failed to load resource: net::ERR_FILE_NOT_FOUND
```

- CSS/JS Assets werden nicht geladen
- Pfade wie `/_next/static/...` funktionieren nicht im `file://` Kontext

**Ursache:**

- Next.js generiert standardmäßig absolute Pfade (`/_next/static/...`)
- Electron lädt HTML über `file://` Protokoll
- Relative Pfade werden falsch aufgelöst ohne `<base>` Tag

**Lösung:**

1. **Next.js Config:** Relative Asset-Pfade aktivieren

   ```javascript
   // next.config.js
   const nextConfig = {
     output: "export",
     assetPrefix: "./", // ✅ Relative Pfade
     trailingSlash: true, // ✅ Trailing Slash für Routen
   };
   ```

2. **Base-Tag Script:** Statisches Script nach Build ausführen
   - `scripts/fix-html-base-tag.js` fügt `<base>` Tag zu allen HTML-Dateien hinzu
   - Berechnet korrekten relativen Pfad basierend auf Datei-Tiefe:
     - `out/index.html` → `<base href="./">`
     - `out/sync/index.html` → `<base href="../">`
   - Script wird in Build-Prozess integriert:
     ```json
     {
       "scripts": {
         "fix:html": "node scripts/fix-html-base-tag.js",
         "electron:build": "npm run build && npm run fix:html && npm run electron:build:ts && ..."
       }
     }
     ```

**Wichtig:** Base-Tag muss **statisch** in HTML eingefügt werden, nicht dynamisch via JavaScript (zu spät für Asset-Loading).

##### Problem 3: Navigation im `file://` Kontext

**Symptom:**

```
Not allowed to load local resource: file:///C:/sync/
```

**Ursache:**

- Next.js generiert Links wie `/sync` (absolute Pfade)
- Im `file://` Kontext wird das zu `file:///C:/sync` (falsch)
- Electron blockiert Navigation zu nicht-existierenden Dateien

**Lösung:**

1. **Next.js Config:** `trailingSlash: true` aktivieren
   - Generiert Routen wie `/sync/index.html` statt `/sync`
   - Bessere Kompatibilität mit `file://` Protokoll

2. **Navigation Handler:** `will-navigate` Event in `electron/main.ts`
   ```typescript
   mainWindow.webContents.on("will-navigate", (event, navigationUrl) => {
     const parsedUrl = new URL(navigationUrl);
     if (parsedUrl.protocol === "file:") {
       // Route zu entsprechender HTML-Datei umleiten
       // z.B. /sync/ → out/sync/index.html
       const htmlPath = path.join(outDir, routePath, "index.html");
       if (existsSync(htmlPath) && mainWindow) {
         event.preventDefault();
         mainWindow.loadURL(`file://${htmlPath.replace(/\\/g, "/")}`);
       }
     }
   });
   ```

##### Problem 4: Pfad-Auflösung im Production Build

**Symptom:**

```
Not allowed to load local resource: file:///C:/.../out/index.html
```

**Ursache:**

- `app.getAppPath()` gibt unterschiedliche Pfade in Dev vs. Production
- Im Production Build ist die Struktur anders (app.asar)

**Lösung:**

```typescript
// electron/main.ts
const isDev = !app.isPackaged;

if (isDev) {
  mainWindow.loadURL("http://localhost:3000");
} else {
  // Production: Verwende app.getAppPath() für korrekte Pfad-Auflösung
  const outDir = path.join(app.getAppPath(), "out");
  const indexPath = path.join(outDir, "index.html");
  const fileUrl = `file://${indexPath.replace(/\\/g, "/")}`;
  mainWindow.loadURL(fileUrl);
}
```

##### Problem 5: ES Module Export-Fehler im Production Build

**Symptom:**

```
SyntaxError: The requested module './api-version-manager.js' does not provide an export named 'getApiVersionFromConfig'
```

**Ursache:**

- ES Module Exporte werden im Production Build (ASAR-Archiv) nicht korrekt erkannt
- Möglicherweise ein Problem mit der Art, wie electron-builder ES Modules im ASAR-Archiv behandelt

**Lösung:**

- ✅ **Exporte sind korrekt:** Funktionen sind mit `export function` definiert
- ✅ **Kompilierung erfolgreich:** TypeScript kompiliert die Datei korrekt
- ⚠️ **Mögliche Workarounds:**
  1. ASAR deaktivieren (nur für Tests): `asar: false` in `electron-builder.yml`
  2. Explizite Export-Statements prüfen
  3. Build neu erstellen und testen

**Hinweis:** Dieses Problem tritt möglicherweise nur im Production Build auf. Im Dev-Modus funktioniert alles korrekt.

##### Problem 6: tsconfig.preload.json überschreibt ES Module-Versionen mit CommonJS

**Symptom:**

```
SyntaxError: Named export 'WawiError' not found. The requested module '../../core/domain/errors.js' is a CommonJS module
```

**Ursache:**

- `tsconfig.preload.json` verwendet `"extends": "./tsconfig.json"`, was die `include`-Liste von `tsconfig.json` erweitert
- Dadurch werden alle Electron-Dateien als CommonJS kompiliert (weil `tsconfig.preload.json` `"module": "CommonJS"` hat)
- Diese CommonJS-Versionen überschreiben die ES Module-Versionen, die von `tsconfig.json` erstellt wurden
- Der Import `../../core/domain/errors.js` zeigt auf die CommonJS-Version statt auf die ES Module-Version

**Lösung:**

- ❌ **NICHT:** `"extends": "./tsconfig.json"` in `tsconfig.preload.json` verwenden
- ✅ **Richtig:** `tsconfig.preload.json` sollte eine eigenständige Konfiguration sein (ohne `extends`)
- ✅ **Wichtig:** `outDir` muss unterschiedlich sein: `"outDir": "./dist/preload-temp"` statt `"./dist/electron"`
- ✅ **Wichtig:** Build-Script muss `preload.js` aus `preload-temp` nach `electron/dist/electron/preload.cjs` kopieren

**Konfiguration:**

```jsonc
// electron/tsconfig.preload.json
{
  // KEIN "extends" - eigenständige Konfiguration!
  "compilerOptions": {
    "target": "ES2020",
    "module": "CommonJS", // WICHTIG: CommonJS für Preload
    "lib": ["ES2020"],
    "outDir": "./dist/preload-temp", // WICHTIG: Separates Verzeichnis!
    "noEmit": false,
    "strict": true,
    "esModuleInterop": true,
    "skipLibCheck": true,
    "forceConsistentCasingInFileNames": true,
    "resolveJsonModule": true,
    "moduleResolution": "node",
    "types": ["node"],
  },
  "include": ["preload.ts"], // NUR preload.ts!
  "exclude": ["node_modules", "dist"],
}
```

**Build-Script:**

```jsonc
{
  "scripts": {
    "electron:build:ts": "tsc -p electron/tsconfig.json && tsc -p electron/tsconfig.preload.json && tsc-esm-fix --target electron/dist && node scripts/fix-sentry-imports.js && node -e \"const fs = require('fs'); const path = require('path'); const preloadSrc = path.join('electron', 'dist', 'preload-temp', 'electron', 'preload.js'); const preloadDest = path.join('electron', 'dist', 'electron', 'preload.cjs'); if (fs.existsSync(preloadSrc)) { fs.copyFileSync(preloadSrc, preloadDest); console.log('Preload.js zu preload.cjs kopiert'); } ...\"",
  },
}
```

**WICHTIG:** Der Preload-Pfad ist `electron/dist/preload-temp/electron/preload.js` (nicht `electron/dist/preload-temp/preload.js`), weil TypeScript die Verzeichnisstruktur beibehält.

**Hinweis:** Die Kompilierungsreihenfolge ist wichtig: Zuerst `tsconfig.json` (ES Modules), dann `tsconfig.preload.json` (CommonJS), damit die ES Module-Versionen nicht von den CommonJS-Versionen überschrieben werden.

**WICHTIG:** Bei Problemen mit gemischten CommonJS/ES Module-Versionen:

- Lösche das `electron/dist` Verzeichnis und führe einen sauberen Build durch
- Stelle sicher, dass `tsconfig.json` VOR `tsconfig.preload.json` kompiliert wird
- Prüfe, dass `outDir` in `tsconfig.preload.json` auf `./dist/preload-temp` gesetzt ist (nicht `./dist/electron`)

##### Zusammenfassung der Build-Konfiguration

**Erforderliche Dateien:**

1. `scripts/fix-html-base-tag.js` - Base-Tag Injection Script
2. `next.config.js` - Mit `assetPrefix: './'` und `trailingSlash: true`
3. `electron-builder.yml` - Mit `extraMetadata: { type: 'module' }`
4. `electron/main.ts` - Mit Navigation Handler und korrekter Pfad-Auflösung

**Build-Prozess:**

```bash
npm run build              # Next.js Build
npm run fix:html          # Base-Tag Injection
npm run electron:build:ts # TypeScript Kompilierung
electron-builder --win    # Electron Packaging
```

**Checkliste für zukünftige Builds:**

- ✅ `extraMetadata.type` in `electron-builder.yml` gesetzt (nicht in `package.json`)
- ✅ `assetPrefix: './'` in `next.config.js`
- ✅ `trailingSlash: true` in `next.config.js`
- ✅ `fix:html` Script im Build-Prozess integriert
- ✅ Navigation Handler in `electron/main.ts` vorhanden
- ✅ `app.getAppPath()` für Production-Pfade verwendet
- ✅ `file://` URLs mit korrekter Pfad-Normalisierung (`replace(/\\/g, "/")`)
- ⚠️ ES Module Exporte im Production Build prüfen (ASAR-Archiv)

---

## 🔌 Shopify GraphQL Admin API - Detaillierte Integration

### API-Version & Endpoint

```typescript
// electron/services/shopify-client.ts

const API_VERSION = "2025-10"; // Aktuelle Version (Januar 2025)
const GRAPHQL_ENDPOINT = `${shopUrl}/admin/api/${API_VERSION}/graphql.json`;

// Wichtig: API-Version wird alle 3 Monate aktualisiert
// Dokumentation: https://shopify.dev/docs/api/usage/versioning
```

### Authentifizierung

```typescript
const headers = {
  "X-Shopify-Access-Token": accessToken,
  "Content-Type": "application/json",
};

// Access-Token-Formate:
// - Admin API: "shpat_..." (Private App Token)
// - Custom App: "shpca_..." (OAuth Token)
// - Storefront API: "..." (nicht für Admin API)
```

### Erforderliche API-Scopes

Die App benötigt folgende Berechtigungen beim Erstellen des Access-Tokens:

| Scope             | Zweck                        |
| ----------------- | ---------------------------- |
| `read_products`   | Produkte und Varianten lesen |
| `write_products`  | Preise aktualisieren         |
| `read_inventory`  | Bestände lesen               |
| `write_inventory` | Bestände aktualisieren       |
| `read_locations`  | Locations lesen              |

**Dokumentation:** https://shopify.dev/docs/api/usage/access-scopes

### Rate-Limit-Handling

```typescript
// Rate-Limit-Header auswerten
const rateLimitHeader = response.headers.get("X-Shopify-Shop-Api-Call-Limit");
// Format: "40/40" (verwendet/limit)

const [used, limit] = rateLimitHeader.split("/").map(Number);
const remaining = limit - used;
const percentage = (used / limit) * 100;

// Bei 429 (Too Many Requests)
if (response.status === 429) {
  const retryAfter = response.headers.get("Retry-After");
  const waitTime = retryAfter ? parseInt(retryAfter) : calculateBackoff(attempt);
  // Exponential Backoff implementieren
}
```

**Dokumentation:** https://shopify.dev/docs/api/usage/rate-limits

### Cost-Tracking

```typescript
// GraphQL Query Cost auswerten
const requestCost = response.headers.get("X-Request-Cost");
// Format: "1.0" (kann auch "0.5", "2.0", etc. sein)

// Cost optimieren durch:
// - Batch-Queries verwenden
// - Nur benötigte Felder abfragen
// - Pagination effizient nutzen
```

### GraphQL Queries (Aktualisiert für 2025-10)

#### Produkte abrufen (Cursor-Pagination)

```graphql
query ListProducts($first: Int!, $after: String) {
  products(first: $first, after: $after, sortKey: ID) {
    pageInfo {
      hasNextPage
      endCursor
    }
    edges {
      node {
        id
        title
        variants(first: 250) {
          edges {
            node {
              id
              sku
              barcode
              price
              title
              inventoryItem {
                id
              }
            }
          }
        }
      }
    }
  }
}
```

**Dokumentation:**

- https://shopify.dev/docs/api/admin-graphql/latest/queries/products
- https://shopify.dev/docs/api/usage/pagination-graphql

#### Locations abrufen

```graphql
query ListLocations($first: Int!, $after: String) {
  locations(first: $first, after: $after) {
    pageInfo {
      hasNextPage
      endCursor
    }
    edges {
      node {
        id
        name
      }
    }
  }
}
```

**Dokumentation:** https://shopify.dev/docs/api/admin-graphql/latest/queries/locations

#### Preise aktualisieren (Bulk)

```graphql
mutation UpdateVariantPrices($productId: ID!, $variants: [ProductVariantsBulkInput!]!) {
  productVariantsBulkUpdate(productId: $productId, variants: $variants, allowPartialUpdates: true) {
    productVariants {
      id
    }
    userErrors {
      field
      message
    }
  }
}
```

**Dokumentation:** https://shopify.dev/docs/api/admin-graphql/latest/mutations/productvariantsbulkupdate

#### Bestände setzen

```graphql
mutation SetInventory($input: InventorySetQuantitiesInput!) {
  inventorySetQuantities(input: $input) {
    inventoryAdjustmentGroup {
      createdAt
      reason
      referenceDocumentUri
      changes {
        name
        delta
        quantityAfterChange
      }
    }
    userErrors {
      code
      field
      message
    }
  }
}
```

**Dokumentation:** https://shopify.dev/docs/api/admin-graphql/latest/mutations/inventorySetQuantities

### Fehlerbehandlung

```typescript
// GraphQL Response-Struktur
interface GraphQLResponse {
  data?: any;
  errors?: Array<{
    message: string;
    locations?: Array<{ line: number; column: number }>;
    path?: Array<string | number>;
    extensions?: {
      code: string;
      [key: string]: any;
    };
  }>;
}

// UserErrors von Mutations
interface MutationResponse {
  userErrors: Array<{
    field: string[];
    message: string;
    code?: string;
  }>;
}

// Fehlerbehandlung
if (response.errors) {
  // GraphQL-Level Errors
  throw new GraphQLError(response.errors);
}

if (mutationResult.userErrors?.length > 0) {
  // Mutation-Level UserErrors
  throw new UserError(mutationResult.userErrors);
}
```

### Best Practices

1. **API-Versionierung**
   - Stets neueste stabile Version verwenden (`2025-10`)
   - Deprecation-Warnungen beachten
   - Regelmäßig auf Updates prüfen

2. **Query-Optimierung**
   - Nur benötigte Felder abfragen
   - Batch-Queries verwenden
   - Pagination effizient nutzen (Cursor-basiert)

3. **Rate-Limit-Management**
   - Rate-Limit-Status in UI anzeigen
   - Exponential Backoff bei 429
   - Request-Throttling implementieren

4. **Error-Handling**
   - GraphQL Errors behandeln
   - UserErrors von Mutations anzeigen
   - Network-Errors retryen
   - Invalid-Token-Errors benutzerfreundlich anzeigen

5. **Testing**
   - GraphiQL Explorer für Query-Tests nutzen
   - Test-Shop für Entwicklung verwenden
   - Rate-Limit-Tests durchführen

### Migration von REST zu GraphQL

**Wichtig:** Das Python-Skript nutzt bereits GraphQL, aber für die App:

- ❌ **Nicht verwenden:** REST Admin API (veraltet seit 1. Oktober 2024)
- ✅ **Verwenden:** GraphQL Admin API (einzige Option ab 1. April 2025)

**Dokumentation:** https://shopify.dev/docs/api/admin-rest

### API-Version-Verwaltung

```typescript
// electron/services/api-version-manager.ts

// Zentrale API-Version-Verwaltung
export const SHOPIFY_API_VERSION = "2025-10";

// Version-Check (optional, für zukünftige Updates)
export async function checkApiVersionCompatibility(
  shopUrl: string,
  accessToken: string
): Promise<{
  current: string;
  latest: string;
  isDeprecated: boolean;
  deprecationDate?: string;
}> {
  // Shopify API-Versionen abrufen
  // Deprecation-Warnungen prüfen
  // Benutzer informieren wenn Update nötig
}

// Best Practice: API-Version in Config speichern
// Ermöglicht einfache Updates ohne Code-Änderungen
```

**Wichtig:**

- Shopify veröffentlicht alle 3 Monate neue API-Versionen
- Alte Versionen werden nach 1 Jahr deprecated
- App sollte auf neueste stabile Version setzen
- Deprecation-Warnungen in UI anzeigen

---

## 🎨 UI/UX Konzept

### Design-Prinzipien

- **Modern & Clean:** Minimalistisches Design mit viel Whitespace
- **Intuitiv:** Klare Navigation, selbsterklärende Icons
- **Informativ:** Status-Indikatoren, Fortschrittsanzeigen
- **Fehlertolerant:** Gute Fehlermeldungen, Validierung

### Farb-Schema

- **Primary:** Blau (Shopify-Farben)
- **Success:** Grün
- **Warning:** Orange
- **Error:** Rot
- **Neutral:** Grau-Skala

### Hauptseiten

#### 1. Dashboard

```
┌─────────────────────────────────────────┐
│  WAWISync                    [⚙️] [ℹ️]  │
├─────────────────────────────────────────┤
│  ┌──────────┐  ┌──────────┐            │
│  │  Sync    │  │  Stats   │            │
│  │  Starten │  │  Karten  │            │
│  └──────────┘  └──────────┘            │
│                                         │
│  ┌──────────────────────────────────┐  │
│  │  Letzte Synchronisationen         │  │
│  │  ┌────────────────────────────┐  │  │
│  │  │ 2025-01-15 14:30  ✅ Erfolg │  │  │
│  │  │ 2025-01-15 10:15  ⚠️ Warnung│  │  │
│  │  └────────────────────────────┘  │  │
│  └──────────────────────────────────┘  │
└─────────────────────────────────────────┘
```

#### 2. Sync-Seite (Wizard/Stepper)

**Wizard-Ansatz mit klaren Schritten:**

```
┌─────────────────────────────────────────┐
│  Synchronisation                        │
├─────────────────────────────────────────┤
│  [1] [2] [3] [4]  (Stepper-Indikator)  │
│                                         │
│  Schritt 1: CSV hochladen               │
│  ┌──────────────────────────────────┐  │
│  │ [📁 Datei auswählen]              │  │
│  │ oder                              │  │
│  │ Drag & Drop hier                  │  │
│  │                                    │  │
│  │ ✅ artikel.csv (1.234 Zeilen)      │  │
│  └──────────────────────────────────┘  │
│                                         │
│  [Weiter →]                             │
│                                         │
│  Schritt 2: Spalten zuordnen            │
│  SKU:        [Spalte BK ▼]              │
│  Name:       [Spalte C  ▼]              │
│  Preis:      [Spalte N  ▼]              │
│  Bestand:    [Spalte AB ▼]              │
│                                         │
│  [← Zurück] [Weiter →]                  │
│                                         │
│  Schritt 3: Vorschau                    │
│  ┌──────────────────────────────────┐  │
│  │ Produkt    │ Preis │ Bestand │ ✓ │  │
│  │ Produkt 1  │ 12.50 │   10   │ ✓ │  │
│  │ Produkt 2  │  8.99 │    5   │ ✓ │  │
│  │ ...        │ ...   │  ...  │ ✓ │  │
│  │                                    │  │
│  │ ⚠️ Nicht gematcht: 5 Zeilen        │  │
│  └──────────────────────────────────┘  │
│                                         │
│  [ ] Nur Preise aktualisieren           │
│  [ ] Nur Bestände aktualisieren         │
│                                         │
│  [← Zurück] [🔄 Synchronisieren]        │
│                                         │
│  Schritt 4: Ausführung                  │
│  [Fortschrittsanzeige...]               │
└─────────────────────────────────────────┘
```

**Wizard-Features:**

- **Validierung pro Schritt:** "Weiter"-Button nur aktiv, wenn Schritt gültig
- **Zurück-Navigation:** Jederzeit zu vorherigen Schritten
- **Trockenlauf-Modus:** Checkbox "Dry Run" (nur Vorschau, keine Mutation)

**Nicht-gematchte Zeilen:**

- Eigener Tab/Filter "Nicht gematcht (X Zeilen)"
- Export-Funktion: CSV mit nur nicht-gematchten Zeilen
- Manuelle Zuordnung möglich (optional, v1.2+)

#### 3. Settings-Seite

```
┌─────────────────────────────────────────┐
│  Einstellungen                          │
├─────────────────────────────────────────┤
│  Shop-Konfiguration                     │
│  ┌──────────────────────────────────┐  │
│  │ Shop-URL:                        │  │
│  │ [https://...myshopify.com]       │  │
│  │                                   │  │
│  │ Access-Token:                    │  │
│  │ [••••••••••••••••] [Testen]      │  │
│  │                                   │  │
│  │ Location:                         │  │
│  │ [Osakaallee 2 ▼]                 │  │
│  └──────────────────────────────────┘  │
│                                         │
│  Standard-Spalten-Mapping               │
│  [Konfigurieren]                       │
│                                         │
│  Automatische Synchronisation           │
│  [ ] Alle 30 Minuten                   │
│  [ ] Täglich um 08:00                  │
└─────────────────────────────────────────┘
```

---

## 🔄 Datenfluss

### Sync-Workflow

```
1. Benutzer lädt CSV hoch
   ↓
2. CSV wird geparst (Encoding-Erkennung)
   ↓
3. Spalten werden gemappt
   ↓
4. Produkte von Shopify geladen (mit Caching)
   ↓
5. Matching durchgeführt (SKU → Name → Barcode)
   ↓
6. Updates werden gesammelt
   ↓
7. Koaleszierung (Inventory-Duplikate)
   ↓
8. Vorschau wird angezeigt
   ↓
9. Benutzer bestätigt
   ↓
10. Updates werden ausgeführt (Bulk)
    - Preise (pro Produkt)
    - Inventory (in Batches von 250)
    ↓
11. Fortschritt wird in Echtzeit angezeigt
    ↓
12. Ergebnisse werden angezeigt
```

### IPC-Kommunikation

```typescript
// Renderer → Main
ipcRenderer.invoke("sync:start", {
  csvPath: string,
  mapping: ColumnMapping,
  config: ShopConfig,
});

// Main → Renderer
ipcMain.on("sync:progress", (event, progress) => {
  // Fortschritt senden
});

ipcMain.on("sync:log", (event, log) => {
  // Log-Nachricht senden
});

ipcMain.on("sync:complete", (event, result) => {
  // Ergebnis senden
});
```

---

## ⚠️ Fehler- & Recovery-Strategie

### Fehlerklassen

#### 1. Benutzerfehler (User Errors)

**Definition:** Fehler, die durch falsche Eingaben oder Konfiguration verursacht werden.

**Beispiele:**

- Ungültige CSV (kein Header / Spalte fehlt / leere Datei)
- Falsche Shop-URL (nicht `.myshopify.com`)
- Ungültiges Token / fehlende Scopes
- Spalten-Mapping unvollständig
- Location nicht gefunden

**Behandlung:**

- ❌ **Kein automatischer Retry**
- ✅ **Sofortiger Abbruch** des Syncs
- ✅ **Benutzerfreundliche Fehlermeldung** mit konkreter Anleitung
- ✅ **Validierung vor Sync-Start** (so viele Fehler wie möglich vorher abfangen)

**UI-Darstellung:**

- Rote Alert-Box mit klarer Fehlermeldung
- Konkrete Schritte zur Behebung
- Link zu relevanten Einstellungen

#### 2. Remote-Fehler (Shopify)

**Definition:** Fehler, die von der Shopify API kommen.

**Beispiele:**

- **4xx (außer 429):** Forbidden (403), Unauthorized (401), Bad Request (400)
- **429:** Rate-Limit überschritten
- **5xx:** Shopify-seitige Server-Fehler
- **GraphQL Errors:** UserErrors von Mutations

**Behandlung:**

**4xx (außer 429):**

- ❌ **Kein Retry** (Client-Fehler)
- ✅ **Sync abbrechen**
- ✅ **Fehlermeldung anzeigen** (z.B. "Token ungültig" oder "Berechtigung fehlt")

**429 (Rate-Limit):**

- ✅ **Automatischer Retry** mit Exponential Backoff
- ✅ **Retry-After Header beachten**
- ✅ **Max 5 Retries**
- ✅ **Fortschritt anzeigen** ("Warte auf Rate-Limit...")

**5xx (Server-Fehler):**

- ✅ **Automatischer Retry** mit Exponential Backoff
- ✅ **Max 5 Retries**
- ✅ **Bei dauerhaftem Fehler:** Sync abbrechen, aber bereits erfolgreiche Updates behalten

**GraphQL UserErrors:**

- ✅ **Partial-Success:** Erfolgreiche Updates behalten
- ✅ **Fehlgeschlagene Updates** in Ergebnis-Report auflisten
- ✅ **Konkrete Fehlermeldung** pro fehlgeschlagenem Update

#### 3. Systemfehler

**Definition:** Fehler in der App selbst oder im System.

**Beispiele:**

- Netzwerk-Timeouts
- Diskfehler beim Schreiben/Lesen (SQLite, Config)
- Interne Exceptions (Bugs)
- Memory-Fehler

**Behandlung:**

- ✅ **Retry bei Netzwerk-Fehlern** (max 3 Versuche)
- ❌ **Kein Retry bei Disk-Fehlern** (kritisch, sofort abbrechen)
- ✅ **Error-Logging** für Debugging
- ✅ **Benutzerfreundliche Fehlermeldung** ("Ein unerwarteter Fehler ist aufgetreten")

### Partial-Success-Strategie

**Szenario:** 1000 Updates geplant, ein Batch mit 250 schlägt wegen UserError bei einer Variante fehl.

**Strategie:**

1. **Erfolgreiche Updates weiter zählen**
   - Preise: Pro Produkt-Batch (alle Varianten erfolgreich → zählen)
   - Inventory: Pro Batch von 250 (alle erfolgreich → zählen)

2. **Fehlgeschlagene Updates sammeln**
   - In `SyncResult.operations` mit Status `"failed"`
   - Konkrete Fehlermeldung speichern
   - Shopify-ID und CSV-Zeile referenzieren

3. **Sync-Ergebnis:**

   ```typescript
   {
     totalPlanned: 1000,
     totalExecuted: 1000,  // Alle wurden versucht
     totalSuccess: 750,    // 750 erfolgreich
     totalFailed: 250,     // 250 fehlgeschlagen
     totalSkipped: 0,
     operations: [
       // ... 750 mit status: "success"
       // ... 250 mit status: "failed" + message
     ]
   }
   ```

4. **UI-Darstellung:**
   - ✅ Erfolgreiche Updates grün markieren
   - ❌ Fehlgeschlagene Updates rot markieren
   - 📊 Zusammenfassung: "750 von 1000 Updates erfolgreich"
   - 📋 Fehler-Liste mit Filtermöglichkeit

### Recovery-Mechanismen

1. **Sync-Abbruch**
   - Benutzer kann Sync jederzeit abbrechen
   - Bereits erfolgreiche Updates bleiben erhalten
   - Teilweise verarbeitete Batches werden abgeschlossen (keine halben Batches)

2. **Cache-Recovery**
   - Bei Cache-Fehlern: Automatischer Rebuild
   - Bei Schema-Version-Mismatch: Cache löschen und neu aufbauen

3. **Config-Recovery**
   - Bei beschädigter Config: Fallback auf Defaults
   - Warnung anzeigen, Benutzer kann neu konfigurieren

---

## 🧪 Teststrategie & Python-Parität

### Test-Pyramide

```
        /\
       /E2E\        (Post-MVP, v1.1+)
      /------\
     /Integration\  (Kritische Workflows)
    /------------\
   /    Unit       \ (Core Domain + Services)
  /----------------\
```

### 1. Unit-Tests (MVP)

**Ziel:** Core-Domain-Logik vollständig testen.

**Coverage-Ziel:** > 90% für Core-Domain

**Test-Bereiche:**

#### Core-Domain-Tests

- `matching.ts`: Alle Matching-Strategien (SKU, Name, Barcode, Prefix)
- `price-normalizer.ts`: Alle Preis-Formate (6,5 / 6.5 / 1.234,56 / etc.)
- `inventory-coalescing.ts`: Duplikat-Erkennung und Koaleszierung
- `sync-pipeline.ts`: CSV → Updates Transformation

#### Service-Tests

- `shopify-service.ts`: API-Calls (mit Mocks)
- `csv-service.ts`: Encoding-Erkennung, Parsing
- `cache-service.ts`: SQLite-Operationen

**Test-Framework:** Vitest

### 2. Paritäts-Tests (Python-Skript)

**Ziel:** Identische Ergebnisse wie Python-Skript garantieren.

**Struktur:**

```
tests/
├── fixtures/
│   ├── sample.csv                    # Beispiel-CSV aus Produktion
│   ├── sample-products.json          # Shopify-Produkte (Mock)
│   └── expected-outputs.json         # Erwartete Outputs (vom Python-Skript)
└── parity/
    ├── matching-parity.test.ts       # Matching-Logik identisch?
    ├── price-normalization-parity.test.ts # Preis-Normalisierung identisch?
    └── sync-result-parity.test.ts    # Gesamter Sync identisch?
```

**Vorgehen:**

1. **Test-Daten generieren:**
   - Beispiel-CSV aus Produktion verwenden
   - Erwartete Outputs mit Python-Skript generieren
   - Als JSON-File speichern

2. **Paritäts-Tests schreiben:**

   ```typescript
   test("matching logic matches Python script", () => {
     const csvRow = loadFixture("sample.csv")[0];
     const products = loadFixture("sample-products.json");
     const expected = loadFixture("expected-outputs.json")[0];

     const result = findVariantId(csvRow, products);

     expect(result.variantId).toBe(expected.variantId);
     expect(result.method).toBe(expected.method);
   });
   ```

3. **Edge-Cases testen:**
   - Komische Preisformate
   - Unterschiedliche Encoding-Fälle
   - Produkte mit gleichen Namen, aber unterschiedlichen SKUs
   - Leere/Null-Werte
   - Sonderzeichen in Namen

### 3. Integration-Tests (MVP)

**Ziel:** Vollständige Workflows testen.

**Test-Szenarien:**

1. **Vollständiger Sync-Workflow:**
   - CSV-Upload → Mapping → Vorschau → Sync → Ergebnis

2. **Fehler-Szenarien:**
   - Ungültige CSV
   - Shopify API-Fehler (429, 5xx)
   - Partial-Success (einige Updates fehlgeschlagen)

3. **Cache-Integration:**
   - Cache-Aufbau
   - Cache-Nutzung bei wiederholtem Sync
   - Cache-Invalidierung

**Test-Framework:** Vitest + Test-Containers (optional, für SQLite)

### 4. E2E-Tests (Post-MVP, v1.1+)

**Ziel:** UI-Interaktionen und End-to-End-Workflows.

**Test-Framework:** Playwright

**Test-Szenarien:**

- Vollständiger Sync-Workflow über UI
- Settings-Konfiguration
- Fehlerbehandlung in UI

### Test-Fixtures

**Struktur:**

```typescript
// tests/fixtures/sample.csv
SKU;Name;Preis;Bestand
ABC123;Produkt 1;12,50;10
DEF456;Produkt 2;8,99;5

// tests/fixtures/expected-outputs.json
[
  {
    csvRow: { sku: "ABC123", name: "Produkt 1", price: "12,50", stock: 10 },
    expectedMatch: {
      variantId: "gid://shopify/ProductVariant/123",
      method: "sku",
      confidence: "exact"
    },
    expectedPriceUpdate: "12.50",
    expectedInventoryUpdate: 10
  },
  // ...
]
```

### Test-Coverage-Ziele

- **Core-Domain:** > 90%
- **Services:** > 80%
- **Gesamt:** > 80%

---

## 🏪 Multi-Shop-Management (v1.2)

### Shop-Config-Modell

```typescript
interface ShopConfig {
  id: string; // UUID
  name: string; // "Filiale X" (benutzerdefiniert)
  shopUrl: string; // https://...myshopify.com
  accessTokenId: string; // Referenz auf verschlüsselten Token
  defaultLocationId?: string; // Standard-Location
  columnMapping: ColumnMapping; // Standard-Spalten-Mapping
  createdAt: string; // ISO-Date
  updatedAt: string; // ISO-Date
  isDefault: boolean; // Standard-Shop
}
```

### Active Shop

- **Globaler Zustand:** Aktuell ausgewählter Shop
- **Umschalt-Logik:** Dropdown in Header/Sidebar
- **Persistierung:** Letzter aktiver Shop wird gespeichert

### Migration-Strategie

**v1.0 → v1.2:**

- Bestehende Config wird zu `ShopConfig` mit `id: "default"`
- `isDefault: true` setzen
- UI erweitern um Shop-Auswahl (zunächst nur ein Shop sichtbar)

**v1.2:**

- "Shop hinzufügen"-Button in Settings
- Shop-Liste mit Umschalt-Möglichkeit
- Jeder Shop hat eigenen Cache (SQLite-Datenbank pro Shop)

---

## 🔒 Sicherheit & Best Practices

### Shopify API-Spezifika

#### API-Versionierung

- **Aktuelle Version:** Zum Implementierungszeitpunkt **aktuelle** stabile API-Version verwenden
- **Hinweis:** `2025-10` dient als Platzhalter im Dokument; bei Implementierung neueste Version prüfen
- **Versionierung:** Shopify veröffentlicht alle 3 Monate neue Versionen
- **Deprecation:** REST Admin API ist seit 1. Oktober 2024 veraltet
- **Migration:** Ab 1. April 2025 müssen alle neuen Apps GraphQL Admin API nutzen
- **Best Practice:** Stets neueste stabile Version verwenden, aber mit Deprecation-Warnungen rechnen

#### Erforderliche API-Scopes

Die App benötigt folgende Berechtigungen beim Access-Token:

- `read_products` - Produkte und Varianten lesen
- `write_products` - Preise aktualisieren
- `read_inventory` - Bestände lesen
- `write_inventory` - Bestände aktualisieren
- `read_locations` - Locations lesen

#### Rate-Limits

- **Shop API Call Limit:** Variiert je nach Plan (z.B. 40 Calls/Sekunde)
- **Header:** `X-Shopify-Shop-Api-Call-Limit: "40/40"`
- **Bei Überschreitung:** HTTP 429 mit `Retry-After` Header
- **Best Practice:** Rate-Limit-Status in UI anzeigen

#### Cost-Tracking

- **GraphQL Cost:** Jede Query hat einen "Cost"-Wert
- **Header:** `X-Request-Cost: "1.0"`
- **Budget:** Shopify hat ein Query-Budget pro Shop
- **Optimierung:** Queries optimieren, um Cost zu minimieren

### Sicherheit

#### 1. Electron-Sicherheits-Settings

**Kritische Konfiguration:**

```typescript
// electron/main.ts
const mainWindow = new BrowserWindow({
  webPreferences: {
    contextIsolation: true, // ✅ WICHTIG: Verhindert XSS → RCE
    nodeIntegration: false, // ✅ WICHTIG: Kein direkter Node-Zugriff
    preload: path.join(__dirname, "preload.js"),
  },
});
```

**Prinzipien:**

- Renderer-Prozess hat **keine direkten Node-Rechte**
- Sämtliche FS/Netzwerk-Zugriffe laufen über Main-Prozess
- Zugriff auf Node nur über `preload.ts` + **getypte IPC-Interfaces**

#### 2. Credentials-Management

**Verschlüsselung:**

- Access-Tokens mit `electron-store` verschlüsselt speichern
- **Verschlüsselungs-Schlüssel:** Master-Passphrase (optional, für gemeinsam genutzte Rechner)
- **Optional:** OS Keychain nutzen (Windows Credential Manager, macOS Keychain, Linux Secret Service)
- Tokens niemals in Klartext speichern

**Token-Masking im UI:**

- Token wird als `shpat_***` angezeigt
- "Token anzeigen"-Button mit Bestätigung
- Token kann nur bei Neu-Eingabe gesetzt werden (nicht kopierbar)

**Secrets Lifecycle:**

1. **Erzeugung:**
   - Token aus Shopify Admin generieren
   - Erforderliche Scopes dokumentieren

2. **Speicherung:**
   - Verschlüsselt in `electron-store`
   - Optional: OS Keychain (bevorzugt, wenn verfügbar)
   - Nie in Logs oder Fehlermeldungen

3. **Rotation:**
   - "Token erneuern"-Button in Settings
   - Altes Token löschen
   - Neues Token eingeben und testen

#### 3. Input-Validierung

- Alle Benutzereingaben validieren (Zod)
- Shop-URL validieren (muss `.myshopify.com` Domain sein)
- Access-Token Format validieren (beginnt mit `shpat_` oder `shpca_`)
- XSS verhindern (React schützt bereits)
- SQL-Injection verhindern (SQLite-Parameterized Queries)

#### 4. API-Sicherheit

- Tokens niemals in Logs ausgeben (maskieren: `shpat_***`)
- HTTPS für alle API-Calls (Shopify erzwingt HTTPS)
- Shop-URL validieren vor API-Calls
- Token-Validierung bei App-Start
- Rate-Limit-Status nicht in Logs (nur in UI)

#### 5. Error-Handling & Security

- GraphQL Errors korrekt behandeln
- UserErrors von Mutations anzeigen
- Network-Errors retryen
- Invalid-Token-Errors benutzerfreundlich anzeigen
- **Keine Stack-Traces in Produktion** (nur in Dev-Modus)

### Best Practices

1. **Code-Organisation**
   - Separation of Concerns
   - DRY-Prinzip
   - TypeScript strikt nutzen

2. **Error Handling**
   - Try-Catch überall
   - Benutzerfreundliche Fehlermeldungen
   - Logging für Debugging

3. **Performance**
   - Lazy Loading
   - Caching von Produktdaten
   - Debouncing bei Eingaben

4. **Testing**
   - Unit-Tests für Services
   - Integration-Tests für Workflows
   - E2E-Tests für kritische Pfade

---

## 📊 Erfolgsmetriken

### Funktionale Anforderungen

- ✅ CSV/DBF-Upload funktioniert
- ✅ Spalten-Mapping funktioniert
- ✅ Matching identisch zum Python-Skript
- ✅ Updates werden korrekt ausgeführt
- ✅ Test-Modus funktioniert
- ✅ Fortschritt wird angezeigt
- ✅ Fehler werden behandelt
- ✅ Auto-Sync funktioniert mit konfigurierbarem Intervall
- ✅ Update-Service prüft automatisch auf neue Releases
- ✅ Code-Signing wird unterstützt

### Nicht-funktionale Anforderungen

- ⚡ Sync-Geschwindigkeit: > 1000 Updates/Minute
- 💾 Speicherverbrauch: < 500 MB
- 🚀 Startzeit: < 3 Sekunden
- 🎯 Test-Coverage: > 80%

---

## 🎯 Nächste Schritte

1. **Projekt initialisieren** (Phase 1)
2. **UI-Grundgerüst erstellen** (Phase 2)
3. **Backend-Services implementieren** (Phase 3)
4. **Iterativ weiterentwickeln** (Phasen 4-12)

---

## 📝 Notizen

### Wichtige Shopify API-Änderungen

1. **API-Version Update**
   - Python-Skript nutzt: `2025-07`
   - **Aktuelle Version:** Zum Implementierungszeitpunkt neueste stabile Version verwenden
   - **Hinweis:** `2025-10` ist Platzhalter; bei Implementierung aktuelle Version prüfen
   - **Aktion:** API-Version in der App auf neueste stabile Version setzen

2. **REST API Deprecation**
   - REST Admin API ist seit 1. Oktober 2024 veraltet
   - Ab 1. April 2025 nur noch GraphQL Admin API
   - **Aktion:** Nur GraphQL Admin API verwenden (bereits im Skript)

3. **GraphQL Queries/Mutations**
   - Die verwendeten Queries sind aktuell:
     - `products` Query (Cursor-Pagination)
     - `locations` Query (Cursor-Pagination)
     - `productVariantsBulkUpdate` Mutation
     - `inventorySetQuantities` Mutation
   - **Aktion:** Queries vor Implementierung in GraphiQL Explorer testen

4. **Rate-Limits & Cost**
   - Rate-Limit-Status in UI anzeigen
   - Cost-Tracking implementieren
   - Query-Cost optimieren

### Code-Referenzen

- Das Python-Skript dient als Referenz für die Logik
- Alle Matching-Algorithmen müssen identisch sein
- Preis-Normalisierung muss exakt gleich sein
- Retry-Logik muss identisch sein
- Koaleszierung muss identisch sein

### Shopify-Dokumentation Links

- **GraphQL Admin API:** https://shopify.dev/docs/api/admin-graphql
- **API-Versionen:** https://shopify.dev/docs/api/usage/versioning
- **Rate-Limits:** https://shopify.dev/docs/api/usage/rate-limits
- **GraphiQL Explorer:** https://shopify.dev/api/usage/api-exploration/admin-graphiql-explorer
- **Authentication:** https://shopify.dev/docs/apps/auth
- **Scopes:** https://shopify.dev/docs/api/usage/access-scopes

---

---

## 🎉 v1.0 Release-Zusammenfassung

**Release-Datum:** 29. November 2025  
**Version:** v1.0.0

### ✅ Implementierte Features

#### Core-Funktionalität

- ✅ CSV/DBF-Datei-Upload und -Verarbeitung
- ✅ Shopify GraphQL Admin API Integration
- ✅ Spalten-Mapping (SKU, Name, Preis, Bestand)
- ✅ Intelligentes Matching (SKU, Name, Barcode)
- ✅ Vorschau-Funktion vor Synchronisation
- ✅ Test-Modus für einzelne Artikel
- ✅ Echtzeit-Fortschrittsanzeige
- ✅ Detaillierte Logs und Fehlerbehandlung
- ✅ Export-Funktionalität (CSV, Logs)

#### Automatisierung

- ✅ Auto-Sync-Service mit Scheduler
- ✅ Update-Service über GitHub Releases
- ✅ Automatisches Überspringen von Schritten (wenn Pfad/Mapping gespeichert)

#### Sicherheit & Qualität

- ✅ Verschlüsselte Token-Speicherung
- ✅ Code-Signing Support
- ✅ Context Isolation aktiviert
- ✅ IPC-basierte Kommunikation

#### Benutzerfreundlichkeit

- ✅ Moderne UI mit Next.js 14+ und React 18+
- ✅ Wizard-basierter Sync-Workflow
- ✅ Standard-Pfad-Unterstützung
- ✅ Mapping-Persistierung
- ✅ Verbesserte Fehlerbehandlung

### 📦 Technologie-Stack

- **Frontend:** Next.js 14+ (App Router), React 18+, TypeScript, Tailwind CSS
- **Backend:** Electron 28+, Node.js
- **Datenbank:** SQLite (better-sqlite3)
- **API:** Shopify GraphQL Admin API (2025-10)
- **Build:** electron-builder
- **Testing:** Vitest

### 🚀 Nächste Schritte (v1.1+)

**v1.1 - Erweiterte Features & Stabilität:**

- Erweiterte E2E-Tests mit Playwright
- Performance-Optimierungen
- Erweiterte Export-Formate (JSON, Excel)
- **Remote Error Monitoring & Fernwartung mit Sentry** 🆕

**v1.2 - Multi-Shop & Erweiterungen:**

- Multi-Shop-Management
- Multi-Location-Support
- API-Version-Manager (automatische Updates)

---

## 📝 Zusammenfassung der Verbesserungen

### MVP-Fokussierung

- ✅ Klarer MVP-Scope definiert (v1.0)
- ✅ Post-MVP Features explizit ausgelagert (v1.1+)
- ✅ Reduziertes Risiko durch frühe produktive Nutzung

### Architektur-Verbesserungen

- ✅ Core-Domain-Layer explizit definiert (pure Business Logic)
- ✅ Trennung von Core/Infrastructure/App/UI
- ✅ 80-90% der Logik testbar ohne Electron

### Persistenz & Caching

- ✅ SQLite für Produkt-/Variant-Cache
- ✅ Cache-Strategie mit Invalidierung
- ✅ Sync-Historie (letzte 10 Syncs)

### Fehler- & Recovery-Strategie

- ✅ Drei Fehlerklassen definiert (User/Remote/System)
- ✅ Partial-Success-Strategie explizit
- ✅ Recovery-Mechanismen dokumentiert

### Teststrategie

- ✅ Paritäts-Tests für Python-Skript-Identität
- ✅ Test-Fixtures mit erwarteten Outputs
- ✅ Edge-Case-Tests geplant

### Security

- ✅ Electron-Sicherheits-Settings explizit
- ✅ Secrets Lifecycle dokumentiert
- ✅ Token-Masking im UI

### UX-Verbesserungen

- ✅ Wizard/Stepper-Ansatz
- ✅ Trockenlauf-Modus
- ✅ Nicht-gematchte Zeilen prominent
- ✅ Export-Funktionen

### Multi-Shop (v1.2)

- ✅ Shop-Config-Modell definiert
- ✅ Migrations-Strategie geplant

---

**Erstellt:** 2025-01-15
**Aktualisiert:** 2025-01-15 (Feedback-Integration)
**Aktualisiert:** 2025-01-XX (Phase 7 Implementierung - sync:preview Endpunkt, SyncResult.planned optional)
**Aktualisiert:** 2025-01-XX (Production Build Probleme & Lösungen dokumentiert - Phase 12.5)
**Version:** 2.2
**Status:** Phase 7 implementiert, Phase 8-12 geplant, Production Build Probleme behoben
