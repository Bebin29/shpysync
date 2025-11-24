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
- CSV-Datei-Upload und -Verarbeitung
- Shopify-Verbindung konfigurieren
- Spalten-Mapping (SKU, Name, Preis, Bestand)
- Vorschau der Updates vor Ausführung
- Echtzeit-Fortschrittsanzeige
- Logging und Fehlerbehandlung
- Automatische Synchronisation (optional)
- Mehrere Shop-Konfigurationen verwalten

---

## 🎯 MVP-Definition (v1.0)

**Ziel:** Minimale, aber vollständig funktionierende Version für den produktiven Einsatz.

### MVP-Funktionsumfang

#### ✅ Muss-Features (v1.0)

1. **Manuelle Synchronisation**
   - CSV-Upload (Drag & Drop oder Dateiauswahl)
   - Spalten-Mapping (SKU, Name, Preis, Bestand)
   - Vorschau der geplanten Updates
   - Bestätigung vor Ausführung
   - Echtzeit-Fortschrittsanzeige
   - Ergebnis-Report mit Erfolg/Fehler-Statistiken

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

#### ❌ Nicht im MVP (Post-MVP)

- **Automatische Synchronisation** (Phase 10) → v1.1
- **Multi-Shop-Management** → v1.2
- **Auto-Updater** (Teile von Phase 12) → v1.1
- **API-Version-Manager** (automatische Updates) → v1.2
- **Multi-Location-Support** → v1.2
- **E2E-Tests** (Unit- und Integration-Tests reichen für MVP) → v1.1

### MVP-Success-Kriterien

- ✅ CSV kann hochgeladen und verarbeitet werden
- ✅ Spalten können gemappt werden
- ✅ Vorschau zeigt alle geplanten Updates korrekt an
- ✅ Sync führt Updates erfolgreich aus (Preise + Bestände)
- ✅ Fehler werden benutzerfreundlich angezeigt
- ✅ Partial-Success funktioniert (einige Updates fehlgeschlagen, andere erfolgreich)
- ✅ Ergebnisse können exportiert werden
- ✅ Matching-Logik identisch zum Python-Skript (Paritäts-Tests bestehen)

---

## 🚀 Post-MVP Features (v1.1+)

### v1.1 - Automatisierung & Stabilität

- Automatische Synchronisation (Scheduler)
- Auto-Updater
- Erweiterte E2E-Tests
- Performance-Optimierungen

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

## 🔍 Analyse des Python-Skripts

### Kernfunktionalitäten

1. **CSV-Verarbeitung**
   - Robuste Encoding-Erkennung (UTF-8-SIG, UTF-8, CP1252, Latin1)
   - Semikolon-getrennte Dateien
   - Spalten-Mapping via Buchstaben (A, B, C, etc.)

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

## 🧩 Core-Domain-Layer

**Ziel:** Pure Business Logic, unabhängig von Electron/IPC, vollständig testbar.

### Struktur

```
core/
├── domain/
│   ├── types.ts              # Domain-Types (Product, Variant, CsvRow, etc.)
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
  id: string;              // Shopify GID
  title: string;
  variants: Variant[];
}

export interface Variant {
  id: string;              // Shopify GID
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
// core/domain/matching.ts
export function findVariantId(
  csvRow: CsvRow,
  products: Product[]
): MatchResult;

// core/domain/price-normalizer.ts
export function normalizePrice(price: string): string;

// core/domain/inventory-coalescing.ts
export function coalesceInventoryUpdates(
  updates: Array<{ inventoryItemId: string; quantity: number }>
): Array<{ inventoryItemId: string; quantity: number }>;

// core/domain/sync-pipeline.ts
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
├── core/                        # Core Domain Layer (pure Business Logic)
│   ├── domain/
│   │   ├── types.ts             # Domain-Types
│   │   ├── matching.ts          # Matching-Logik
│   │   ├── price-normalizer.ts  # Preis-Normalisierung
│   │   ├── inventory-coalescing.ts # Inventory-Koaleszierung
│   │   └── sync-pipeline.ts     # Sync-Pipeline
│   ├── infra/
│   │   ├── shopify/
│   │   │   └── client.ts        # Shopify API Client (abstrahiert)
│   │   └── csv/
│   │       └── parser.ts        # CSV-Parser (abstrahiert)
│   └── utils/
│       └── normalization.ts     # String-Normalisierung
├── electron/                    # Electron App Layer
│   ├── main.ts                  # Electron Main Process
│   ├── preload.ts               # Preload Script (getypte IPC)
│   ├── services/
│   │   ├── ipc-handlers.ts      # IPC-Handler
│   │   ├── shopify-service.ts   # Shopify Service (nutzt core/infra)
│   │   ├── csv-service.ts       # CSV Service (nutzt core/infra)
│   │   ├── sync-service.ts      # Sync Service (nutzt core/domain)
│   │   ├── cache-service.ts     # Cache-Management (SQLite)
│   │   ├── config-service.ts    # Config-Management (electron-store)
│   │   └── logger.ts            # Logging-Service
│   └── types/
│       └── ipc.ts                # IPC-Type-Definitionen
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
├── package.json
├── tsconfig.json
├── tailwind.config.ts
├── next.config.js
├── electron-builder.yml
└── README.md
```

---

## 🚀 Detaillierte Implementierungsphasen

### Phase 1: Projekt-Setup (1-2 Tage)

#### 1.1 Projekt initialisieren
```bash
# Next.js App erstellen
npx create-next-app@latest wawisync-app --typescript --tailwind --app

# Electron hinzufügen
npm install --save-dev electron electron-builder
npm install electron-store

# Dependencies installieren
npm install zod react-hook-form @hookform/resolvers
npm install lucide-react
npm install zustand
npm install csv-parse
npm install axios
```

#### 1.2 Electron-Integration
- `electron/main.ts` erstellen
- `electron/preload.ts` erstellen
- Next.js Dev-Server mit Electron verbinden
- IPC-Channels definieren

#### 1.3 Basis-Konfiguration
- TypeScript-Konfiguration
- ESLint & Prettier
- Tailwind CSS Setup
- shadcn/ui initialisieren

**Deliverables:**
- ✅ Electron-App startet
- ✅ Next.js UI wird angezeigt
- ✅ IPC-Kommunikation funktioniert

---

### Phase 2: UI-Grundgerüst (2-3 Tage)

#### 2.1 Layout & Navigation
- Sidebar-Navigation
- Header mit Status-Indikator
- Responsive Design

#### 2.2 Hauptseiten
- **Dashboard:** Übersicht, letzte Syncs, Statistiken
- **Sync:** CSV-Upload, Mapping, Vorschau, Ausführung
- **Settings:** Shop-Konfiguration, Spalten-Mapping, Einstellungen

#### 2.3 Basis-Komponenten
- Button, Input, Select (shadcn/ui)
- Card, Dialog, Alert
- Table für Datenanzeige
- Progress-Bar

**Deliverables:**
- ✅ Vollständiges UI-Layout
- ✅ Navigation zwischen Seiten
- ✅ Basis-Komponenten integriert

---

### Phase 3: Backend-Services (4-6 Tage) ⚠️ Puffer: +50%

**Hinweis:** Diese Phase trägt die meiste Komplexität. Puffer von +50% empfohlen.

#### 3.0 Shopify API-Vorbereitung
- GraphiQL Explorer testen (https://shopify.dev/api/usage/api-exploration/admin-graphiql-explorer)
- Queries/Mutations validieren
- API-Version `2025-10` konfigurieren
- Rate-Limit-Tests durchführen
- API-Version-Verwaltung implementieren (für zukünftige Updates)

#### 3.1 Shopify GraphQL Admin API Client
```typescript
// electron/services/shopify-client.ts

// API-Konfiguration
const API_VERSION = "2025-10"; // Aktuelle Version (Januar 2025)
const API_ENDPOINT = `${shopUrl}/admin/api/${API_VERSION}/graphql.json`;

// Authentifizierung
- X-Shopify-Access-Token Header
- Erforderliche Scopes:
  * read_products (Produkte lesen)
  * write_products (Preise aktualisieren)
  * read_inventory (Bestände lesen)
  * write_inventory (Bestände aktualisieren)
  * read_locations (Locations lesen)

// Rate-Limit-Handling
- X-Shopify-Shop-Api-Call-Limit Header auswerten
- Format: "40/40" (verwendet/limit)
- Bei 429 (Too Many Requests): Retry-After Header beachten
- Exponential Backoff implementieren

// Cost-Tracking
- X-Request-Cost Header auswerten
- GraphQL Query Cost optimieren
- Batch-Queries verwenden wo möglich

// Retry-Logik
- Exponential Backoff (wie im Python-Skript)
- Max 5 Retries
- Backoff-Factor: 1.5
- Retry bei: 429, 500-599

// GraphQL Queries
- Produkt-Abruf (Cursor-Pagination, max 250/Seite)
- Location-Abruf (Cursor-Pagination)
- Preis-Updates (productVariantsBulkUpdate - Bulk)
- Inventory-Updates (inventorySetQuantities - Batches von 250)

// Fehlerbehandlung
- GraphQL Errors auswerten
- UserErrors von Mutations behandeln
- Network-Errors retryen
```

#### 3.2 CSV-Parser
```typescript
// electron/services/csv-parser.ts
- Encoding-Erkennung (UTF-8-SIG, UTF-8, CP1252, Latin1)
- Semikolon-Trennung
- Spalten-Mapping
- Validierung
- Fehlerbehandlung
```

#### 3.3 Matching-Logik
```typescript
// electron/services/matching-service.ts
- SKU-Matching
- Name-Normalisierung (wie _norm)
- Name-Matching (exakt, Prefix, Kombination)
- Barcode-Matching
- Variant-zu-Product-Mapping
```

#### 3.4 Preis-Normalisierung
```typescript
// electron/services/price-normalizer.ts
- normalize_price_to_money_str portieren
- Verschiedene Formate unterstützen
- Währungszeichen entfernen
- 2 Dezimalstellen formatieren
```

**Deliverables:**
- ✅ Shopify API Client funktioniert mit Version `2025-10`
- ✅ Rate-Limit-Handling implementiert
- ✅ Cost-Tracking implementiert
- ✅ CSV wird korrekt geparst
- ✅ Matching-Logik identisch zum Python-Skript
- ✅ API-Scopes dokumentiert und validiert

---

### Phase 4: Konfigurations-Management (2 Tage)

#### 4.1 Config Manager
```typescript
// electron/services/config-manager.ts
- Shop-Konfigurationen speichern
- Spalten-Mapping speichern
- Standardwerte setzen
- Validierung
```

#### 4.2 Settings-UI
- Shop-Konfiguration (URL, Token)
  - URL-Validierung (`.myshopify.com` Domain)
  - Token-Format-Validierung (`shpat_` oder `shpca_`)
  - Verbindungstest-Button
  - Rate-Limit-Status anzeigen
- Spalten-Mapping-Editor
- Location-Auswahl (mit Live-Abruf von Shopify)
- Auto-Sync-Einstellungen
- API-Version-Anzeige (Info)

**Deliverables:**
- ✅ Konfigurationen werden persistiert
- ✅ Settings-UI vollständig funktional

---

### Phase 5: CSV-Upload & Mapping (2-3 Tage)

#### 5.1 CSV-Upload-Komponente
- Drag & Drop
- Datei-Auswahl
- Encoding-Erkennung anzeigen
- Vorschau der ersten Zeilen

#### 5.2 Spalten-Mapping
- Automatische Spalten-Erkennung
- Dropdown-Auswahl für jede Spalte
- Validierung (alle erforderlichen Spalten)
- Vorschau der gemappten Daten

**Deliverables:**
- ✅ CSV kann hochgeladen werden
- ✅ Spalten können gemappt werden
- ✅ Mapping wird validiert

---

### Phase 6: Sync-Engine (4-6 Tage) ⚠️ Puffer: +50%

**Hinweis:** Kritische Phase mit komplexer Business-Logik. Puffer empfohlen.

#### 6.1 Sync-Engine
```typescript
// electron/services/sync-engine.ts
- CSV verarbeiten
- Produkte von Shopify laden
- Matching durchführen
- Updates sammeln
- Koaleszierung (Inventory)
- Bulk-Updates ausführen
- Fortschritt via IPC senden
```

#### 6.2 IPC-Handlers
- `sync:start` - Sync starten
- `sync:progress` - Fortschritt senden
- `sync:log` - Log-Nachrichten
- `sync:complete` - Sync abgeschlossen
- `sync:cancel` - Sync abbrechen

**Deliverables:**
- ✅ Sync-Engine funktioniert
- ✅ Fortschritt wird in Echtzeit angezeigt
- ✅ Logs werden angezeigt

---

### Phase 7: Vorschau & Bestätigung (2-3 Tage)

#### 7.1 Vorschau-Tabelle
- Alle Updates anzeigen
- Filterung (Preise, Bestände, Erfolgreich, Fehlgeschlagen)
- Suche (nach SKU, Name)
- Sortierung
- **Nicht gematchte Zeilen prominent anzeigen**
  - Eigener Tab/Filter "Nicht gematcht (X Zeilen)"
  - Export-Funktion: CSV mit nur nicht-gematchten Zeilen

#### 7.2 Bestätigungs-Dialog
- Zusammenfassung (Anzahl Updates)
- Warnungen (Duplikate, Fehler)
- Bestätigung erforderlich
- **Trockenlauf-Option:** Checkbox "Dry Run" (nur Vorschau, keine Mutation)

#### 7.3 Export-Funktionen
- Sync-Ergebnisse als CSV exportieren
  - Spalten: Zeit, SKU, Name, Alter Wert, Neuer Wert, Status, Fehlermeldung
- Nicht-gematchte Zeilen als CSV exportieren
- Logs exportieren (Text-Datei)

**Deliverables:**
- ✅ Vorschau zeigt alle Updates
- ✅ Nicht-gematchte Zeilen prominent
- ✅ Bestätigung vor Ausführung
- ✅ Export-Funktionen implementiert

---

### Phase 8: Fortschrittsanzeige & Logging (2 Tage)

#### 8.1 Fortschrittsanzeige
- Progress-Bar
- Aktuelle Aktion anzeigen
- Geschätzte Zeit
- Abbrechen-Button

#### 8.2 Log-Viewer
- Echtzeit-Logs
- Filterung (Info, Warning, Error)
- Export-Funktion
- Farbcodierung

**Deliverables:**
- ✅ Fortschritt wird angezeigt
- ✅ Logs werden in Echtzeit angezeigt

---

### Phase 9: Fehlerbehandlung & Validierung (3-4 Tage) ⚠️ Puffer: +50%

**Hinweis:** Fehlerbehandlung ist komplex. Puffer empfohlen.

#### 9.1 Validierung
- CSV-Format prüfen
- Spalten-Existenz prüfen
- Shop-Verbindung testen
- Location-Existenz prüfen

#### 9.2 Fehlerbehandlung
- Fehler-Messages anzeigen
- Retry-Mechanismen
- Fehler-Logging
- Benutzerfreundliche Fehlermeldungen

**Deliverables:**
- ✅ Alle Validierungen implementiert
- ✅ Fehler werden benutzerfreundlich angezeigt

---

### Phase 10: Automatische Synchronisation (optional, 2-3 Tage)

#### 10.1 Scheduler
- Intervall-basierte Syncs
- Cron-ähnliche Syntax
- Aktivierung/Deaktivierung

#### 10.2 Background-Sync
- Sync im Hintergrund
- Benachrichtigungen
- Status-Indikator

**Deliverables:**
- ✅ Automatische Syncs funktionieren
- ✅ Benachrichtigungen werden angezeigt

---

### Phase 11: Testing & Qualitätssicherung (3-4 Tage)

#### 11.1 Unit-Tests
- Services testen
- Matching-Logik testen
- Preis-Normalisierung testen

#### 11.2 Integration-Tests
- CSV-Parsing testen
- Shopify API-Integration testen
- Sync-Engine testen

#### 11.3 E2E-Tests
- Vollständiger Sync-Workflow
- UI-Interaktionen

**Deliverables:**
- ✅ Test-Coverage > 80%
- ✅ Alle kritischen Pfade getestet

---

### Phase 12: Build & Distribution (2 Tage)

#### 12.1 Electron Builder
- Windows-Build konfigurieren
- macOS-Build konfigurieren
- Linux-Build konfigurieren
- Icons & Assets

#### 12.2 Auto-Updates
- Update-Server konfigurieren
- Update-Check implementieren
- Update-Installation

**Deliverables:**
- ✅ Installer für alle Plattformen
- ✅ Auto-Updates funktionieren

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

| Scope | Zweck |
|-------|-------|
| `read_products` | Produkte und Varianten lesen |
| `write_products` | Preise aktualisieren |
| `read_inventory` | Bestände lesen |
| `write_inventory` | Bestände aktualisieren |
| `read_locations` | Locations lesen |

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
mutation UpdateVariantPrices(
  $productId: ID!
  $variants: [ProductVariantsBulkInput!]!
) {
  productVariantsBulkUpdate(
    productId: $productId
    variants: $variants
    allowPartialUpdates: true
  ) {
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
ipcRenderer.invoke('sync:start', {
  csvPath: string,
  mapping: ColumnMapping,
  config: ShopConfig
})

// Main → Renderer
ipcMain.on('sync:progress', (event, progress) => {
  // Fortschritt senden
})

ipcMain.on('sync:log', (event, log) => {
  // Log-Nachricht senden
})

ipcMain.on('sync:complete', (event, result) => {
  // Ergebnis senden
})
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
   test('matching logic matches Python script', () => {
     const csvRow = loadFixture('sample.csv')[0];
     const products = loadFixture('sample-products.json');
     const expected = loadFixture('expected-outputs.json')[0];
     
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
  id: string;                    // UUID
  name: string;                  // "Filiale X" (benutzerdefiniert)
  shopUrl: string;               // https://...myshopify.com
  accessTokenId: string;         // Referenz auf verschlüsselten Token
  defaultLocationId?: string;   // Standard-Location
  columnMapping: ColumnMapping;  // Standard-Spalten-Mapping
  createdAt: string;            // ISO-Date
  updatedAt: string;            // ISO-Date
  isDefault: boolean;           // Standard-Shop
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
    contextIsolation: true,      // ✅ WICHTIG: Verhindert XSS → RCE
    nodeIntegration: false,       // ✅ WICHTIG: Kein direkter Node-Zugriff
    preload: path.join(__dirname, 'preload.js')
  }
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
- ✅ CSV-Upload funktioniert
- ✅ Spalten-Mapping funktioniert
- ✅ Matching identisch zum Python-Skript
- ✅ Updates werden korrekt ausgeführt
- ✅ Fortschritt wird angezeigt
- ✅ Fehler werden behandelt

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
     * `products` Query (Cursor-Pagination)
     * `locations` Query (Cursor-Pagination)
     * `productVariantsBulkUpdate` Mutation
     * `inventorySetQuantities` Mutation
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
**Version:** 2.0
**Status:** Planungsphase (MVP-fokussiert)

