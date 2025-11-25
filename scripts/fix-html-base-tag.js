#!/usr/bin/env node
/**
 * Fix HTML Base-Tag für Electron file:// Protokoll
 * 
 * Fügt einen <base> Tag zu allen HTML-Dateien hinzu, damit Assets
 * korrekt relativ zum out/ Verzeichnis aufgelöst werden.
 */

const fs = require('fs');
const path = require('path');

const OUT_DIR = path.join(process.cwd(), 'out');

/**
 * Fügt Base-Tag zu einer HTML-Datei hinzu
 */
function fixHtmlFile(filePath) {
  const content = fs.readFileSync(filePath, 'utf-8');
  
  // Berechne relative Pfad-Tiefe relativ zu out/
  const relativePath = path.relative(OUT_DIR, filePath);
  const pathDepth = relativePath.split(path.sep).filter(p => p && !p.endsWith('.html')).length - 1;
  const basePath = pathDepth > 0 ? '../'.repeat(pathDepth) : './';
  
  // Prüfe ob bereits ein Base-Tag existiert
  if (content.includes('<base')) {
    // Ersetze existierenden Base-Tag
    const baseTagRegex = /<base[^>]*>/i;
    const newBaseTag = `<base href="${basePath}">`;
    const newContent = content.replace(baseTagRegex, newBaseTag);
    fs.writeFileSync(filePath, newContent, 'utf-8');
  } else {
    // Füge Base-Tag nach <head> hinzu
    const headRegex = /<head[^>]*>/i;
    const newBaseTag = `$&\n  <base href="${basePath}">`;
    const newContent = content.replace(headRegex, newBaseTag);
    fs.writeFileSync(filePath, newContent, 'utf-8');
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
    } else if (entry.isFile() && entry.name.endsWith('.html')) {
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

console.log('Fixing HTML files with base tags...');
processDirectory(OUT_DIR);
console.log('Done!');

