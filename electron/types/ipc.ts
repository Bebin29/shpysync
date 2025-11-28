/**
 * IPC-Type-Definitionen für die Kommunikation zwischen Renderer und Main Process.
 */

// Sync-Types
export interface SyncStartConfig {
  csvPath: string;
  columnMapping: ColumnMapping;
  shopConfig: ShopConfig;
  options: {
    updatePrices: boolean;
    updateInventory: boolean;
    dryRun?: boolean;
  };
}

/**
 * Request für Sync-Vorschau (ohne Ausführung).
 */
export interface SyncPreviewRequest {
  csvPath: string;
  columnMapping: ColumnMapping;
  shopConfig: ShopConfig;
  options: {
    updatePrices: boolean;
    updateInventory: boolean;
  };
}

/**
 * Request für Test-Sync (nur ein Artikel mit Bestand > 0).
 */
export interface SyncTestRequest {
  shopConfig: ShopConfig;
  plannedOperations: PlannedOperation[];
}

/**
 * Response für Sync-Vorschau.
 */
export interface SyncPreviewResponse {
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

export interface ColumnMapping {
  sku: string; // Spaltenbuchstabe (z.B. "A", "B", "AB")
  name: string;
  price: string;
  stock: string;
}

/**
 * Shop-Config für Verwendung (mit Access-Token).
 * Wird verwendet, wenn Token aus dem Store geladen wurde.
 */
export interface ShopConfig {
	shopUrl: string;
	accessToken: string; // Token wird aus Token-Store geladen
	locationId: string;
	locationName: string;
}

/**
 * Shop-Config für Persistierung (mit Token-Referenz).
 * Wird in der Config gespeichert, Token selbst ist im Token-Store.
 */
export interface ShopConfigStored {
	shopUrl: string;
	accessTokenRef: string; // Referenz auf Token im Token-Store
	locationId: string;
	locationName: string;
}

export interface SyncProgress {
  current: number;
  total: number;
  stage: "matching" | "updating-prices" | "updating-inventory" | "complete";
  message: string;
}

/**
 * Geplante Operation für Vorschau.
 */
export interface PlannedOperation {
  id: string;
  type: "price" | "inventory";
  sku?: string | null;
  productTitle?: string | null;
  variantTitle?: string | null;
  oldValue?: string | number | null;
  newValue: string | number;
}

export type LogLevel = "debug" | "info" | "warn" | "error";
export type LogCategory = "csv" | "shopify" | "matching" | "inventory" | "price" | "system" | "cache" | "history" | "sync" | "update";

export interface SyncLog {
  id: string;
  level: LogLevel;
  category: LogCategory;
  message: string;
  timestamp: string;
  context?: Record<string, unknown>;
}

export interface SyncResult {
  totalPlanned: number;
  totalExecuted: number;
  totalSuccess: number;
  totalFailed: number;
  totalSkipped: number;
  operations: OperationResult[];
  planned?: PlannedOperation[]; // Geplante Operationen (für Vergleich/Vorschau)
  startTime: string;
  endTime?: string;
  duration?: number;
}

export interface OperationResult {
  type: "price" | "inventory";
  csvRow: {
    rowNumber: number;
    sku: string;
    name: string;
    price?: string;
    stock?: number;
  };
  variantId: string | null;
  status: "success" | "skipped" | "failed";
  oldValue?: string | number;
  newValue?: string | number;
  message?: string;
  errorCode?: string;
}

// Config-Types
export interface AppConfig {
	shop: ShopConfigStored | null; // Gespeicherte Config mit accessTokenRef
	defaultColumnMapping: ColumnMapping | null;
	apiVersion?: string; // Shopify API-Version (z.B. "2025-10")
	autoSync: {
		enabled: boolean;
		interval?: number; // in Minuten (15, 30, 60, 120)
		csvPath?: string; // Pfad zur CSV-Datei (optional, wenn dbfPath gesetzt)
		dbfPath?: string; // Pfad zur DBF-Datei (optional, wenn csvPath gesetzt)
		schedule?: string; // Cron-ähnliche Syntax (für zukünftige Verwendung)
	};
	// Standard-Pfade für manuelle Sync (werden automatisch verwendet, wenn gesetzt)
	defaultCsvPath?: string; // Standard-CSV-Pfad für manuelle Sync
	defaultDbfPath?: string; // Standard-DBF-Pfad für manuelle Sync (wird bevorzugt, wenn gesetzt)
	// Update-Konfiguration
	update: {
		autoCheckEnabled: boolean;
		autoCheckInterval: number; // in Stunden (z.B. 24)
	};
}

// CSV-Types
export interface CsvParseResult {
  rows: CsvRow[];
  headers: string[];
  encoding: string;
  totalRows: number;
}

export interface CsvRow {
  rowNumber: number;
  data: Record<string, string>;
}

export interface CsvPreviewResponse {
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
  };
  error?: string;
  errorCode?: string;
  errorSeverity?: "info" | "warning" | "error" | "fatal";
}

/**
 * Fehler-Information für IPC-Kommunikation.
 */
export interface ErrorInfo {
  code: string;
  message: string;
  severity: "info" | "warning" | "error" | "fatal";
  details?: unknown;
  userMessage: string;
}

// Cache-Types
export interface CacheStats {
	productCount: number;
	variantCount: number;
	lastUpdate: string | null;
	schemaVersion: number;
	dbPath: string;
}

// Dashboard-Types
export interface DashboardStats {
	totalProducts: number; // Aus Cache
	totalVariants: number; // Aus Cache
	lastSync: string | null; // Aus Historie
	syncSuccess: number; // Letzte 10 Syncs
	syncFailed: number; // Letzte 10 Syncs
	cacheLastUpdate: string | null; // Aus Cache
}

export interface HistoryStats {
	total: number;
	success: number;
	failed: number;
	lastSync: string | null;
}

// Sync-Historie-Types
export interface SyncHistoryEntry {
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

// Update-Types
export interface UpdateInfo {
	version: string;
	releaseDate: string;
	releaseNotes?: string;
}

export interface UpdateStatus {
	checking: boolean;
	available: boolean;
	downloaded: boolean;
	downloading: boolean;
	progress: number;
	error: string | null;
	info: UpdateInfo | null;
}

