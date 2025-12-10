import { defineConfig } from "vitest/config";
import path from "path";
import fs from "fs";

export default defineConfig({
  test: {
    globals: true,
    environment: "node",
    // E2E-Tests werden von Playwright ausgeführt, nicht von Vitest
    // Accessibility-Tests benötigen jsdom und werden mit vitest.config.a11y.ts ausgeführt
    exclude: [
      "**/node_modules/**",
      "**/dist/**",
      "**/out/**",
      "**/tests/e2e/**",
      "**/tests/accessibility/**", // Accessibility-Tests benötigen jsdom
      "**/*.e2e.spec.ts",
      "**/*.e2e.test.ts",
      "**/*.spec.ts", // Playwright verwendet .spec.ts
    ],
    coverage: {
      provider: "v8",
      reporter: ["text", "json", "html"],
      include: ["core/**/*.ts", "electron/services/**/*.ts"],
      exclude: [
        "**/*.test.ts",
        "**/*.spec.ts",
        "**/node_modules/**",
        "**/dist/**",
        "**/out/**",
        "electron/main.ts",
        "electron/preload.ts",
      ],
      thresholds: {
        lines: 80,
        functions: 80,
        branches: 80,
        statements: 80,
      },
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
            if (fs.existsSync(tsPath)) {
              return tsPath;
            }

            // Falls .ts nicht existiert, versuche .js
            const jsPath = resolvedPath;
            if (fs.existsSync(jsPath)) {
              return jsPath;
            }

            // Fallback: Versuche vom Projekt-Root aus, wenn der Pfad nicht existiert
            const projectRoot = process.cwd();
            if (
              !resolvedPath.startsWith(projectRoot) ||
              (!fs.existsSync(tsPath) && !fs.existsSync(jsPath))
            ) {
              // Extrahiere den relativen Teil nach den ../
              const parts = id.split("/").filter((p: string) => p && p !== "..");
              const alternativePath = pathModule.resolve(projectRoot, ...parts);
              const alternativeTsPath = alternativePath.replace(/\.js$/, ".ts");
              if (fs.existsSync(alternativeTsPath)) {
                return alternativeTsPath;
              }
              const alternativeJsPath = alternativePath;
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
