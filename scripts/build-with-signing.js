#!/usr/bin/env node
/**
 * Build-Skript mit automatischem Code-Signing
 * 
 * Prüft, ob ein Zertifikat existiert und verwendet es automatisch.
 * Falls kein Zertifikat vorhanden ist, wird ein Hinweis angezeigt.
 */

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');
const os = require('os');

const CERT_PATH = path.join(process.cwd(), 'build', 'certificate.pfx');
const CERT_PASSWORD_ENV = 'CSC_KEY_PASSWORD';

/**
 * Löscht den electron-builder winCodeSign Cache
 * Dies behebt Probleme mit symbolischen Links auf Windows
 */
function clearWinCodeSignCache() {
	const cacheDir = path.join(os.homedir(), 'AppData', 'Local', 'electron-builder', 'Cache', 'winCodeSign');
	if (fs.existsSync(cacheDir)) {
		console.log('🧹 Lösche winCodeSign-Cache...\n');
		try {
			// Lösche alle Unterordner im Cache
			const entries = fs.readdirSync(cacheDir);
			for (const entry of entries) {
				const entryPath = path.join(cacheDir, entry);
				const stat = fs.statSync(entryPath);
				if (stat.isDirectory()) {
					fs.rmSync(entryPath, { recursive: true, force: true });
				} else if (stat.isFile()) {
					fs.unlinkSync(entryPath);
				}
			}
			console.log('✅ Cache gelöscht.\n');
		} catch (error) {
			console.log('⚠️  Konnte Cache nicht vollständig löschen (kann ignoriert werden):', error.message);
			console.log('   Versuche Build trotzdem fortzusetzen...\n');
		}
	}
}

function main() {
	console.log('🔍 Prüfe auf Code-Signing-Zertifikat...\n');

	// Prüfe, ob Zertifikat existiert
	if (!fs.existsSync(CERT_PATH)) {
		console.log('⚠️  Kein Code-Signing-Zertifikat gefunden.');
		console.log(`   Erwarteter Pfad: ${CERT_PATH}\n`);
		console.log('📝 Um ein Zertifikat zu erstellen, führen Sie aus:');
		console.log('   .\\scripts\\create-cert.ps1\n');
		console.log('🔄 Fahre mit Build ohne Code-Signing fort...\n');
		
		// Build ohne Code-Signing
		execSync('npm run build && npm run fix:html && npm run electron:build:ts && cross-env CSC_IDENTITY_AUTO_DISCOVERY=false electron-builder --win', {
			stdio: 'inherit',
			env: { ...process.env }
		});
		return;
	}

	console.log('✅ Zertifikat gefunden!\n');

	// Prüfe, ob Passwort als Umgebungsvariable gesetzt ist
	if (!process.env[CERT_PASSWORD_ENV]) {
		console.log('⚠️  Zertifikat-Passwort nicht gefunden.');
		console.log(`   Bitte setzen Sie die Umgebungsvariable: ${CERT_PASSWORD_ENV}\n`);
		console.log('   PowerShell:');
		console.log(`     $env:${CERT_PASSWORD_ENV}="Ihr_Passwort"\n`);
		console.log('   CMD:');
		console.log(`     set ${CERT_PASSWORD_ENV}=Ihr_Passwort\n`);
		console.log('   Oder erstellen Sie eine .env-Datei mit:');
		console.log(`     ${CERT_PASSWORD_ENV}=Ihr_Passwort\n`);
		
		// Versuche, Passwort aus .env-Datei zu laden
		const envPath = path.join(process.cwd(), '.env');
		if (fs.existsSync(envPath)) {
			const envContent = fs.readFileSync(envPath, 'utf-8');
			const match = envContent.match(new RegExp(`^${CERT_PASSWORD_ENV}=(.+)$`, 'm'));
			if (match) {
				process.env[CERT_PASSWORD_ENV] = match[1].trim();
				console.log(`✅ Passwort aus .env-Datei geladen.\n`);
			} else {
				console.log('❌ Passwort nicht in .env-Datei gefunden.\n');
				console.log('🔄 Fahre mit Build ohne Code-Signing fort...\n');
				execSync('npm run build && npm run electron:build:ts && cross-env CSC_IDENTITY_AUTO_DISCOVERY=false electron-builder --win', {
					stdio: 'inherit',
					env: { ...process.env }
				});
				return;
			}
		} else {
			console.log('🔄 Fahre mit Build ohne Code-Signing fort...\n');
			execSync('npm run build && npm run electron:build:ts && cross-env CSC_IDENTITY_AUTO_DISCOVERY=false electron-builder --win', {
				stdio: 'inherit',
				env: { ...process.env }
			});
			return;
		}
	}

	// Setze Umgebungsvariablen für Code-Signing
	const certPathAbsolute = path.resolve(CERT_PATH);
	process.env.CSC_LINK = certPathAbsolute;
	
	console.log('🔐 Code-Signing aktiviert:');
	console.log(`   Zertifikat: ${certPathAbsolute}`);
	console.log(`   Passwort: ${process.env[CERT_PASSWORD_ENV] ? '***' : 'NICHT GESETZT'}\n`);
	
	// Lösche winCodeSign-Cache, um Probleme mit symbolischen Links zu vermeiden
	clearWinCodeSignCache();
	
	console.log('🏗️  Starte Build mit Code-Signing...\n');

	try {
		execSync('npm run build && npm run fix:html && npm run electron:build:ts && electron-builder --win', {
			stdio: 'inherit',
			env: { ...process.env }
		});
		console.log('\n✅ Build mit Code-Signing erfolgreich abgeschlossen!');
	} catch (error) {
		console.error('\n❌ Build fehlgeschlagen!');
		process.exit(1);
	}
}

main();

