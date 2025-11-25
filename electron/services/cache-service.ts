import Database from "better-sqlite3";
import { app } from "electron";
import { join } from "path";
import { existsSync, mkdirSync, renameSync, copyFileSync } from "fs";
import type { Product } from "../../core/domain/types.js";
import { getLogger } from "./logger.js";

/**
 * Cache-Statistiken.
 */
export interface CacheStats {
	productCount: number;
	variantCount: number;
	lastUpdate: string | null;
	schemaVersion: number;
	dbPath: string;
}

/**
 * Cache-Service für Produkt-/Variant-Cache mit SQLite.
 * 
 * WICHTIG: Datenbank wird in app.getPath("userData") erstellt (außerhalb des ASAR-Archivs).
 * Initialisierung erfolgt lazy beim ersten Aufruf (nach app.whenReady()).
 */
class CacheService {
	private dbInstance: Database.Database | null = null;
	private dbPath: string | null = null;
	private readonly SCHEMA_VERSION = 1;
	private readonly CACHE_TTL_HOURS = 24;
	private logger = getLogger();

	/**
	 * Initialisiert die SQLite-Datenbank.
	 * WICHTIG: Nur nach app.whenReady() aufrufen!
	 * 
	 * @throws Error wenn app.getPath() nicht verfügbar ist
	 */
	private initializeDatabase(): Database.Database {
		if (this.dbInstance) {
			return this.dbInstance;
		}

		// WICHTIG: app.getPath() funktioniert nur nach app.whenReady()
		if (!app.isReady()) {
			throw new Error("app.getPath() kann nur nach app.whenReady() verwendet werden");
		}

		try {
			// Datenbank-Pfad: app.getPath("userData") + "cache.db"
			const userDataPath = app.getPath("userData");
			this.dbPath = join(userDataPath, "cache.db");

			// Verzeichnis erstellen falls nicht vorhanden
			if (!existsSync(userDataPath)) {
				mkdirSync(userDataPath, { recursive: true });
			}

			// Datenbank erstellen/öffnen
			this.dbInstance = new Database(this.dbPath);

			// Schema erstellen
			this.createSchema(this.dbInstance);

			this.logger.info("cache", "Cache-Datenbank initialisiert", { path: this.dbPath });
		} catch (error) {
			// Falls Datenbank beschädigt: Versuche Backup und Neuerstellung
			if (error instanceof Error && error.message.includes("database disk image is malformed")) {
				this.logger.warn("cache", "Datenbank beschädigt, versuche Wiederherstellung", { error: error.message });
				this.recoverDatabase();
			} else {
				this.logger.error("cache", "Fehler beim Initialisieren der Datenbank", { error: error instanceof Error ? error.message : String(error) });
				throw error;
			}
		}

		if (!this.dbInstance) {
			throw new Error("Datenbank konnte nicht initialisiert werden");
		}

		return this.dbInstance;
	}

	/**
	 * Stellt eine beschädigte Datenbank wieder her.
	 */
	private recoverDatabase(): void {
		if (!this.dbPath) return;

		try {
			const backupPath = `${this.dbPath}.backup`;
			
			// Backup erstellen falls vorhanden
			if (existsSync(this.dbPath)) {
				copyFileSync(this.dbPath, backupPath);
			}

			// Alte Datenbank löschen
			if (this.dbInstance) {
				this.dbInstance.close();
				this.dbInstance = null;
			}

			// Neue Datenbank erstellen
			const userDataPath = app.getPath("userData");
			this.dbPath = join(userDataPath, "cache.db");
			this.dbInstance = new Database(this.dbPath);
			this.createSchema(this.dbInstance);

			this.logger.info("cache", "Datenbank wiederhergestellt", { backupPath });
		} catch (error) {
			this.logger.error("cache", "Fehler bei Datenbank-Wiederherstellung", { error: error instanceof Error ? error.message : String(error) });
			throw error;
		}
	}

	/**
	 * Erstellt das Datenbank-Schema.
	 */
	private createSchema(db: Database.Database): void {
		db.exec(`
			CREATE TABLE IF NOT EXISTS schema_info (
				key TEXT PRIMARY KEY,
				value TEXT NOT NULL
			);

			CREATE TABLE IF NOT EXISTS products (
				id TEXT PRIMARY KEY,
				title TEXT NOT NULL,
				updated_at INTEGER NOT NULL
			);

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
			);

			CREATE INDEX IF NOT EXISTS idx_variants_sku ON variants(sku) WHERE sku IS NOT NULL;
			CREATE INDEX IF NOT EXISTS idx_variants_barcode ON variants(barcode) WHERE barcode IS NOT NULL;
			CREATE INDEX IF NOT EXISTS idx_variants_product_id ON variants(product_id);
		`);

		// Schema-Version speichern
		const stmt = db.prepare("INSERT OR REPLACE INTO schema_info (key, value) VALUES (?, ?)");
		stmt.run("schema_version", String(this.SCHEMA_VERSION));
	}

	/**
	 * Initialisiert die Datenbank (lazy, beim ersten Aufruf).
	 */
	initialize(): void {
		if (!this.dbInstance) {
			this.initializeDatabase();
		}
	}

	/**
	 * Speichert Produkte im Cache (Transaction).
	 */
	saveProducts(products: Product[]): void {
		if (!this.dbInstance) {
			this.initialize();
		}

		const db = this.dbInstance!;
		const now = Date.now();

		// Transaction starten
		const transaction = db.transaction(() => {
			// Alte Daten löschen
			db.prepare("DELETE FROM variants").run();
			db.prepare("DELETE FROM products").run();

			// Produkte einfügen
			const insertProduct = db.prepare("INSERT INTO products (id, title, updated_at) VALUES (?, ?, ?)");
			const insertVariant = db.prepare(
				"INSERT INTO variants (id, product_id, sku, barcode, title, price, inventory_item_id, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?)"
			);

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
		});

		transaction();

		this.logger.info("cache", "Produkte im Cache gespeichert", { 
			productCount: products.length,
			variantCount: products.reduce((sum, p) => sum + p.variants.length, 0)
		});
	}

	/**
	 * Lädt alle Produkte aus dem Cache.
	 */
	getProducts(): Product[] {
		if (!this.dbInstance) {
			this.initialize();
		}

		const db = this.dbInstance!;

		// Produkte laden
		const products = db.prepare("SELECT id, title FROM products").all() as Array<{ id: string; title: string }>;
		
		// Varianten laden
		const variants = db.prepare("SELECT id, product_id, sku, barcode, title, price, inventory_item_id FROM variants").all() as Array<{
			id: string;
			product_id: string;
			sku: string | null;
			barcode: string | null;
			title: string;
			price: string;
			inventory_item_id: string | null;
		}>;

		// Varianten nach Produkt gruppieren
		const variantMap = new Map<string, typeof variants>();
		for (const variant of variants) {
			if (!variantMap.has(variant.product_id)) {
				variantMap.set(variant.product_id, []);
			}
			variantMap.get(variant.product_id)!.push(variant);
		}

		// Produkte mit Varianten zusammenführen
		return products.map((product) => ({
			id: product.id,
			title: product.title,
			variants: (variantMap.get(product.id) || []).map((v) => ({
				id: v.id,
				productId: v.product_id,
				sku: v.sku,
				barcode: v.barcode,
				title: v.title,
				price: v.price,
				inventoryItemId: v.inventory_item_id,
			})),
		}));
	}

	/**
	 * Gibt die Anzahl der Produkte zurück.
	 */
	getProductCount(): number {
		if (!this.dbInstance) {
			this.initialize();
		}

		const db = this.dbInstance!;
		const result = db.prepare("SELECT COUNT(*) as count FROM products").get() as { count: number };
		return result.count;
	}

	/**
	 * Gibt die Anzahl der Varianten zurück.
	 */
	getVariantCount(): number {
		if (!this.dbInstance) {
			this.initialize();
		}

		const db = this.dbInstance!;
		const result = db.prepare("SELECT COUNT(*) as count FROM variants").get() as { count: number };
		return result.count;
	}

	/**
	 * Gibt die letzte Aktualisierungszeit zurück.
	 */
	getLastUpdateTime(): Date | null {
		if (!this.dbInstance) {
			this.initialize();
		}

		const db = this.dbInstance!;
		const result = db.prepare("SELECT MAX(updated_at) as last_update FROM products").get() as { last_update: number | null };

		if (result.last_update === null) {
			return null;
		}

		return new Date(result.last_update);
	}

	/**
	 * Prüft, ob der Cache gültig ist (nicht zu alt).
	 */
	isCacheValid(): boolean {
		const lastUpdate = this.getLastUpdateTime();
		if (!lastUpdate) {
			return false;
		}

		const now = Date.now();
		const ageHours = (now - lastUpdate.getTime()) / (1000 * 60 * 60);
		return ageHours < this.CACHE_TTL_HOURS;
	}

	/**
	 * Löscht den gesamten Cache.
	 */
	clearCache(): void {
		if (!this.dbInstance) {
			this.initialize();
		}

		const db = this.dbInstance!;

		const transaction = db.transaction(() => {
			db.prepare("DELETE FROM variants").run();
			db.prepare("DELETE FROM products").run();
		});

		transaction();

		this.logger.info("cache", "Cache gelöscht");
	}

	/**
	 * Gibt Cache-Statistiken zurück.
	 */
	getCacheStats(): CacheStats {
		if (!this.dbInstance) {
			this.initialize();
		}

		const lastUpdate = this.getLastUpdateTime();
		const schemaVersion = this.getSchemaVersion();

		return {
			productCount: this.getProductCount(),
			variantCount: this.getVariantCount(),
			lastUpdate: lastUpdate ? lastUpdate.toISOString() : null,
			schemaVersion,
			dbPath: this.dbPath || "nicht initialisiert",
		};
	}

	/**
	 * Gibt die Schema-Version zurück.
	 */
	private getSchemaVersion(): number {
		if (!this.dbInstance) {
			this.initialize();
		}

		const db = this.dbInstance!;
		const result = db.prepare("SELECT value FROM schema_info WHERE key = ?").get("schema_version") as { value: string } | undefined;

		if (!result) {
			return this.SCHEMA_VERSION;
		}

		return parseInt(result.value, 10);
	}

	/**
	 * Schließt die Datenbank (für Tests/Cleanup).
	 */
	close(): void {
		if (this.dbInstance) {
			this.dbInstance.close();
			this.dbInstance = null;
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

