import { app } from "electron";
import { join } from "path";
import { existsSync, mkdirSync, unlinkSync } from "fs";
import Database from "better-sqlite3";
import type { Product, Variant } from "../../core/domain/types.js";
import type { CacheStats } from "../types/ipc.js";
import { getLogger } from "./logger.js";

/**
 * Cache-Service für Dashboard-Statistiken.
 * 
 * WICHTIG: Der Cache wird NUR für Dashboard-Anzeigen verwendet.
 * Im Sync-Prozess werden IMMER die neuesten Daten direkt von Shopify geladen.
 * 
 * Der Cache wird nach erfolgreichen Syncs aktualisiert, um Dashboard-Stats
 * ohne zusätzliche API-Calls anzeigen zu können.
 */
class CacheService {
	private readonly DB_FILE = "cache.db";
	private readonly SCHEMA_VERSION = 1;
	private dbPath: string | null = null;
	private db: Database.Database | null = null;
	private logger = getLogger();

	/**
	 * Initialisiert die Datenbank-Verbindung.
	 * WICHTIG: Nur nach app.whenReady() aufrufen!
	 */
	initialize(): void {
		if (this.db) {
			return; // Bereits initialisiert
		}

		if (!app.isReady()) {
			throw new Error("app.getPath() kann nur nach app.whenReady() verwendet werden");
		}

		const userDataPath = app.getPath("userData");
		this.dbPath = join(userDataPath, this.DB_FILE);

		// Verzeichnis erstellen falls nicht vorhanden
		if (!existsSync(userDataPath)) {
			mkdirSync(userDataPath, { recursive: true });
		}

		// Datenbank öffnen
		this.db = new Database(this.dbPath);

		// Schema erstellen
		this.createSchema();

		this.logger.info("cache", "Cache-Service initialisiert", { dbPath: this.dbPath });
	}

	/**
	 * Erstellt das Datenbank-Schema.
	 */
	private createSchema(): void {
		if (!this.db) {
			throw new Error("Datenbank nicht initialisiert");
		}

		// Produkte-Tabelle
		this.db.exec(`
			CREATE TABLE IF NOT EXISTS products (
				id TEXT PRIMARY KEY,
				title TEXT NOT NULL,
				updated_at INTEGER NOT NULL
			)
		`);

		// Varianten-Tabelle
		this.db.exec(`
			CREATE TABLE IF NOT EXISTS variants (
				id TEXT PRIMARY KEY,
				product_id TEXT NOT NULL,
				sku TEXT,
				barcode TEXT,
				title TEXT NOT NULL,
				price TEXT NOT NULL,
				inventory_item_id TEXT,
				updated_at INTEGER NOT NULL,
				FOREIGN KEY (product_id) REFERENCES products(id)
			)
		`);

		// Indizes für schnelle Abfragen
		this.db.exec(`
			CREATE INDEX IF NOT EXISTS idx_variants_sku ON variants(sku) WHERE sku IS NOT NULL;
			CREATE INDEX IF NOT EXISTS idx_variants_barcode ON variants(barcode) WHERE barcode IS NOT NULL;
		`);

		// Schema-Version speichern
		this.db.exec(`
			CREATE TABLE IF NOT EXISTS cache_metadata (
				key TEXT PRIMARY KEY,
				value TEXT NOT NULL
			)
		`);

		const stmt = this.db.prepare(`
			INSERT OR REPLACE INTO cache_metadata (key, value) VALUES ('schema_version', ?)
		`);
		stmt.run(String(this.SCHEMA_VERSION));
	}

	/**
	 * Lädt alle Produkte aus dem Cache.
	 * Wird nur für Dashboard-Stats verwendet, nicht im Sync-Prozess!
	 */
	getProducts(): Product[] {
		if (!this.db) {
			return [];
		}

		try {
			// Produkte laden
			const productsStmt = this.db.prepare(`
				SELECT id, title, updated_at FROM products ORDER BY title
			`);
			const products = productsStmt.all() as Array<{
				id: string;
				title: string;
				updated_at: number;
			}>;

			// Varianten für jedes Produkt laden
			const variantsStmt = this.db.prepare(`
				SELECT id, product_id, sku, barcode, title, price, inventory_item_id, updated_at
				FROM variants
				WHERE product_id = ?
			`);

			const result: Product[] = products.map((product) => {
				const variants = variantsStmt.all(product.id) as Array<{
					id: string;
					product_id: string;
					sku: string | null;
					barcode: string | null;
					title: string;
					price: string;
					inventory_item_id: string | null;
					updated_at: number;
				}>;

				return {
					id: product.id,
					title: product.title,
					variants: variants.map(
						(v): Variant => ({
							id: v.id,
							productId: v.product_id,
							sku: v.sku,
							barcode: v.barcode,
							title: v.title,
							price: v.price,
							inventoryItemId: v.inventory_item_id,
						})
					),
				};
			});

			return result;
		} catch (error) {
			this.logger.warn("cache", "Fehler beim Laden der Produkte aus Cache", {
				error: error instanceof Error ? error.message : String(error),
			});
			return [];
		}
	}

	/**
	 * Speichert Produkte im Cache.
	 * Wird nach erfolgreichen Syncs aufgerufen, um Dashboard-Stats zu aktualisieren.
	 */
	saveProducts(products: Product[]): void {
		if (!this.db) {
			this.logger.warn("cache", "Datenbank nicht initialisiert, Cache wird nicht gespeichert");
			return;
		}

		try {
			const transaction = this.db.transaction(() => {
				// Alte Daten löschen
				this.db!.exec("DELETE FROM variants");
				this.db!.exec("DELETE FROM products");

				// Produkte einfügen
				const insertProduct = this.db!.prepare(`
					INSERT INTO products (id, title, updated_at) VALUES (?, ?, ?)
				`);

				// Varianten einfügen
				const insertVariant = this.db!.prepare(`
					INSERT INTO variants (id, product_id, sku, barcode, title, price, inventory_item_id, updated_at)
					VALUES (?, ?, ?, ?, ?, ?, ?, ?)
				`);

				const now = Date.now();

				for (const product of products) {
					insertProduct.run(product.id, product.title, now);

					for (const variant of product.variants) {
						insertVariant.run(
							variant.id,
							variant.productId,
							variant.sku,
							variant.barcode,
							variant.title,
							variant.price,
							variant.inventoryItemId,
							now
						);
					}
				}

				// Last-Update-Zeit speichern
				const updateStmt = this.db!.prepare(`
					INSERT OR REPLACE INTO cache_metadata (key, value) VALUES ('last_update', ?)
				`);
				updateStmt.run(new Date().toISOString());
			});

			transaction();

			this.logger.info("cache", "Produkte im Cache gespeichert", {
				productCount: products.length,
				variantCount: products.reduce((sum, p) => sum + p.variants.length, 0),
			});
		} catch (error) {
			this.logger.warn("cache", "Fehler beim Speichern der Produkte im Cache", {
				error: error instanceof Error ? error.message : String(error),
			});
		}
	}

	/**
	 * Gibt Cache-Statistiken zurück (für Dashboard).
	 */
	getCacheStats(): CacheStats {
		if (!this.db) {
			return {
				productCount: 0,
				variantCount: 0,
				lastUpdate: null,
				schemaVersion: this.SCHEMA_VERSION,
				dbPath: "nicht initialisiert",
			};
		}

		try {
			// Produktanzahl
			const productCountStmt = this.db.prepare("SELECT COUNT(*) as count FROM products");
			const productCount = (productCountStmt.get() as { count: number }).count;

			// Variantenanzahl
			const variantCountStmt = this.db.prepare("SELECT COUNT(*) as count FROM variants");
			const variantCount = (variantCountStmt.get() as { count: number }).count;

			// Last-Update-Zeit
			const lastUpdateStmt = this.db.prepare(
				"SELECT value FROM cache_metadata WHERE key = 'last_update'"
			);
			const lastUpdateResult = lastUpdateStmt.get() as { value: string } | undefined;
			const lastUpdate = lastUpdateResult?.value ?? null;

			return {
				productCount,
				variantCount,
				lastUpdate,
				schemaVersion: this.SCHEMA_VERSION,
				dbPath: this.dbPath ?? "unbekannt",
			};
		} catch (error) {
			this.logger.warn("cache", "Fehler beim Abrufen der Cache-Stats", {
				error: error instanceof Error ? error.message : String(error),
			});

			return {
				productCount: 0,
				variantCount: 0,
				lastUpdate: null,
				schemaVersion: this.SCHEMA_VERSION,
				dbPath: this.dbPath ?? "unbekannt",
			};
		}
	}

	/**
	 * Prüft, ob der Cache gültig ist.
	 * Wird nicht mehr im Sync-Prozess verwendet, aber für Kompatibilität beibehalten.
	 */
	isCacheValid(): boolean {
		if (!this.db) {
			return false;
		}

		try {
			const stats = this.getCacheStats();
			return stats.productCount > 0 && stats.lastUpdate !== null;
		} catch {
			return false;
		}
	}

	/**
	 * Löscht den gesamten Cache.
	 */
	clearCache(): void {
		if (!this.db) {
			return;
		}

		try {
			this.db.exec("DELETE FROM variants");
			this.db.exec("DELETE FROM products");
			this.db.exec("DELETE FROM cache_metadata WHERE key = 'last_update'");

			this.logger.info("cache", "Cache gelöscht");
		} catch (error) {
			this.logger.warn("cache", "Fehler beim Löschen des Caches", {
				error: error instanceof Error ? error.message : String(error),
			});
		}
	}

	/**
	 * Schließt die Datenbank-Verbindung.
	 */
	close(): void {
		if (this.db) {
			this.db.close();
			this.db = null;
			this.logger.info("cache", "Cache-Datenbank geschlossen");
		}
	}
}

/**
 * Singleton-Instanz des Cache-Services.
 */
let cacheServiceInstance: CacheService | null = null;

/**
 * Gibt die Cache-Service-Instanz zurück (Singleton).
 */
export function getCacheService(): CacheService {
	if (!cacheServiceInstance) {
		cacheServiceInstance = new CacheService();
	}
	return cacheServiceInstance;
}
