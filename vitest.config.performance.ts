import { defineConfig } from "vitest/config";
import path from "path";

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
    extensions: [".ts", ".tsx", ".mts", ".js", ".jsx", ".mjs"],
    conditions: ["import", "module", "browser", "default"],
  },
  esbuild: {
    target: "node18",
  },
});
