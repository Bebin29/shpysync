import type { BrowserWindow } from "electron";
import type { ShopConfig, ColumnMapping, SyncStartConfig, SyncPreviewRequest, SyncProgress, SyncLog, SyncResult, OperationResult } from "../types/ipc.js";
import type { CsvRow, Product, MappedRow } from "../../core/domain/types.js";
import { parseCsvStream, extractRowValues, convertToCsvRows, type ColumnMapping as CoreColumnMapping } from "../../core/infra/csv/parser.js";
import { processCsvToUpdates, groupPriceUpdatesByProduct } from "../../core/domain/sync-pipeline.js";
import { getAllProductsWithVariants, updateVariantPrices } from "./shopify-product-service.js";
import { setInventoryQuantities } from "./shopify-inventory-service.js";

/**
 * Sync-Engine für die vollständige Synchronisation von CSV-Daten zu Shopify.
 * 
 * Implementiert die 8-stufige Pipeline:
 * 1. CSV → ParsedRow (Streaming)
 * 2. ParsedRow + ColumnMapping → NormalizedRow
 * 3. Shopify-Produkte/Varianten laden
 * 4. Matching(NormalizedRow, Products) → MatchResult[]
 * 5. MatchResult[] → UpdateOperations[] (Preis & Bestand)
 * 6. Koaleszierung von Inventar-Updates
 * 7. Planung (PlannedOperations) → Vorschau
 * 8. Ausführung in Batches (nach Bestätigung)
 */

/**
 * Sync-Modus für Update-Typen.
 */
export type SyncMode = "prices+stock" | "only-prices" | "only-stock";

/**
 * Konvertiert Sync-Optionen zu Sync-Modus.
 */
function getSyncMode(options: { updatePrices: boolean; updateInventory: boolean }): SyncMode {
	if (options.updatePrices && options.updateInventory) {
		return "prices+stock";
	}
	if (options.updatePrices) {
		return "only-prices";
	}
	return "only-stock";
}

/**
 * Work Units für Fortschrittsberechnung.
 */
interface WorkUnits {
	csvRows: number;
	productPages: number;
	priceBatches: number;
	inventoryBatches: number;
}

/**
 * Berechnet Gesamtanzahl der Work Units.
 */
function calculateTotalWorkUnits(workUnits: WorkUnits): number {
	return (
		workUnits.csvRows +
		workUnits.productPages * 10 + // Produktladen ist schwerer
		workUnits.priceBatches * 5 + // Preis-Updates sind mittelschwer
		workUnits.inventoryBatches * 5 // Inventory-Updates sind mittelschwer
	);
}

/**
 * Berechnet Fortschritt basierend auf erledigten Work Units.
 */
function calculateProgress(completed: number, total: number): number {
	if (total === 0) return 0;
	return Math.min(100, Math.round((completed / total) * 100));
}

/**
 * Sync-Engine-Klasse.
 */
export class SyncEngine {
	private mainWindow: BrowserWindow | null = null;
	private isCancelled = false;
	private currentProgress = 0;
	private completedWorkUnits = 0;
	private totalWorkUnits = 0;

	/**
	 * Setzt das BrowserWindow für Event-Versand.
	 */
	setMainWindow(window: BrowserWindow | null): void {
		this.mainWindow = window;
	}

	/**
	 * Sendet Fortschritts-Event zum Renderer.
	 */
	private sendProgress(progress: SyncProgress): void {
		if (this.mainWindow) {
			this.mainWindow.webContents.send("sync:progress", progress);
		}
	}

	/**
	 * Sendet Log-Event zum Renderer.
	 */
	private sendLog(log: SyncLog): void {
		if (this.mainWindow) {
			this.mainWindow.webContents.send("sync:log", log);
		}
	}

	/**
	 * Sendet Preview-Ready-Event zum Renderer.
	 */
	private sendPreviewReady(plannedOperations: PlannedOperation[]): void {
		if (this.mainWindow) {
			this.mainWindow.webContents.send("sync:previewReady", plannedOperations);
		}
	}

	/**
	 * Sendet Complete-Event zum Renderer.
	 */
	private sendComplete(result: SyncResult): void {
		if (this.mainWindow) {
			this.mainWindow.webContents.send("sync:complete", result);
		}
	}

	/**
	 * Prüft, ob Sync abgebrochen wurde.
	 */
	private checkCancelled(): boolean {
		return this.isCancelled;
	}

	/**
	 * Bricht den Sync ab.
	 */
	cancel(): void {
		this.isCancelled = true;
		this.sendLog({
			level: "warn",
			message: "Synchronisation wurde abgebrochen.",
			timestamp: new Date().toISOString(),
		});
	}

	/**
	 * Startet die Synchronisation.
	 * 
	 * @param config - Sync-Konfiguration
	 * @returns Sync-Ergebnis
	 */
	async startSync(config: SyncStartConfig): Promise<SyncResult> {
		// Reset State
		this.isCancelled = false;
		let plannedOperations: PlannedOperation[] = [];
		this.currentProgress = 0;
		this.completedWorkUnits = 0;
		this.totalWorkUnits = 0;

		const startTime = new Date();
		const operations: OperationResult[] = [];
		let totalPlanned = 0;
		let totalExecuted = 0;
		let totalSuccess = 0;
		let totalFailed = 0;
		let totalSkipped = 0;

		try {
			// Schritt 1: CSV parsen (Streaming)
			this.sendProgress({
				current: 0,
				total: 100,
				stage: "matching",
				message: "CSV wird geparst...",
			});

			const csvRows = await this.parseCsvWithMapping(config.csvPath, config.columnMapping);
			
			if (this.checkCancelled()) {
				throw new Error("Sync wurde abgebrochen");
			}

			this.sendLog({
				level: "info",
				message: `${csvRows.length} Zeilen aus CSV geladen.`,
				timestamp: new Date().toISOString(),
			});

			// Schritt 2: Shopify-Produkte/Varianten laden
			this.sendProgress({
				current: 10,
				total: 100,
				stage: "matching",
				message: "Produkte von Shopify werden geladen...",
			});

			const products = await this.loadProducts(config.shopConfig);
			
			if (this.checkCancelled()) {
				throw new Error("Sync wurde abgebrochen");
			}

			this.sendLog({
				level: "info",
				message: `${products.length} Produkte mit Varianten geladen.`,
				timestamp: new Date().toISOString(),
			});

			// Schritt 3-6: Matching und Update-Planung
			this.sendProgress({
				current: 30,
				total: 100,
				stage: "matching",
				message: "Matching wird durchgeführt...",
			});

			const syncMode = getSyncMode(config.options);
			const updateResult = processCsvToUpdates(csvRows, products, {
				updatePrices: config.options.updatePrices,
				updateInventory: config.options.updateInventory,
			});

			if (this.checkCancelled()) {
				throw new Error("Sync wurde abgebrochen");
			}

			// Schritt 7: Vorschau generieren
			plannedOperations = this.generatePlannedOperations(
				updateResult,
				products,
				syncMode
			);

			totalPlanned = plannedOperations.length;

			this.sendLog({
				level: "info",
				message: `${updateResult.mappedRows.length} Zeilen gematcht, ${updateResult.unmatchedRows.length} nicht gematcht.`,
				timestamp: new Date().toISOString(),
			});

			this.sendLog({
				level: "info",
				message: `${updateResult.priceUpdates.length} Preis-Updates geplant, ${updateResult.inventoryUpdates.length} Inventory-Updates geplant.`,
				timestamp: new Date().toISOString(),
			});

			// Vorschau senden
			this.sendPreviewReady(plannedOperations);

			// Wenn Dry-Run: Keine Ausführung
			if (config.options.dryRun) {
				this.sendLog({
					level: "info",
					message: "Dry-Run-Modus: Keine Updates werden ausgeführt.",
					timestamp: new Date().toISOString(),
				});

				const endTime = new Date();
				const result: SyncResult = {
					totalPlanned,
					totalExecuted: 0,
					totalSuccess: 0,
					totalFailed: 0,
					totalSkipped: 0,
					operations: [],
					planned: plannedOperations, // Geplante Operationen auch bei Dry-Run
					startTime: startTime.toISOString(),
					endTime: endTime.toISOString(),
					duration: endTime.getTime() - startTime.getTime(),
				};

				this.sendComplete(result);
				return result;
			}

			// Schritt 8: Ausführung in Batches
			this.sendProgress({
				current: 50,
				total: 100,
				stage: "updating-prices",
				message: "Updates werden ausgeführt...",
			});

			const executionResult = await this.executeUpdates(
				updateResult,
				products,
				config.shopConfig,
				syncMode
			);

			totalExecuted = executionResult.totalExecuted;
			totalSuccess = executionResult.totalSuccess;
			totalFailed = executionResult.totalFailed;
			totalSkipped = executionResult.totalSkipped;
			operations.push(...executionResult.operations);

			if (this.checkCancelled()) {
				throw new Error("Sync wurde abgebrochen");
			}

			// Ergebnis senden
			const endTime = new Date();
			const result: SyncResult = {
				totalPlanned,
				totalExecuted,
				totalSuccess,
				totalFailed,
				totalSkipped,
				operations,
				planned: plannedOperations, // Geplante Operationen für Vergleich
				startTime: startTime.toISOString(),
				endTime: endTime.toISOString(),
				duration: endTime.getTime() - startTime.getTime(),
			};

			this.sendComplete(result);
			return result;
		} catch (error) {
			const errorMessage = error instanceof Error ? error.message : "Unbekannter Fehler";
			this.sendLog({
				level: "error",
				message: `Fehler während der Synchronisation: ${errorMessage}`,
				timestamp: new Date().toISOString(),
			});

			const endTime = new Date();
			const result: SyncResult = {
				totalPlanned,
				totalExecuted,
				totalSuccess,
				totalFailed,
				totalSkipped,
				operations,
				planned: plannedOperations.length > 0 ? plannedOperations : undefined, // Nur wenn verfügbar
				startTime: startTime.toISOString(),
				endTime: endTime.toISOString(),
				duration: endTime.getTime() - startTime.getTime(),
			};

			this.sendComplete(result);
			throw error;
		}
	}

	/**
	 * Parst CSV-Datei mit Mapping (Streaming).
	 */
	private async parseCsvWithMapping(
		filePath: string,
		mapping: ColumnMapping
	): Promise<CsvRow[]> {
		const streamResult = await parseCsvStream(filePath, ";");
		const coreMapping: CoreColumnMapping = {
			sku: mapping.sku,
			name: mapping.name,
			price: mapping.price,
			stock: mapping.stock,
		};

		const csvRows: CsvRow[] = [];
		for await (const rawRow of streamResult.rows) {
			if (this.checkCancelled()) {
				break;
			}

			const extracted = extractRowValues(rawRow, coreMapping, streamResult.headers);
			if (extracted) {
				// Konvertiere zu CsvRow (validiert Stock)
				const converted = convertToCsvRows([extracted]);
				csvRows.push(...converted);
			}
		}

		return csvRows;
	}

	/**
	 * Lädt alle Produkte von Shopify.
	 */
	private async loadProducts(shopConfig: ShopConfig): Promise<Product[]> {
		return getAllProductsWithVariants({
			shopUrl: shopConfig.shopUrl,
			accessToken: shopConfig.accessToken,
		});
	}

	/**
	 * Generiert Vorschau mit Matching-Ergebnissen (ohne Ausführung).
	 * 
	 * Diese Methode führt die gleichen Schritte wie startSync durch,
	 * aber stoppt nach der Vorschau-Generierung und führt keine Updates aus.
	 */
	async generatePreview(config: SyncPreviewRequest): Promise<{
		planned: PlannedOperation[];
		unmatchedRows: Array<{
			rowNumber: number;
			sku: string;
			name: string;
			price?: string;
			stock?: number;
		}>;
	}> {
		// Schritt 1: CSV parsen
		const csvRows = await this.parseCsvWithMapping(config.csvPath, config.columnMapping);

		// Schritt 2: Shopify-Produkte/Varianten laden
		const products = await this.loadProducts(config.shopConfig);

		// Schritt 3-6: Matching und Update-Planung
		const syncMode = getSyncMode(config.options);
		const updateResult = processCsvToUpdates(csvRows, products, {
			updatePrices: config.options.updatePrices,
			updateInventory: config.options.updateInventory,
		});

		// Schritt 7: Vorschau generieren
		const plannedOperations = this.generatePlannedOperations(
			updateResult,
			products,
			syncMode
		);

		// Nicht-gematchte Zeilen konvertieren
		const unmatchedRows = updateResult.unmatchedRows.map((row) => ({
			rowNumber: row.rowNumber,
			sku: row.sku,
			name: row.name,
			price: row.price,
			stock: row.stock,
		}));

		return {
			planned: plannedOperations,
			unmatchedRows,
		};
	}

	/**
	 * Generiert geplante Operationen für Vorschau.
	 */
	private generatePlannedOperations(
		updateResult: ReturnType<typeof processCsvToUpdates>,
		products: Product[],
		mode: SyncMode
	): PlannedOperation[] {
		const operations: PlannedOperation[] = [];

		// Variant-Map für schnellen Zugriff
		const variantMap = new Map<string, { productId: string; variant: any }>();
		for (const product of products) {
			for (const variant of product.variants) {
				variantMap.set(variant.id, { productId: product.id, variant });
			}
		}

		// Preis-Updates
		if (mode === "prices+stock" || mode === "only-prices") {
			for (const update of updateResult.priceUpdates) {
				const variantData = variantMap.get(update.variantId);
				if (variantData) {
					operations.push({
						id: `price-${update.variantId}`,
						type: "price",
						sku: variantData.variant.sku || null,
						productTitle: products.find((p) => p.id === update.productId)?.title || null,
						variantTitle: variantData.variant.title || null,
						oldValue: variantData.variant.price || null,
						newValue: update.price,
					});
				}
			}
		}

		// Inventory-Updates
		if (mode === "prices+stock" || mode === "only-stock") {
			for (const update of updateResult.inventoryUpdates) {
				// Finde Variant zu inventoryItemId
				let variantData: { productId: string; variant: any } | null = null;
				for (const product of products) {
					for (const variant of product.variants) {
						if (variant.inventoryItemId === update.inventoryItemId) {
							variantData = { productId: product.id, variant };
							break;
						}
					}
					if (variantData) break;
				}

				if (variantData) {
					operations.push({
						id: `inventory-${update.inventoryItemId}`,
						type: "inventory",
						sku: variantData.variant.sku || null,
						productTitle: products.find((p) => p.id === variantData!.productId)?.title || null,
						variantTitle: variantData.variant.title || null,
						oldValue: null, // Wird später beim Ausführen geladen
						newValue: update.quantity,
					});
				}
			}
		}

		return operations;
	}

	/**
	 * Führt Updates in Batches aus.
	 */
	private async executeUpdates(
		updateResult: ReturnType<typeof processCsvToUpdates>,
		products: Product[],
		shopConfig: ShopConfig,
		mode: SyncMode
	): Promise<{
		totalExecuted: number;
		totalSuccess: number;
		totalFailed: number;
		totalSkipped: number;
		operations: OperationResult[];
	}> {
		const operations: OperationResult[] = [];
		let totalExecuted = 0;
		let totalSuccess = 0;
		let totalFailed = 0;
		let totalSkipped = 0;

		// Variant-Map für schnellen Zugriff (Variant-ID -> Daten)
		const variantMap = new Map<string, { productId: string; variant: any; csvRow?: CsvRow }>();
		// Inventory-Item-ID -> CSV-Row Map für Inventory-Updates
		const inventoryItemToCsvRowMap = new Map<string, { productId: string; variant: any; csvRow: CsvRow }>();

		for (const mappedRow of updateResult.mappedRows) {
			if (mappedRow.variantId) {
				for (const product of products) {
					const variant = product.variants.find((v) => v.id === mappedRow.variantId);
					if (variant) {
						variantMap.set(variant.id, {
							productId: product.id,
							variant,
							csvRow: mappedRow.csvRow,
						});

						// Auch für Inventory-Updates speichern
						if (variant.inventoryItemId) {
							inventoryItemToCsvRowMap.set(variant.inventoryItemId, {
								productId: product.id,
								variant,
								csvRow: mappedRow.csvRow,
							});
						}
						break;
					}
				}
			}
		}

		// Preis-Updates ausführen
		if (mode === "prices+stock" || mode === "only-prices") {
			this.sendProgress({
				current: 60,
				total: 100,
				stage: "updating-prices",
				message: "Preise werden aktualisiert...",
			});

			const priceUpdatesByProduct = groupPriceUpdatesByProduct(updateResult.priceUpdates);
			let priceBatchCount = 0;
			const totalPriceBatches = priceUpdatesByProduct.size;

			for (const [productId, updates] of priceUpdatesByProduct.entries()) {
				if (this.checkCancelled()) {
					break;
				}

				try {
					const result = await updateVariantPrices(
						{
							shopUrl: shopConfig.shopUrl,
							accessToken: shopConfig.accessToken,
						},
						productId,
						updates
					);

					if (result.success && result.userErrors.length === 0) {
						// Alle Updates erfolgreich
						for (const update of updates) {
							const variantData = variantMap.get(update.variantId);
							if (variantData && variantData.csvRow) {
								operations.push({
									type: "price",
									csvRow: {
										rowNumber: variantData.csvRow.rowNumber,
										sku: variantData.csvRow.sku,
										name: variantData.csvRow.name,
										price: variantData.csvRow.price,
									},
									variantId: update.variantId,
									status: "success",
									oldValue: variantData.variant.price,
									newValue: update.price,
								});
								totalSuccess++;
							}
						}
					} else {
						// UserErrors behandeln
						for (const update of updates) {
							const variantData = variantMap.get(update.variantId);
							if (variantData && variantData.csvRow) {
								const error = result.userErrors.find(
									(e) => e.field?.includes(update.variantId)
								);
								operations.push({
									type: "price",
									csvRow: {
										rowNumber: variantData.csvRow.rowNumber,
										sku: variantData.csvRow.sku,
										name: variantData.csvRow.name,
										price: variantData.csvRow.price,
									},
									variantId: update.variantId,
									status: error ? "failed" : "success",
									oldValue: variantData.variant.price,
									newValue: update.price,
									message: error?.message,
									errorCode: error?.code,
								});
								if (error) {
									totalFailed++;
								} else {
									totalSuccess++;
								}
							}
						}
					}

					totalExecuted += updates.length;
					priceBatchCount++;

					this.sendProgress({
						current: 60 + Math.round((priceBatchCount / totalPriceBatches) * 20),
						total: 100,
						stage: "updating-prices",
						message: `Preise aktualisiert: ${priceBatchCount}/${totalPriceBatches} Produkte`,
					});
				} catch (error) {
					const errorMessage = error instanceof Error ? error.message : "Unbekannter Fehler";
					this.sendLog({
						level: "error",
						message: `Fehler beim Aktualisieren der Preise für Produkt ${productId}: ${errorMessage}`,
						timestamp: new Date().toISOString(),
					});

					// Alle Updates als fehlgeschlagen markieren
					for (const update of updates) {
						const variantData = variantMap.get(update.variantId);
						if (variantData && variantData.csvRow) {
							operations.push({
								type: "price",
								csvRow: {
									rowNumber: variantData.csvRow.rowNumber,
									sku: variantData.csvRow.sku,
									name: variantData.csvRow.name,
									price: variantData.csvRow.price,
								},
								variantId: update.variantId,
								status: "failed",
								oldValue: variantData.variant.price,
								newValue: update.price,
								message: errorMessage,
							});
							totalFailed++;
						}
					}
					totalExecuted += updates.length;
				}
			}
		}

		// Inventory-Updates ausführen
		if (mode === "prices+stock" || mode === "only-stock") {
			this.sendProgress({
				current: 80,
				total: 100,
				stage: "updating-inventory",
				message: "Bestände werden aktualisiert...",
			});

			// Inventory-Updates in Batches von 250 aufteilen
			const batchSize = 250;
			const batches: Array<Array<{ inventoryItemId: string; quantity: number }>> = [];
			for (let i = 0; i < updateResult.inventoryUpdates.length; i += batchSize) {
				batches.push(updateResult.inventoryUpdates.slice(i, i + batchSize));
			}

			let inventoryBatchCount = 0;
			const totalInventoryBatches = batches.length;

			for (const batch of batches) {
				if (this.checkCancelled()) {
					break;
				}

				try {
					const result = await setInventoryQuantities(
						{
							shopUrl: shopConfig.shopUrl,
							accessToken: shopConfig.accessToken,
						},
						shopConfig.locationId,
						batch
					);

					if (result.success && result.userErrors.length === 0) {
						// Alle Updates erfolgreich
						for (const update of batch) {
							const variantData = inventoryItemToCsvRowMap.get(update.inventoryItemId);
							if (variantData) {
								operations.push({
									type: "inventory",
									csvRow: {
										rowNumber: variantData.csvRow.rowNumber,
										sku: variantData.csvRow.sku,
										name: variantData.csvRow.name,
										stock: variantData.csvRow.stock,
									},
									variantId: variantData.variant.id,
									status: "success",
									newValue: update.quantity,
								});
								totalSuccess++;
							}
						}
					} else {
						// UserErrors behandeln
						for (const update of batch) {
							const variantData = inventoryItemToCsvRowMap.get(update.inventoryItemId);
							if (variantData) {
								const error = result.userErrors.find(
									(e) => e.field?.includes(update.inventoryItemId)
								);
								operations.push({
									type: "inventory",
									csvRow: {
										rowNumber: variantData.csvRow.rowNumber,
										sku: variantData.csvRow.sku,
										name: variantData.csvRow.name,
										stock: variantData.csvRow.stock,
									},
									variantId: variantData.variant.id,
									status: error ? "failed" : "success",
									newValue: update.quantity,
									message: error?.message,
									errorCode: error?.code,
								});
								if (error) {
									totalFailed++;
								} else {
									totalSuccess++;
								}
							}
						}
					}

					totalExecuted += batch.length;
					inventoryBatchCount++;

					this.sendProgress({
						current: 80 + Math.round((inventoryBatchCount / totalInventoryBatches) * 20),
						total: 100,
						stage: "updating-inventory",
						message: `Bestände aktualisiert: ${inventoryBatchCount}/${totalInventoryBatches} Batches`,
					});
				} catch (error) {
					const errorMessage = error instanceof Error ? error.message : "Unbekannter Fehler";
					this.sendLog({
						level: "error",
						message: `Fehler beim Aktualisieren der Bestände: ${errorMessage}`,
						timestamp: new Date().toISOString(),
					});

					// Alle Updates als fehlgeschlagen markieren
					for (const update of batch) {
						const variantData = inventoryItemToCsvRowMap.get(update.inventoryItemId);
						if (variantData) {
							operations.push({
								type: "inventory",
								csvRow: {
									rowNumber: variantData.csvRow.rowNumber,
									sku: variantData.csvRow.sku,
									name: variantData.csvRow.name,
									stock: variantData.csvRow.stock,
								},
								variantId: variantData.variant.id,
								status: "failed",
								newValue: update.quantity,
								message: errorMessage,
							});
							totalFailed++;
						}
					}
					totalExecuted += batch.length;
				}
			}
		}

		return {
			totalExecuted,
			totalSuccess,
			totalFailed,
			totalSkipped,
			operations,
		};
	}
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

// Singleton-Instanz
let syncEngineInstance: SyncEngine | null = null;

/**
 * Gibt die Singleton-Instanz der Sync-Engine zurück.
 */
export function getSyncEngine(): SyncEngine {
	if (!syncEngineInstance) {
		syncEngineInstance = new SyncEngine();
	}
	return syncEngineInstance;
}

