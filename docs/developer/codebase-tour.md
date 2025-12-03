# Codebase-Tour

Diese Tour führt Sie durch die wichtigsten Teile der WAWISync-Codebase.

## Projektstruktur

```
shpysync/
├── app/                    # Next.js App Router (Frontend)
│   ├── components/        # React-Komponenten
│   ├── hooks/             # Custom React Hooks
│   ├── stores/            # Zustand State Management
│   ├── types/             # TypeScript-Typen
│   └── page.tsx           # Seiten
├── electron/               # Electron Main Process
│   ├── main.ts            # Electron Entry Point
│   ├── preload.ts         # Preload Script (IPC Bridge)
│   ├── services/          # Backend-Services
│   └── types/             # IPC-Type-Definitionen
├── core/                   # Core Domain Layer
│   ├── domain/            # Domain-Logik
│   └── infra/              # Infrastructure
├── tests/                  # Test-Suite
│   ├── unit/              # Unit-Tests
│   ├── integration/        # Integration-Tests
│   └── parity/            # Paritäts-Tests
└── docs/                   # Dokumentation
```

## Wichtige Dateien

### Electron Entry Point

**`electron/main.ts`**

- Electron-App-Lifecycle
- Window-Erstellung
- IPC-Handler-Registrierung
- Security-Konfiguration

### Preload Script

**`electron/preload.ts`**

- Exponiert Electron-API im Renderer
- TypeScript-Typen für IPC
- Sichere API-Exposition

### IPC Handlers

**`electron/services/ipc-handlers.ts`**

- Alle IPC-Handler-Registrierungen
- Request/Response-Handling
- Fehlerbehandlung

### Sync Engine

**`electron/services/sync-engine.ts`**

- Synchronisations-Orchestrierung
- Progress-Event-Management
- Nutzt Core Domain Layer

### Core Domain

**`core/domain/`**

- **matching.ts:** Produkt-Matching-Logik
- **price-normalizer.ts:** Preis-Normalisierung
- **inventory-coalescing.ts:** Inventory-Koaleszierung
- **sync-pipeline.ts:** Sync-Pipeline
- **validators.ts:** Validierungs-Logik

### Infrastructure

**`core/infra/`**

- **shopify/client.ts:** Shopify API Client
- **csv/parser.ts:** CSV-Parser
- **dbf/parser.ts:** DBF-Parser
- **file-parser/index.ts:** Unified File Parser

## UI-Komponenten

### Sync-Seite

**`app/sync/page.tsx`**

- Wizard-basierter Sync-Workflow
- CSV-Upload
- Spalten-Mapping
- Vorschau
- Sync-Ausführung

### Settings-Seite

**`app/settings/page.tsx`**

- Shop-Konfiguration
- Auto-Sync-Einstellungen
- Update-Einstellungen

### Dashboard

**`app/page.tsx`**

- Statistiken
- Sync-Historie
- Cache-Status

## Hooks

### use-electron

**`app/hooks/use-electron.ts`**

- Electron-API-Zugriff
- IPC-Kommunikation
- Event-Handling

### use-sync

**`app/hooks/use-sync.ts`**

- Sync-State-Management
- Progress-Tracking
- Ergebnis-Handling

## Services

### Config Service

**`electron/services/config-service.ts`**

- App-Konfiguration
- Shop-Konfiguration
- Spalten-Mapping
- electron-store-Integration

### Cache Service

**`electron/services/cache-service.ts`**

- SQLite-Cache-Verwaltung
- Produkt-/Variant-Cache
- Cache-Statistiken

### Shopify Service

**`electron/services/shopify-service.ts`**

- Verbindungstest
- Location-Abfrage
- API-Wrapper

## Tests

### Unit-Tests

**`tests/unit/`**

- Domain-Logik-Tests
- Service-Tests
- Utility-Tests

### Integration-Tests

**`tests/integration/`**

- Service-Integration-Tests
- IPC-Tests
- End-to-End-Flows

### Paritäts-Tests

**`tests/parity/`**

- Vergleich mit Python-Skript
- Matching-Logik-Parität
- Preis-Normalisierung-Parität

## Nächste Schritte

- [Architektur-Übersicht](./architecture.md)
- [Entwicklungsworkflow](./workflow.md)
- [Debugging-Guide](./debugging.md)
