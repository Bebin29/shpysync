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

export interface ShopConfig {
  shopUrl: string;
  accessToken: string;
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
  shop: ShopConfig | null;
  defaultColumnMapping: ColumnMapping | null;
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

