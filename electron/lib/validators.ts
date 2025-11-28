import { z } from "zod";

/**
 * Zod-Schemas für Config-Validierung.
 * 
 * Stellt type-safe Validierung für ShopConfig und AppConfig bereit.
 */

/**
 * Column-Mapping Schema.
 */
export const columnMappingSchema = z.object({
	sku: z.string().min(1, "SKU-Spalte ist erforderlich"),
	name: z.string().min(1, "Name-Spalte ist erforderlich"),
	price: z.string().min(1, "Preis-Spalte ist erforderlich"),
	stock: z.string().min(1, "Bestand-Spalte ist erforderlich"),
});

export type ColumnMappingSchema = z.infer<typeof columnMappingSchema>;

/**
 * Shop-Config Schema (für Persistierung mit accessTokenRef).
 */
export const shopConfigStoredSchema = z.object({
	shopUrl: z
		.string()
		.min(1, "Shop-URL ist erforderlich")
		.refine(
			(url) => {
				try {
					let normalizedUrl = url.trim();
					if (!normalizedUrl.startsWith("http://") && !normalizedUrl.startsWith("https://")) {
						normalizedUrl = `https://${normalizedUrl}`;
					}
					const urlObj = new URL(normalizedUrl);
					return urlObj.hostname.endsWith(".myshopify.com");
				} catch {
					return false;
				}
			},
			{ message: "Shop-URL muss auf .myshopify.com enden" }
		),
	accessTokenRef: z.string().min(1, "Access-Token-Referenz ist erforderlich"),
	locationId: z.string().min(1, "Location-ID ist erforderlich"),
	locationName: z.string().min(1, "Location-Name ist erforderlich"),
});

export type ShopConfigStoredSchema = z.infer<typeof shopConfigStoredSchema>;

/**
 * Shop-Config Schema (für Verwendung mit accessToken).
 * Wird verwendet, wenn Token aus dem Store geladen wurde.
 */
export const shopConfigSchema = z.object({
	shopUrl: z
		.string()
		.min(1, "Shop-URL ist erforderlich")
		.refine(
			(url) => {
				try {
					let normalizedUrl = url.trim();
					if (!normalizedUrl.startsWith("http://") && !normalizedUrl.startsWith("https://")) {
						normalizedUrl = `https://${normalizedUrl}`;
					}
					const urlObj = new URL(normalizedUrl);
					return urlObj.hostname.endsWith(".myshopify.com");
				} catch {
					return false;
				}
			},
			{ message: "Shop-URL muss auf .myshopify.com enden" }
		),
	accessToken: z
		.string()
		.min(1, "Access-Token ist erforderlich"),
		// Format-Prüfung entfernt - die tatsächliche API-Verbindung ist der beste Test
		// Shopify akzeptiert möglicherweise auch andere Token-Formate, die funktionieren
	locationId: z.string().min(1, "Location-ID ist erforderlich"),
	locationName: z.string().min(1, "Location-Name ist erforderlich"),
});

export type ShopConfigSchema = z.infer<typeof shopConfigSchema>;

/**
 * Auto-Sync Schema.
 */
export const autoSyncSchema = z.object({
	enabled: z.boolean(),
	interval: z.number().positive().optional(),
	csvPath: z.string().optional(),
	dbfPath: z.string().optional(),
	schedule: z.string().optional(), // Für zukünftige Verwendung (Cron-ähnliche Syntax)
});

export type AutoSyncSchema = z.infer<typeof autoSyncSchema>;

/**
 * Update-Config Schema.
 */
export const updateConfigSchema = z.object({
	autoCheckEnabled: z.boolean(),
	autoCheckInterval: z.number().positive(),
});

export type UpdateConfigSchema = z.infer<typeof updateConfigSchema>;

/**
 * App-Config Schema.
 */
export const appConfigSchema = z.object({
	shop: shopConfigStoredSchema.nullable(),
	defaultColumnMapping: columnMappingSchema.nullable(),
	apiVersion: z.string().optional(),
	autoSync: autoSyncSchema,
	defaultCsvPath: z.string().optional(),
	defaultDbfPath: z.string().optional(),
	update: updateConfigSchema,
});

export type AppConfigSchema = z.infer<typeof appConfigSchema>;

