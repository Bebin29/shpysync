#!/usr/bin/env node
/**
 * Erstellt latest-mac.yml für manuelles Hochladen
 * Falls electron-builder die Datei nicht erstellt hat
 */

const fs = require("fs");
const path = require("path");
const { execSync } = require("child_process");

const version = require("../package.json").version;
const distDir = path.join(__dirname, "..", "dist");

const zipFile = `WAWISync-${version}-mac.zip`;
const dmgFile = `WAWISync-${version}.dmg`;
const zipPath = path.join(distDir, zipFile);
const dmgPath = path.join(distDir, dmgFile);

if (!fs.existsSync(zipPath)) {
  console.error(`❌ ${zipFile} nicht gefunden in ${distDir}`);
  process.exit(1);
}

if (!fs.existsSync(dmgPath)) {
  console.error(`❌ ${dmgFile} nicht gefunden in ${distDir}`);
  process.exit(1);
}

// Berechne SHA512 Checksums
const zipSha512 = execSync(`shasum -a 512 "${zipPath}"`, { encoding: "utf-8" }).split(" ")[0];
const dmgSha512 = execSync(`shasum -a 512 "${dmgPath}"`, { encoding: "utf-8" }).split(" ")[0];

// Dateigrößen
const zipSize = fs.statSync(zipPath).size;
const dmgSize = fs.statSync(dmgPath).size;

// Erstelle latest-mac.yml
const ymlContent = `version: ${version}
files:
  - url: ${zipFile}
    sha512: ${zipSha512}
    size: ${zipSize}
  - url: ${dmgFile}
    sha512: ${dmgSha512}
    size: ${dmgSize}
path: ${zipFile}
sha512: ${zipSha512}
releaseDate: '${new Date().toISOString()}'
`;

const ymlPath = path.join(distDir, "latest-mac.yml");
fs.writeFileSync(ymlPath, ymlContent);

console.log(`✅ latest-mac.yml erstellt: ${ymlPath}`);
console.log(`\n📦 Dateien für GitHub Release:`);
console.log(`   - ${zipFile}`);
console.log(`   - ${dmgFile}`);
console.log(`   - ${zipFile}.blockmap (falls vorhanden)`);
console.log(`   - ${dmgFile}.blockmap (falls vorhanden)`);
console.log(`   - latest-mac.yml`);
console.log(`\n💡 Lade diese Dateien manuell zu Release ${version} hoch:`);
console.log(`   https://github.com/Bebin29/shpysync/releases/edit/v${version}`);
