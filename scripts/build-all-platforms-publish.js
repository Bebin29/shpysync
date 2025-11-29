#!/usr/bin/env node
/**
 * Build-Script für alle Plattformen mit automatischem Upload zu GitHub Releases
 * 
 * Baut die App für Windows, macOS und Linux und lädt alle Artefakte
 * automatisch zu GitHub Releases hoch.
 */

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

const packageJson = JSON.parse(fs.readFileSync(path.join(process.cwd(), 'package.json'), 'utf-8'));
const version = packageJson.version;

console.log(`🚀 Starte Build für alle Plattformen (Version ${version})...\n`);

// Prüfe, ob Git Tag existiert
console.log('🔍 Prüfe Git Tag...');
try {
    execSync(`git rev-parse v${version}`, { stdio: 'ignore' });
    console.log(`✅ Git Tag v${version} existiert bereits\n`);
} catch (error) {
    console.log(`⚠️  Git Tag v${version} existiert noch nicht!`);
    console.log(`   Bitte erstelle den Tag zuerst:`);
    console.log(`   git tag v${version}`);
    console.log(`   git push origin v${version}\n`);
    process.exit(1);
}

// Prüfe GitHub Token (optional für öffentliche Repos)
const githubToken = process.env.GH_TOKEN || process.env.GITHUB_TOKEN;
if (githubToken) {
    console.log('✅ GitHub Token gefunden\n');
} else {
    console.log('ℹ️  Kein GitHub Token gesetzt (ok für öffentliche Repos)\n');
}

const platforms = [
    { name: 'Windows', script: 'electron:build:win:publish' },
    { name: 'macOS', script: 'electron:build:mac:publish' },
    { name: 'Linux', script: 'electron:build:linux:publish' }
];

let successCount = 0;
let failCount = 0;

for (const platform of platforms) {
    console.log(`\n${'='.repeat(60)}`);
    console.log(`📦 Baue für ${platform.name}...`);
    console.log(`${'='.repeat(60)}\n`);
    
    try {
        execSync(`npm run ${platform.script}`, {
            stdio: 'inherit',
            env: { ...process.env }
        });
        console.log(`\n✅ ${platform.name} Build erfolgreich!\n`);
        successCount++;
    } catch (error) {
        console.error(`\n❌ ${platform.name} Build fehlgeschlagen!`);
        console.error(`   Fehler: ${error.message}\n`);
        failCount++;
        
        // Frage, ob weiter gemacht werden soll
        console.log('⚠️  Möchtest du mit den anderen Plattformen fortfahren? (j/n)');
        // In einem echten Script würde man hier auf Input warten
        // Für jetzt: weiter machen
    }
}

console.log(`\n${'='.repeat(60)}`);
console.log('📊 Build-Zusammenfassung');
console.log(`${'='.repeat(60)}`);
console.log(`✅ Erfolgreich: ${successCount}/${platforms.length}`);
console.log(`❌ Fehlgeschlagen: ${failCount}/${platforms.length}`);

if (failCount > 0) {
    console.log('\n⚠️  Einige Builds sind fehlgeschlagen. Bitte prüfe die Fehler oben.');
    process.exit(1);
} else {
    console.log('\n🎉 Alle Builds erfolgreich abgeschlossen!');
    console.log(`📦 Release ${version} ist jetzt auf GitHub verfügbar.`);
}

