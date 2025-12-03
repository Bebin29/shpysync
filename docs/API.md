# API-Dokumentation

Diese Dokumentation beschreibt die IPC-API (Inter-Process Communication) zwischen dem Renderer-Prozess (Frontend) und dem Main-Prozess (Backend) in WAWISync.

## Übersicht

WAWISync verwendet Electron's IPC-Mechanismus für die Kommunikation zwischen Frontend und Backend. Alle kritischen Operationen laufen über den Main-Prozess, während das Frontend (Renderer) nur über explizit definierte IPC-Channels kommuniziert.

## Sicherheit

- **Context Isolation:** Aktiviert - Verhindert XSS → RCE Angriffe
- **Node Integration:** Deaktiviert - Kein direkter Node-Zugriff im Renderer
- **Preload Script:** Exponiert nur explizit definierte API-Methoden
- **IPC-Channels:** Alle Channels sind explizit registriert

## API-Struktur

Die API ist über `window.electron` im Renderer-Prozess verfügbar:

```typescript
// TypeScript-Definition
declare global {
  interface Window {
    electron: ElectronAPI;
  }
}
```

## IPC-Channels

### Test & App Info

#### `ping`

Test-Funktion zur Überprüfung der IPC-Verbindung.

**Renderer:**

```typescript
const response = await window.electron.ping();
// Returns: "pong"
```

**Main Process Handler:**

- Channel: `ping`
- Returns: `Promise<string>`

---

#### `getVersion`

Gibt die aktuelle App-Version zurück.

**Renderer:**

```typescript
const version = await window.electron.getVersion();
// Returns: "1.0.3"
```

**Main Process Handler:**

- Channel: `app:version`
- Returns: `Promise<string>`

---

## Sync-API

### `sync.preview`

Generiert eine Vorschau der geplanten Sync-Operationen ohne Ausführung.

**Renderer:**

```typescript
const preview = await window.electron.sync.preview({
  csvPath: "/path/to/file.csv",
  columnMapping: {
    sku: "A",
    name: "B",
    price: "C",
    stock: "D",
  },
  shopConfig: {
    shopUrl: "https://shop.myshopify.com",
    accessToken: "shpat_...",
    locationId: "gid://shopify/Location/123",
    locationName: "Hauptlager",
  },
  options: {
    updatePrices: true,
    updateInventory: true,
  },
});
```

**Request Type:** `SyncPreviewRequest`

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
```

**Response Type:** `SyncPreviewResponse`

```typescript
interface SyncPreviewResponse {
  success: boolean;
  data?: {
    planned: PlannedOperation[];
    unmatchedRows: Array<{
      rowNumber: number;
      sku: string;
      name: string;
      price?: string;
      stock?: number;
    }>;
  };
  error?: string;
  errorCode?: string;
  errorSeverity?: "info" | "warning" | "error" | "fatal";
}
```

**Main Process Handler:**

- Channel: `sync:preview`
- Returns: `Promise<SyncPreviewResponse>`

---

### `sync.start`

Startet eine Synchronisation.

**Renderer:**

```typescript
const result = await window.electron.sync.start({
  csvPath: "/path/to/file.csv",
  columnMapping: {
    sku: "A",
    name: "B",
    price: "C",
    stock: "D",
  },
  shopConfig: {
    shopUrl: "https://shop.myshopify.com",
    accessToken: "shpat_...",
    locationId: "gid://shopify/Location/123",
    locationName: "Hauptlager",
  },
  options: {
    updatePrices: true,
    updateInventory: true,
    dryRun: false, // Optional
  },
});
```

**Request Type:** `SyncStartConfig`

```typescript
interface SyncStartConfig {
  csvPath: string;
  columnMapping: ColumnMapping;
  shopConfig: ShopConfig;
  options: {
    updatePrices: boolean;
    updateInventory: boolean;
    dryRun?: boolean;
  };
}
```

**Response:**

```typescript
{
  success: boolean;
  message?: string;
  error?: string;
}
```

**Events:**

- `sync:progress` - Fortschritts-Updates
- `sync:log` - Log-Nachrichten
- `sync:complete` - Sync abgeschlossen

**Main Process Handler:**

- Channel: `sync:start`
- Returns: `Promise<{ success: boolean; message?: string; error?: string }>`

---

### `sync.test`

Führt einen Test-Sync für einen einzelnen Artikel durch.

**Renderer:**

```typescript
const result = await window.electron.sync.test({
  shopConfig: {
    shopUrl: "https://shop.myshopify.com",
    accessToken: "shpat_...",
    locationId: "gid://shopify/Location/123",
    locationName: "Hauptlager",
  },
  plannedOperations: [
    /* PlannedOperation[] */
  ],
});
```

**Request Type:** `SyncTestRequest`

**Response:**

```typescript
{
  success: boolean;
  message?: string;
  error?: string;
}
```

**Main Process Handler:**

- Channel: `sync:test`
- Returns: `Promise<{ success: boolean; message?: string; error?: string }>`

---

### `sync.cancel`

Bricht eine laufende Synchronisation ab.

**Renderer:**

```typescript
const result = await window.electron.sync.cancel();
```

**Response:**

```typescript
{
  success: boolean;
  message?: string;
  error?: string;
}
```

**Main Process Handler:**

- Channel: `sync:cancel`
- Returns: `Promise<{ success: boolean; message?: string; error?: string }>`

---

### Sync Events

#### `sync.onProgress`

Registriert einen Callback für Fortschritts-Updates.

**Renderer:**

```typescript
window.electron.sync.onProgress((progress: SyncProgress) => {
  console.log(`Progress: ${progress.current}/${progress.total}`);
  console.log(`Stage: ${progress.stage}`);
  console.log(`Message: ${progress.message}`);
});
```

**Event Type:** `SyncProgress`

```typescript
interface SyncProgress {
  current: number;
  total: number;
  stage: "matching" | "updating-prices" | "updating-inventory" | "complete";
  message: string;
}
```

---

#### `sync.onLog`

Registriert einen Callback für Log-Nachrichten.

**Renderer:**

```typescript
window.electron.sync.onLog((log: SyncLog) => {
  console.log(`[${log.level}] ${log.category}: ${log.message}`);
});
```

**Event Type:** `SyncLog`

```typescript
interface SyncLog {
  id: string;
  level: "debug" | "info" | "warn" | "error";
  category:
    | "csv"
    | "shopify"
    | "matching"
    | "inventory"
    | "price"
    | "system"
    | "cache"
    | "history"
    | "sync"
    | "update";
  message: string;
  timestamp: string;
  context?: Record<string, unknown>;
}
```

---

#### `sync.onComplete`

Registriert einen Callback für Sync-Abschluss.

**Renderer:**

```typescript
window.electron.sync.onComplete((result: SyncResult) => {
  console.log(`Total: ${result.totalPlanned}`);
  console.log(`Success: ${result.totalSuccess}`);
  console.log(`Failed: ${result.totalFailed}`);
});
```

**Event Type:** `SyncResult`

```typescript
interface SyncResult {
  totalPlanned: number;
  totalExecuted: number;
  totalSuccess: number;
  totalFailed: number;
  totalSkipped: number;
  operations: OperationResult[];
  planned?: PlannedOperation[];
  startTime: string;
  endTime?: string;
  duration?: number;
}
```

---

## Config-API

### `config.get`

Gibt die gesamte App-Konfiguration zurück.

**Renderer:**

```typescript
const config = await window.electron.config.get();
```

**Response Type:** `AppConfig`

```typescript
interface AppConfig {
  shop: ShopConfigStored | null;
  defaultColumnMapping: ColumnMapping | null;
  apiVersion?: string;
  autoSync: {
    enabled: boolean;
    interval?: number;
    csvPath?: string;
    dbfPath?: string;
    schedule?: string;
  };
  defaultCsvPath?: string;
  defaultDbfPath?: string;
  update: {
    autoCheckEnabled: boolean;
    autoCheckInterval: number;
  };
}
```

**Main Process Handler:**

- Channel: `config:get`
- Returns: `Promise<AppConfig>`

---

### `config.set`

Setzt die gesamte App-Konfiguration.

**Renderer:**

```typescript
await window.electron.config.set(config);
```

**Main Process Handler:**

- Channel: `config:set`
- Returns: `Promise<void>`

---

### `config.getShop`

Gibt die aktuelle Shop-Konfiguration zurück (mit Access-Token).

**Renderer:**

```typescript
const shopConfig = await window.electron.config.getShop();
```

**Response Type:** `ShopConfig | null`

```typescript
interface ShopConfig {
  shopUrl: string;
  accessToken: string;
  locationId: string;
  locationName: string;
}
```

**Main Process Handler:**

- Channel: `config:get-shop`
- Returns: `Promise<ShopConfig | null>`

---

### `config.setShop`

Setzt die Shop-Konfiguration.

**Renderer:**

```typescript
await window.electron.config.setShop({
  shopUrl: "https://shop.myshopify.com",
  accessToken: "shpat_...",
  locationId: "gid://shopify/Location/123",
  locationName: "Hauptlager",
});
```

**Main Process Handler:**

- Channel: `config:set-shop`
- Returns: `Promise<void>`

---

### `config.getColumnMapping`

Gibt das Standard-Spalten-Mapping zurück.

**Renderer:**

```typescript
const mapping = await window.electron.config.getColumnMapping();
```

**Response Type:** `ColumnMapping | null`

```typescript
interface ColumnMapping {
  sku: string; // Spaltenbuchstabe (z.B. "A", "B", "AB")
  name: string;
  price: string;
  stock: string;
}
```

**Main Process Handler:**

- Channel: `config:get-column-mapping`
- Returns: `Promise<ColumnMapping | null>`

---

### `config.setColumnMapping`

Setzt das Standard-Spalten-Mapping.

**Renderer:**

```typescript
await window.electron.config.setColumnMapping({
  sku: "A",
  name: "B",
  price: "C",
  stock: "D",
});
```

**Main Process Handler:**

- Channel: `config:set-column-mapping`
- Returns: `Promise<void>`

---

### `config.testConnection`

Testet die Verbindung zu einem Shopify-Shop.

**Renderer:**

```typescript
const result = await window.electron.config.testConnection({
  shopUrl: "https://shop.myshopify.com",
  accessToken: "shpat_...",
  locationId: "gid://shopify/Location/123",
  locationName: "Hauptlager",
});
```

**Response:**

```typescript
{
  success: boolean;
  message?: string;
  errorCode?: string;
  errorSeverity?: "info" | "warning" | "error" | "fatal";
}
```

**Main Process Handler:**

- Channel: `config:test-connection`
- Returns: `Promise<{ success: boolean; message?: string; errorCode?: string; errorSeverity?: string }>`

---

### `config.getLocations`

Gibt alle verfügbaren Locations eines Shopify-Shops zurück.

**Renderer:**

```typescript
const locations = await window.electron.config.getLocations({
  shopUrl: "https://shop.myshopify.com",
  accessToken: "shpat_...",
  locationId: "gid://shopify/Location/123",
  locationName: "Hauptlager",
});
```

**Response:**

```typescript
Array<{
  id: string;
  name: string;
}>;
```

**Main Process Handler:**

- Channel: `config:get-locations`
- Returns: `Promise<Array<{ id: string; name: string }>>`

---

## CSV-API

### `csv.selectFile`

Öffnet einen Dateiauswahl-Dialog für CSV/DBF-Dateien.

**Renderer:**

```typescript
const result = await window.electron.csv.selectFile();
```

**Response:**

```typescript
{
  success: boolean;
  filePath: string | null;
  error?: string;
}
```

**Main Process Handler:**

- Channel: `csv:select-file`
- Returns: `Promise<{ success: boolean; filePath: string | null; error?: string }>`

---

### `csv.getHeaders`

Gibt die Header einer CSV/DBF-Datei zurück.

**Renderer:**

```typescript
const result = await window.electron.csv.getHeaders("/path/to/file.csv");
```

**Response:**

```typescript
{
  success: boolean;
  headers: string[];
  encoding: string;
  fileType: "csv" | "dbf";
  error?: string;
  errorCode?: string;
  errorSeverity?: string;
}
```

**Main Process Handler:**

- Channel: `csv:get-headers`
- Returns: `Promise<{ success: boolean; headers: string[]; encoding: string; fileType: string; error?: string; errorCode?: string; errorSeverity?: string }>`

---

### `csv.preview`

Gibt eine Vorschau der CSV/DBF-Datei mit Mapping zurück.

**Renderer:**

```typescript
const preview = await window.electron.csv.preview({
  filePath: "/path/to/file.csv",
  mapping: {
    sku: "A",
    name: "B",
    price: "C",
    stock: "D",
  },
  maxRows: 200, // Optional
});
```

**Response Type:** `CsvPreviewResponse`

```typescript
interface CsvPreviewResponse {
  success: boolean;
  data?: {
    headers: string[];
    encoding: string;
    totalRows: number;
    previewRows: Array<{
      rowNumber: number;
      sku: string;
      name: string;
      price: string;
      stock: number;
      rawData: Record<string, string>;
    }>;
    columnMapping: ColumnMapping;
    columnNameToLetter: Record<string, string>;
    fileType: "csv" | "dbf";
  };
  error?: string;
  errorCode?: string;
  errorSeverity?: "info" | "warning" | "error" | "fatal";
}
```

**Main Process Handler:**

- Channel: `csv:preview`
- Returns: `Promise<CsvPreviewResponse>`

---

## Auto-Sync-API

### `autoSync.getStatus`

Gibt den aktuellen Status des Auto-Sync-Services zurück.

**Renderer:**

```typescript
const status = await window.electron.autoSync.getStatus();
```

**Response Type:** `AutoSyncStatus`

```typescript
interface AutoSyncStatus {
  running: boolean;
  nextSync?: string; // ISO-Date-String
  lastSync?: string; // ISO-Date-String
  error?: string;
}
```

**Main Process Handler:**

- Channel: `autoSync:getStatus`
- Returns: `Promise<AutoSyncStatus>`

---

### `autoSync.start`

Startet den Auto-Sync-Service.

**Renderer:**

```typescript
const result = await window.electron.autoSync.start();
```

**Response:**

```typescript
{
  success: boolean;
  error?: string;
}
```

**Main Process Handler:**

- Channel: `autoSync:start`
- Returns: `Promise<{ success: boolean; error?: string }>`

---

### `autoSync.stop`

Stoppt den Auto-Sync-Service.

**Renderer:**

```typescript
const result = await window.electron.autoSync.stop();
```

**Response:**

```typescript
{
  success: boolean;
  error?: string;
}
```

**Main Process Handler:**

- Channel: `autoSync:stop`
- Returns: `Promise<{ success: boolean; error?: string }>`

---

### `autoSync.getConfig`

Gibt die Auto-Sync-Konfiguration zurück.

**Renderer:**

```typescript
const config = await window.electron.autoSync.getConfig();
```

**Response Type:** `AppConfig["autoSync"]`

**Main Process Handler:**

- Channel: `autoSync:getConfig`
- Returns: `Promise<AppConfig["autoSync"]>`

---

### `autoSync.setConfig`

Setzt die Auto-Sync-Konfiguration.

**Renderer:**

```typescript
const result = await window.electron.autoSync.setConfig({
  enabled: true,
  interval: 60, // Minuten
  csvPath: "/path/to/file.csv",
});
```

**Response:**

```typescript
{
  success: boolean;
  error?: string;
}
```

**Main Process Handler:**

- Channel: `autoSync:setConfig`
- Returns: `Promise<{ success: boolean; error?: string }>`

---

## Cache-API

**WICHTIG:** Der Cache wird NUR für Dashboard-Statistiken verwendet, nicht im Sync-Prozess!

### `cache.getStats`

Gibt Cache-Statistiken zurück.

**Renderer:**

```typescript
const stats = await window.electron.cache.getStats();
```

**Response Type:** `CacheStats`

```typescript
interface CacheStats {
  productCount: number;
  variantCount: number;
  lastUpdate: string | null;
  schemaVersion: number;
  dbPath: string;
}
```

**Main Process Handler:**

- Channel: `cache:get-stats`
- Returns: `Promise<CacheStats>`

---

### `cache.rebuild`

Baut den Cache neu auf (lädt alle Produkte von Shopify).

**Renderer:**

```typescript
await window.electron.cache.rebuild();
```

**Main Process Handler:**

- Channel: `cache:rebuild`
- Returns: `Promise<void>`

---

### `cache.clear`

Löscht den Cache.

**Renderer:**

```typescript
await window.electron.cache.clear();
```

**Main Process Handler:**

- Channel: `cache:clear`
- Returns: `Promise<void>`

---

## Dashboard-API

### `dashboard.getStats`

Gibt Dashboard-Statistiken zurück.

**Renderer:**

```typescript
const stats = await window.electron.dashboard.getStats();
```

**Response Type:** `DashboardStats`

```typescript
interface DashboardStats {
  totalProducts: number; // Aus Cache
  totalVariants: number; // Aus Cache
  lastSync: string | null; // Aus Historie
  syncSuccess: number; // Letzte 10 Syncs
  syncFailed: number; // Letzte 10 Syncs
  cacheLastUpdate: string | null; // Aus Cache
}
```

**Main Process Handler:**

- Channel: `dashboard:get-stats`
- Returns: `Promise<DashboardStats>`

---

### `dashboard.getHistory`

Gibt die Sync-Historie zurück.

**Renderer:**

```typescript
const history = await window.electron.dashboard.getHistory(10); // Optional: Limit
```

**Response Type:** `SyncHistoryEntry[]`

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

**Main Process Handler:**

- Channel: `dashboard:get-history`
- Returns: `Promise<SyncHistoryEntry[]>`

---

## Update-API

### `update.check`

Prüft auf verfügbare Updates.

**Renderer:**

```typescript
const result = await window.electron.update.check();
```

**Response:**

```typescript
{
  success: boolean;
  error?: string;
}
```

**Main Process Handler:**

- Channel: `update:check`
- Returns: `Promise<{ success: boolean; error?: string }>`

---

### `update.download`

Lädt ein verfügbares Update herunter.

**Renderer:**

```typescript
const result = await window.electron.update.download();
```

**Response:**

```typescript
{
  success: boolean;
  error?: string;
}
```

**Main Process Handler:**

- Channel: `update:download`
- Returns: `Promise<{ success: boolean; error?: string }>`

---

### `update.install`

Installiert ein heruntergeladenes Update.

**Renderer:**

```typescript
const result = await window.electron.update.install();
```

**Response:**

```typescript
{
  success: boolean;
  error?: string;
}
```

**Main Process Handler:**

- Channel: `update:install`
- Returns: `Promise<{ success: boolean; error?: string }>`

---

### `update.getStatus`

Gibt den aktuellen Update-Status zurück.

**Renderer:**

```typescript
const status = await window.electron.update.getStatus();
```

**Response Type:** `UpdateStatus`

```typescript
interface UpdateStatus {
  checking: boolean;
  available: boolean;
  downloaded: boolean;
  downloading: boolean;
  progress: number;
  error: string | null;
  info: UpdateInfo | null;
}
```

**Main Process Handler:**

- Channel: `update:get-status`
- Returns: `Promise<UpdateStatus>`

---

### Update Events

#### `update.onChecking`

Registriert einen Callback für Update-Check-Events.

**Renderer:**

```typescript
window.electron.update.onChecking(() => {
  console.log("Checking for updates...");
});
```

---

#### `update.onAvailable`

Registriert einen Callback für verfügbare Updates.

**Renderer:**

```typescript
window.electron.update.onAvailable((info: UpdateInfo) => {
  console.log(`Update available: ${info.version}`);
});
```

**Event Type:** `UpdateInfo`

```typescript
interface UpdateInfo {
  version: string;
  releaseDate: string;
  releaseNotes?: string;
}
```

---

#### `update.onDownloadProgress`

Registriert einen Callback für Download-Fortschritt.

**Renderer:**

```typescript
window.electron.update.onDownloadProgress((progress) => {
  console.log(`Download: ${progress.percent}%`);
});
```

---

## Fehlerbehandlung

Alle API-Methoden können Fehler zurückgeben. Die Fehlerstruktur folgt diesem Format:

```typescript
{
  success: false;
  error?: string; // Benutzerfreundliche Fehlermeldung
  errorCode?: string; // Maschinenlesbarer Fehlercode
  errorSeverity?: "info" | "warning" | "error" | "fatal";
}
```

**Fehlercodes:**

- `CONFIG_INVALID` - Konfiguration ungültig
- `SHOPIFY_API_ERROR` - Shopify API-Fehler
- `FILE_NOT_FOUND` - Datei nicht gefunden
- `SYNC_IN_PROGRESS` - Sync läuft bereits
- `CACHE_ERROR` - Cache-Fehler

## Type-Definitionen

Alle Type-Definitionen befinden sich in:

- `electron/types/ipc.ts` - IPC-Type-Definitionen
- `app/types/electron.d.ts` - Renderer-Type-Definitionen

## Weitere Informationen

- [Electron IPC Documentation](https://www.electronjs.org/docs/latest/api/ipc-main)
- [Preload Script](electron/preload.ts)
- [IPC Handlers](electron/services/ipc-handlers.ts)
