import Store from "electron-store";
import * as crypto from "crypto";

/**
 * Token-Store für sichere Speicherung von Access-Tokens.
 * 
 * Tokens werden verschlüsselt gespeichert und über eine Referenz-ID verwaltet.
 */

// Separater Store nur für Tokens (zusätzliche Sicherheitsschicht)
const tokenStore = new Store<Record<string, string>>({
	name: "tokens",
	defaults: {},
	encryptionKey: "wawisync-token-key", // TODO: In Produktion aus sicherer Quelle laden
});

// Verschlüsselungs-Key für Tokens (könnte auch aus OS-Keychain kommen)
const ENCRYPTION_ALGORITHM = "aes-256-gcm";
const IV_LENGTH = 16;
const SALT_LENGTH = 64;
const TAG_LENGTH = 16;

/**
 * Generiert einen Verschlüsselungs-Key aus einem Passwort.
 */
function deriveKey(password: string, salt: Buffer): Buffer {
	return crypto.pbkdf2Sync(password, salt, 100000, 32, "sha256");
}

/**
 * Verschlüsselt einen Token.
 */
function encryptToken(token: string, masterKey: string): string {
	const salt = crypto.randomBytes(SALT_LENGTH);
	const key = deriveKey(masterKey, salt);
	const iv = crypto.randomBytes(IV_LENGTH);

	const cipher = crypto.createCipheriv(ENCRYPTION_ALGORITHM, key, iv);
	cipher.setAAD(Buffer.from("wawisync-token"));

	let encrypted = cipher.update(token, "utf8");
	encrypted = Buffer.concat([encrypted, cipher.final()]);
	const tag = cipher.getAuthTag();

	// Kombiniere: salt + iv + tag + encrypted
	return Buffer.concat([salt, iv, tag, encrypted]).toString("base64");
}

/**
 * Entschlüsselt einen Token.
 */
function decryptToken(encryptedToken: string, masterKey: string): string {
	const data = Buffer.from(encryptedToken, "base64");

	const salt = data.subarray(0, SALT_LENGTH);
	const iv = data.subarray(SALT_LENGTH, SALT_LENGTH + IV_LENGTH);
	const tag = data.subarray(SALT_LENGTH + IV_LENGTH, SALT_LENGTH + IV_LENGTH + TAG_LENGTH);
	const encrypted = data.subarray(SALT_LENGTH + IV_LENGTH + TAG_LENGTH);

	const key = deriveKey(masterKey, salt);

	const decipher = crypto.createDecipheriv(ENCRYPTION_ALGORITHM, key, iv);
	decipher.setAuthTag(tag);
	decipher.setAAD(Buffer.from("wawisync-token"));

	let decrypted = decipher.update(encrypted);
	decrypted = Buffer.concat([decrypted, decipher.final()]);

	return decrypted.toString("utf8");
}

/**
 * Generiert eine eindeutige Token-Referenz-ID.
 */
function generateTokenRef(): string {
	return `token_${crypto.randomBytes(16).toString("hex")}`;
}

/**
 * Master-Key für Token-Verschlüsselung.
 * 
 * TODO: In Produktion sollte dies aus OS-Keychain oder sicherer Quelle kommen.
 */
const MASTER_KEY = process.env.WAWISYNC_TOKEN_KEY || "wawisync-master-key-change-in-production";

/**
 * Speichert einen Access-Token und gibt eine Referenz-ID zurück.
 * 
 * @param token - Access-Token zum Speichern
 * @returns Token-Referenz-ID
 */
export function storeToken(token: string): string {
	const tokenRef = generateTokenRef();
	const encrypted = encryptToken(token, MASTER_KEY);
	tokenStore.set(tokenRef, encrypted);
	return tokenRef;
}

/**
 * Lädt einen Access-Token anhand der Referenz-ID.
 * 
 * @param tokenRef - Token-Referenz-ID
 * @returns Access-Token oder null wenn nicht gefunden
 */
export function loadToken(tokenRef: string): string | null {
	const encrypted = tokenStore.get(tokenRef);
	if (!encrypted) {
		return null;
	}

	try {
		return decryptToken(encrypted, MASTER_KEY);
	} catch (error) {
		console.error(`Fehler beim Entschlüsseln des Tokens ${tokenRef}:`, error);
		return null;
	}
}

/**
 * Aktualisiert einen gespeicherten Token.
 * 
 * @param tokenRef - Token-Referenz-ID
 * @param token - Neuer Access-Token
 */
export function updateToken(tokenRef: string, token: string): void {
	const encrypted = encryptToken(token, MASTER_KEY);
	tokenStore.set(tokenRef, encrypted);
}

/**
 * Löscht einen gespeicherten Token.
 * 
 * @param tokenRef - Token-Referenz-ID
 */
export function deleteToken(tokenRef: string): void {
	tokenStore.delete(tokenRef);
}

/**
 * Prüft, ob ein Token existiert.
 * 
 * @param tokenRef - Token-Referenz-ID
 * @returns true wenn Token existiert
 */
export function tokenExists(tokenRef: string): boolean {
	return tokenStore.has(tokenRef);
}

