/**
 * Separate Vitest-Konfiguration für Accessibility-Tests
 *
 * Diese Konfiguration verwendet jsdom für React-Komponenten-Tests.
 */

import { defineConfig } from "vitest/config";
import path from "path";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],
  test: {
    globals: true,
    environment: "jsdom", // jsdom für React-Komponenten
    setupFiles: ["./tests/accessibility/setup.ts"],
    include: ["tests/accessibility/**/*.test.{ts,tsx}"],
    exclude: [
      "**/node_modules/**",
      "**/dist/**",
      "**/out/**",
      "**/tests/e2e/**",
      "**/*.spec.ts", // Playwright verwendet .spec.ts
    ],
    typecheck: {
      tsconfig: "./tsconfig.a11y.json",
    },
    coverage: {
      provider: "v8",
      reporter: ["text", "json", "html"],
      include: ["app/components/**/*.{ts,tsx}"],
      exclude: [
        "**/*.test.{ts,tsx}",
        "**/*.spec.{ts,tsx}",
        "**/node_modules/**",
        "**/dist/**",
        "**/out/**",
      ],
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
