import { defineConfig } from "vitest/config";
import path from "path";
import fs from "fs";

/**
 * Separate Vitest-Konfiguration für Performance-Tests
 *
 * Performance-Tests benötigen:
 * - Längere Timeouts
 * - Andere Coverage-Einstellungen (optional)
 * - Spezielle Test-Umgebung
 */
export default defineConfig({
  test: {
    globals: true,
    environment: "node",
    // Performance-Tests benötigen längere Timeouts
    testTimeout: 300000, // 5 Minuten
    hookTimeout: 60000, // 1 Minute
    teardownTimeout: 30000, // 30 Sekunden
    // Nur Performance-Tests ausführen
    include: ["tests/performance/**/*.test.ts"],
    exclude: [
      "**/node_modules/**",
      "**/dist/**",
      "**/out/**",
      "**/tests/unit/**",
      "**/tests/integration/**",
      "**/tests/parity/**",
      "**/tests/e2e/**",
      "**/tests/accessibility/**",
    ],
    // Coverage optional für Performance-Tests
    coverage: {
      provider: "v8",
      reporter: ["text", "json"],
      include: ["core/**/*.ts", "electron/services/**/*.ts"],
      exclude: ["**/*.test.ts", "**/node_modules/**", "**/dist/**", "**/out/**"],
      // Keine Thresholds für Performance-Tests
      thresholds: undefined,
    },
  },
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./"),
    },
    // Priorisiere .ts über .js für bessere TypeScript-Unterstützung
    extensions: [".ts", ".tsx", ".mts", ".js", ".jsx", ".mjs"],
    // Erlaube Auflösung von .js zu .ts
    conditions: ["import", "module", "browser", "default"],
  },
  esbuild: {
    target: "node18",
  },
  plugins: [
    {
      name: "resolve-ts-from-js",
      enforce: "pre",
      resolveId(id, importer) {
        // Wenn ein Import mit .js endet und nicht aus node_modules kommt, versuche .ts zu finden
        if (
          id.endsWith(".js") &&
          importer &&
          !id.startsWith("node:") &&
          !id.includes("node_modules") &&
          !id.startsWith("@")
        ) {
          const pathModule = path;

          try {
            // Normalisiere den Import-Pfad
            let resolvedPath: string;
            if (id.startsWith(".")) {
              // Relativer Import: Auflösen relativ zum importer
              const importerDir = pathModule.dirname(importer);
              resolvedPath = pathModule.resolve(importerDir, id);
            } else {
              // Absoluter Import vom Projekt-Root
              resolvedPath = pathModule.resolve(process.cwd(), id);
            }

            // Versuche .ts Datei zu finden (prioritär)
            const tsPath = resolvedPath.replace(/\.js$/, ".ts");
            // eslint-disable-next-line security/detect-non-literal-fs-filename
            if (fs.existsSync(tsPath)) {
              return tsPath;
            }

            // Falls .ts nicht existiert, versuche .js
            const jsPath = resolvedPath;
            // eslint-disable-next-line security/detect-non-literal-fs-filename
            if (fs.existsSync(jsPath)) {
              return jsPath;
            }

            // Fallback: Versuche vom Projekt-Root aus, wenn der Pfad nicht existiert
            const projectRoot = process.cwd();
            if (
              !resolvedPath.startsWith(projectRoot) ||
              // eslint-disable-next-line security/detect-non-literal-fs-filename
              (!fs.existsSync(tsPath) &&
                // eslint-disable-next-line security/detect-non-literal-fs-filename
                !fs.existsSync(jsPath))
            ) {
              // Extrahiere den relativen Teil nach den ../
              const parts = id.split("/").filter((p: string) => p && p !== "..");
              const alternativePath = pathModule.resolve(projectRoot, ...parts);
              const alternativeTsPath = alternativePath.replace(/\.js$/, ".ts");
              // eslint-disable-next-line security/detect-non-literal-fs-filename
              if (fs.existsSync(alternativeTsPath)) {
                return alternativeTsPath;
              }
              const alternativeJsPath = alternativePath;
              // eslint-disable-next-line security/detect-non-literal-fs-filename
              if (fs.existsSync(alternativeJsPath)) {
                return alternativeJsPath;
              }
            }
          } catch {
            // Ignoriere Fehler und lasse Vite die Standard-Auflösung verwenden
          }
        }
        return null;
      },
    },
  ],
});
