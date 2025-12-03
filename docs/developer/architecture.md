# Architektur-Übersicht

Diese Dokumentation beschreibt die Architektur von WAWISync.

## Übersicht

WAWISync ist eine Electron-Desktop-Anwendung mit einer klaren Schichtenarchitektur:

```
┌─────────────────────────────────────────────────────────┐
│              UI Layer (Next.js/React)                   │
│  - React Components                                     │
│  - Hooks (use-electron, use-sync)                      │
│  - State Management (Zustand)                          │
└─────────────────────────────────────────────────────────┘
                    ↕ IPC
┌─────────────────────────────────────────────────────────┐
│         Electron App Layer                              │
│  - IPC Handlers                                         │
│  - Electron-spezifische Services                       │
└─────────────────────────────────────────────────────────┘
                    ↕
┌─────────────────────────────────────────────────────────┐
│         Core Domain Layer                               │
│  - Pure Business Logic (kein Electron/IPC)            │
│  - Matching, Preis-Normalisierung, etc.                │
└─────────────────────────────────────────────────────────┘
                    ↕
┌─────────────────────────────────────────────────────────┐
│         Infrastructure Layer                            │
│  - Shopify Client                                      │
│  - CSV Parser                                          │
│  - Cache/Persistenz                                    │
└─────────────────────────────────────────────────────────┘
```

## Architektur-Prinzipien

### 1. Trennung von Concerns

- **Core Domain:** Pure Business Logic, testbar ohne Electron
- **Infrastructure:** Externe Abhängigkeiten (Shopify, CSV, DB)
- **App Layer:** Electron/IPC-spezifische Anpassungen
- **UI Layer:** React/Next.js, keine Business Logic

### 2. Sicherheit

- `contextIsolation: true` - Verhindert XSS → RCE Angriffe
- `nodeIntegration: false` - Kein direkter Node-Zugriff im Renderer
- Preload Script - Exponiert nur explizit definierte API-Methoden
- IPC-basierte Kommunikation - Alle kritischen Operationen laufen über den Main Process

### 3. Testbarkeit

- Core Domain Layer ist vollständig testbar ohne Electron
- Services sind injizierbar und mockbar
- Unit-Tests für Domain-Logik
- Integration-Tests für Services

## Schichten im Detail

### UI Layer (Next.js/React)

**Location:** `app/`

- **Komponenten:** React-Komponenten für UI
- **Hooks:** Custom Hooks für Electron-IPC
- **Stores:** Zustand State Management
- **Types:** TypeScript-Typen für UI

**Verantwortlichkeiten:**

- UI-Rendering
- Benutzerinteraktionen
- State-Management für UI
- IPC-Kommunikation mit Main Process

### Electron App Layer

**Location:** `electron/`

- **Main Process:** `main.ts` - Electron Entry Point
- **Preload Script:** `preload.ts` - IPC Bridge
- **Services:** Backend-Services
- **IPC Handlers:** `services/ipc-handlers.ts`

**Verantwortlichkeiten:**

- Electron-App-Lifecycle
- IPC-Kommunikation
- Service-Orchestrierung
- Konfigurations-Management

### Core Domain Layer

**Location:** `core/domain/`

- **Matching:** Produkt-Matching-Logik
- **Price Normalizer:** Preis-Normalisierung
- **Inventory Coalescing:** Inventory-Koaleszierung
- **Sync Pipeline:** Sync-Pipeline
- **Validators:** Validierungs-Logik
- **Types:** Domain-Types

**Verantwortlichkeiten:**

- Pure Business Logic
- Keine Abhängigkeiten zu Electron oder externen Services
- Vollständig testbar

### Infrastructure Layer

**Location:** `core/infra/`

- **Shopify Client:** Shopify API Client
- **CSV Parser:** CSV/DBF-Parser
- **DBF Parser:** DBF-Datei-Parser
- **File Parser:** Unified File Parser

**Verantwortlichkeiten:**

- Externe API-Kommunikation
- Datei-Parsing
- Datenbank-Zugriff

## Datenfluss

### Synchronisation

1. **UI:** Benutzer wählt CSV/DBF-Datei
2. **IPC:** `csv:preview` → Main Process
3. **Service:** CSV-Service parst Datei
4. **IPC:** Preview-Daten zurück zum Renderer
5. **UI:** Vorschau anzeigen
6. **UI:** Benutzer startet Sync
7. **IPC:** `sync:start` → Main Process
8. **Service:** Sync-Engine startet
9. **Domain:** Matching, Normalisierung
10. **Infrastructure:** Shopify API-Aufrufe
11. **IPC:** Progress-Events → Renderer
12. **UI:** Fortschritt anzeigen
13. **IPC:** Complete-Event → Renderer
14. **UI:** Ergebnis anzeigen

### Konfiguration

1. **UI:** Benutzer konfiguriert Shop
2. **IPC:** `config:set-shop` → Main Process
3. **Service:** Config-Service speichert (verschlüsselt)
4. **Service:** Token wird im Token-Store gespeichert
5. **IPC:** Erfolg zurück zum Renderer

## Services

### Sync Engine

**Location:** `electron/services/sync-engine.ts`

- Orchestriert Synchronisation
- Nutzt Core Domain Layer
- Sendet Progress-Events über IPC

### Config Service

**Location:** `electron/services/config-service.ts`

- Verwaltet App-Konfiguration
- Nutzt electron-store für Persistenz
- Verschlüsselte Token-Speicherung

### Cache Service

**Location:** `electron/services/cache-service.ts`

- Verwaltet SQLite-Cache
- Nur für Dashboard-Stats
- Nicht im Sync-Prozess verwendet

### Shopify Service

**Location:** `electron/services/shopify-service.ts`

- Shopify API-Wrapper
- Verbindungstest
- Location-Abfrage

## Persistenz

### Konfiguration

- **electron-store:** Verschlüsselte Konfigurations-Speicherung
- **Token-Store:** Separate Token-Speicherung (verschlüsselt)

### Cache

- **SQLite:** Produkt-/Variant-Cache
- **Location:** App-Data-Verzeichnis

### Historie

- **JSON:** Sync-Historie (letzte 10 Syncs)
- **Location:** App-Data-Verzeichnis

## Sicherheit

### Token-Speicherung

- Access Tokens werden verschlüsselt gespeichert
- Separate Token-Store-Implementierung
- Keine Hardcoded Secrets

### IPC-Kommunikation

- Nur explizit definierte Channels
- Preload Script validiert alle Aufrufe
- Context Isolation aktiviert

## Weitere Informationen

- [Codebase-Tour](./codebase-tour.md)
- [Architecture Decision Records](../adr/)
- [Projektplan](../../PROJEKTPLAN.md)
