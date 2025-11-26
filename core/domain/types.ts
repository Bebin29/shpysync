/**
 * Domain-Types für die Business Logic.
 * 
 * Diese Types sind unabhängig von Electron/IPC und können
 * in Tests und anderen Kontexten wiederverwendet werden.
 */

export interface Product {
  id: string; // Shopify GID (z.B. "gid://shopify/Product/123")
  title: string;
  variants: Variant[];
}

export interface Variant {
  id: string; // Shopify GID (z.B. "gid://shopify/ProductVariant/456")
  productId: string;
  sku: string | null;
  barcode: string | null;
  title: string;
  price: string; // Shopify Money-Format (z.B. "12.50")
  inventoryItemId: string | null; // Shopify GID für Inventory
  currentQuantity?: number; // Optional: aktueller Bestand (wenn geladen)
}

/**
 * Rohe CSV-Zeile (vor Mapping/Extrahierung).
 */
export interface RawCsvRow {
  rowNumber: number;
  data: Record<string, string>; // Original CSV-Daten (Spaltenname -> Wert)
}

/**
 * Verarbeitete CSV-Zeile (nach Mapping/Extrahierung).
 */
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

/**
 * Variant-Maps für effizientes Matching.
 */
export interface VariantMaps {
  skuToVariant: Map<string, string>; // SKU -> VariantGID
  nameToVariants: Map<string, string[]>; // norm(ProductTitle) -> [VariantGID]
  extraNameMap: Map<string, string>; // norm(ProductTitle + ' ' + VariantTitle) oder Barcode -> VariantGID
  variantToProduct: Map<string, string>; // VariantGID -> ProductGID
}

