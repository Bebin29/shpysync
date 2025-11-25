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

export interface SyncLog {
  level: "info" | "warn" | "error";
  message: string;
  timestamp: string;
}

export interface SyncResult {
  totalPlanned: number;
  totalExecuted: number;
  totalSuccess: number;
  totalFailed: number;
  totalSkipped: number;
  operations: OperationResult[];
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
		interval?: number; // in Minuten
		schedule?: string; // Cron-ähnliche Syntax
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
}

