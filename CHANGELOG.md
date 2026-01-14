# Changelog

Alle wichtigen Änderungen an diesem Projekt werden in dieser Datei dokumentiert.

Das Format basiert auf [Keep a Changelog](https://keepachangelog.com/de/1.0.0/),
und dieses Projekt folgt [Semantic Versioning](https://semver.org/lang/de/).


## [1.0.5] - 2026-01-14

### ✨ Features
- (Automatisch generiert - bitte manuell ausfüllen)

### 🔧 Fixes
- (Automatisch generiert - bitte manuell ausfüllen)

### 📝 Dokumentation
- (Automatisch generiert - bitte manuell ausfüllen)

## [1.0.1] - 2025-11-29

### 🔧 Fixes

- **Update-System:** Automatisches Hochladen von Build-Artefakten zu GitHub Releases
- **Release-Prozess:** Build-Scripts mit `--publish` Option für automatische Updates
- **Dokumentation:** Release-Prozess-Dokumentation hinzugefügt

### 📝 Dokumentation

- Release-Prozess-Anleitung (`docs/RELEASE_PROCESS.md`)
- Build-Scripts für automatisches Publishing erweitert

## [1.0.0] - 2025-11-29

### ✨ Features

#### Core-Funktionalität

- CSV/DBF-Datei-Upload und -Verarbeitung
- Shopify GraphQL Admin API Integration
- Spalten-Mapping (SKU, Name, Preis, Bestand)
- Intelligentes Matching (SKU, Name, Barcode)
- Vorschau-Funktion vor Synchronisation
- Test-Modus für einzelne Artikel
- Echtzeit-Fortschrittsanzeige
- Detaillierte Logs und Fehlerbehandlung
- Export-Funktionalität (CSV, Logs)

#### Automatisierung

- Auto-Sync-Service mit Scheduler
- Update-Service über GitHub Releases
- Automatisches Überspringen von Schritten (wenn Pfad/Mapping gespeichert)

#### Sicherheit & Qualität

- Verschlüsselte Token-Speicherung
- Code-Signing Support
- Context Isolation aktiviert
- IPC-basierte Kommunikation

#### Benutzerfreundlichkeit

- Moderne UI mit Next.js 14+ und React 18+
- Wizard-basierter Sync-Workflow
- Standard-Pfad-Unterstützung
- Mapping-Persistierung
- Verbesserte Fehlerbehandlung

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
- Remote Error Monitoring & Fernwartung mit Sentry

**v1.2 - Multi-Shop & Erweiterungen:**

- Multi-Shop-Management
- Multi-Location-Support
- API-Version-Manager (automatische Updates)

[1.0.1]: https://github.com/Bebin29/shpysync/releases/tag/v1.0.1
[1.0.0]: https://github.com/Bebin29/shpysync/releases/tag/v1.0.0
[1.0.5]: https://github.com/Bebin29/shpysync/releases/tag/v1.0.5
