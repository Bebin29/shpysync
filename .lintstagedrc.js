/**
 * lint-staged Konfiguration
 * Führt Linting, Formatierung und Tests nur für geänderte Dateien aus
 */

module.exports = {
  // TypeScript/JavaScript Dateien
  "*.{ts,tsx,js,jsx}": [
    // ESLint für geänderte Dateien
    "eslint --fix",
    // Prettier Formatierung
    "prettier --write",
  ],

  // JSON, CSS, Markdown und andere Dateien
  "*.{json,css,scss,md,yml,yaml}": [
    // Prettier Formatierung
    "prettier --write",
  ],

  // HINWEIS: TypeScript Typ-Prüfung wurde aus lint-staged entfernt, da sie zu lange dauert
  // TypeScript-Prüfung sollte manuell mit `npm run type-check` ausgeführt werden
  // oder in CI/CD-Pipeline integriert werden
};
