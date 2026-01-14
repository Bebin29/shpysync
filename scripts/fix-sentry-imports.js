/**
 * Post-Build-Script: Korrigiert falsche Sentry Import-Pfade und entfernt doppelte CommonJS-Versionen.
 *
 * Problem 1: tsc-esm-fix fügt automatisch /index.js zu Import-Pfaden hinzu,
 * auch bei Package-Subpath-Exports wie @sentry/electron/main.
 * Dies führt zu @sentry/electron/main/index.js, was nicht exportiert ist.
 *
 * Problem 2: tsconfig.preload.json kompiliert core Dateien als CommonJS in electron/dist/electron/core/,
 * während electron/tsconfig.json sie als ES Modules in electron/dist/core/ kompiliert.
 * Die CommonJS-Versionen müssen entfernt werden, da sie Konflikte verursachen.
 *
 * Lösung:
 * 1. Ersetze @sentry/electron/main/index.js durch @sentry/electron/main
 * 2. Entferne electron/dist/electron/core/ Verzeichnis (CommonJS-Versionen)
 */

const fs = require("fs");
const path = require("path");

const distDir = path.join(__dirname, "..", "electron", "dist", "electron");
const coreCommonJsDir = path.join(distDir, "core");

/**
 * Durchsucht rekursiv alle .js Dateien und korrigiert Sentry Import-Pfade.
 */
function fixSentryImports(dir) {
  const files = fs.readdirSync(dir, { withFileTypes: true });

  for (const file of files) {
    const fullPath = path.join(dir, file.name);

    if (file.isDirectory()) {
      fixSentryImports(fullPath);
    } else if (file.isFile() && file.name.endsWith(".js")) {
      let content = fs.readFileSync(fullPath, "utf8");

      // Ersetze @sentry/electron/main/index.js durch @sentry/electron/main
      const originalContent = content;
      content = content.replace(/@sentry\/electron\/main\/index\.js/g, "@sentry/electron/main");

      // Nur schreiben, wenn Änderungen vorgenommen wurden
      if (content !== originalContent) {
        fs.writeFileSync(fullPath, content, "utf8");
        console.log(`[fix-sentry-imports] Korrigiert: ${fullPath}`);
      }
    }
  }
}

if (fs.existsSync(distDir)) {
  console.log(`[fix-sentry-imports] Durchsuche: ${distDir}`);
  fixSentryImports(distDir);

  // Entferne CommonJS-Versionen von core Dateien
  if (fs.existsSync(coreCommonJsDir)) {
    console.log(`[fix-sentry-imports] Entferne CommonJS-Versionen: ${coreCommonJsDir}`);
    fs.rmSync(coreCommonJsDir, { recursive: true, force: true });
    console.log(`[fix-sentry-imports] CommonJS-Versionen entfernt`);
  }

  console.log("[fix-sentry-imports] Fertig!");
} else {
  console.warn(`[fix-sentry-imports] Verzeichnis nicht gefunden: ${distDir}`);
}
