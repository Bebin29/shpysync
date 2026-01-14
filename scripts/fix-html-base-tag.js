#!/usr/bin/env node
/**
 * Fix HTML Base-Tag für Electron file:// Protokoll
 *
 * Fügt einen <base> Tag zu allen HTML-Dateien hinzu, damit Assets
 * korrekt relativ zum out/ Verzeichnis aufgelöst werden.
 */

const fs = require("fs");
const path = require("path");

const OUT_DIR = path.join(process.cwd(), "out");

/**
 * Fügt Base-Tag zu einer HTML-Datei hinzu
 */
function fixHtmlFile(filePath) {
  const content = fs.readFileSync(filePath, "utf-8");

  // Berechne relative Pfad-Tiefe relativ zu out/
  const relativePath = path.relative(OUT_DIR, filePath);
  // Zähle Verzeichnisse im Pfad (ohne Dateiname)
  const pathParts = path
    .dirname(relativePath)
    .split(path.sep)
    .filter((p) => p && p !== ".");
  const pathDepth = pathParts.length;
  const basePath = pathDepth > 0 ? "../".repeat(pathDepth) : "./";

  // Prüfe ob bereits ein Base-Tag existiert
  if (content.includes("<base")) {
    // Ersetze existierenden Base-Tag
    const baseTagRegex = /<base[^>]*>/i;
    const newBaseTag = `<base href="${basePath}">`;
    const newContent = content.replace(baseTagRegex, newBaseTag);
    fs.writeFileSync(filePath, newContent, "utf-8");
  } else {
    // Füge Base-Tag nach <head> hinzu
    const headRegex = /<head[^>]*>/i;
    const newBaseTag = `$&\n  <base href="${basePath}">`;
    const newContent = content.replace(headRegex, newBaseTag);
    fs.writeFileSync(filePath, newContent, "utf-8");
  }
}

/**
 * Patched Webpack Runtime-Dateien, um relativen publicPath zu verwenden
 */
function patchWebpackRuntime(dir) {
  const chunksDir = path.join(dir, "_next", "static", "chunks");

  if (!fs.existsSync(chunksDir)) {
    return;
  }

  // Finde alle Webpack Runtime-Dateien (webpack-*.js)
  const entries = fs.readdirSync(chunksDir, { withFileTypes: true });

  for (const entry of entries) {
    if (entry.isFile() && entry.name.startsWith("webpack-") && entry.name.endsWith(".js")) {
      const filePath = path.join(chunksDir, entry.name);
      let content = fs.readFileSync(filePath, "utf-8");
      let modified = false;

      // Patch 1: Ersetze absoluten publicPath "/_next/" durch relativen "./_next/"
      // Suche nach d.p="/_next/" (minifiziert)
      const publicPathRegex = /d\.p\s*=\s*"\/_next\/"/g;
      if (publicPathRegex.test(content)) {
        content = content.replace(publicPathRegex, 'd.p="./_next/"');
        modified = true;
      }

      // Patch 2: Ersetze auch andere Varianten wie d.p='/_next/'
      const publicPathRegex2 = /d\.p\s*=\s*'\/_next\/'/g;
      if (publicPathRegex2.test(content)) {
        content = content.replace(publicPathRegex2, "d.p='./_next/'");
        modified = true;
      }

      // Patch 3: Minifizierte Variante ohne Leerzeichen: d.p="/_next/"
      const publicPathRegex3 = /d\.p="\/_next\/"/g;
      if (publicPathRegex3.test(content)) {
        content = content.replace(publicPathRegex3, 'd.p="./_next/"');
        modified = true;
      }

      // Patch 4: Minifizierte Variante mit Single Quotes: d.p='/_next/'
      const publicPathRegex4 = /d\.p='\/_next\/'/g;
      if (publicPathRegex4.test(content)) {
        content = content.replace(publicPathRegex4, "d.p='./_next/'");
        modified = true;
      }

      if (modified) {
        fs.writeFileSync(filePath, content, "utf-8");
        console.log(`Patched Webpack Runtime: ${path.relative(OUT_DIR, filePath)}`);
      }
    }
  }
}

/**
 * Rekursiv alle HTML-Dateien durchsuchen
 */
function processDirectory(dir) {
  const entries = fs.readdirSync(dir, { withFileTypes: true });

  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);

    if (entry.isDirectory()) {
      processDirectory(fullPath);
    } else if (entry.isFile() && entry.name.endsWith(".html")) {
      fixHtmlFile(fullPath);
      console.log(`Fixed: ${path.relative(OUT_DIR, fullPath)}`);
    }
  }
}

// Hauptfunktion
if (!fs.existsSync(OUT_DIR)) {
  console.error(`Error: ${OUT_DIR} does not exist. Run 'npm run build' first.`);
  process.exit(1);
}

console.log("Fixing HTML files with base tags...");
processDirectory(OUT_DIR);
console.log("Patching Webpack Runtime files...");
patchWebpackRuntime(OUT_DIR);
console.log("Done!");
