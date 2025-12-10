# Testing-Strategie

Diese Dokumentation beschreibt die Testing-Strategie für WAWISync.

## Übersicht

WAWISync verwendet Vitest und Playwright für Testing. Die Test-Strategie umfasst:

- Unit-Tests für Domain-Logik
- Integration-Tests für Services
- Paritäts-Tests für Python-Skript-Kompatibilität
- Accessibility-Tests für UI-Komponenten (WCAG 2.1 Level AA)
- E2E-Tests für kritische User-Flows

## Test-Struktur

```
tests/
├── unit/              # Unit-Tests
│   ├── domain/        # Domain-Logik-Tests
│   └── utils/         # Utility-Tests
├── integration/        # Integration-Tests
│   └── services/      # Service-Integration-Tests
└── parity/            # Paritäts-Tests
    ├── matching.ts    # Matching-Parität
    └── price.ts       # Preis-Normalisierung-Parität
```

## Unit-Tests

### Domain-Logik

**Location:** `tests/unit/domain/`

Testen Sie pure Business Logic ohne Abhängigkeiten:

```typescript
import { describe, it, expect } from "vitest";
import { matchProduct } from "../../../core/domain/matching";

describe("matchProduct", () => {
  it("should match by SKU", () => {
    const result = matchProduct({ sku: "ABC123" }, [{ sku: "ABC123", id: "1" }]);
    expect(result).toBeDefined();
  });
});
```

### Utilities

**Location:** `tests/unit/utils/`

Testen Sie Utility-Funktionen:

```typescript
import { normalizeString } from "../../../core/utils/normalization";

describe("normalizeString", () => {
  it("should normalize strings", () => {
    expect(normalizeString("  Test  ")).toBe("test");
  });
});
```

## Integration-Tests

### Services

**Location:** `tests/integration/services/`

Testen Sie Service-Integrationen:

```typescript
import { describe, it, expect, beforeEach } from "vitest";
import { getConfigService } from "../../../electron/services/config-service";

describe("ConfigService", () => {
  beforeEach(() => {
    // Setup
  });

  it("should save and load config", async () => {
    const config = { shop: null };
    await getConfigService().setConfig(config);
    const loaded = await getConfigService().getConfig();
    expect(loaded).toEqual(config);
  });
});
```

## Paritäts-Tests

### Python-Skript-Kompatibilität

**Location:** `tests/parity/`

Vergleichen Sie Ergebnisse mit dem Python-Skript:

```typescript
import { describe, it, expect } from "vitest";
import { matchProduct } from "../../core/domain/matching";
import { expectedOutputs } from "../fixtures/expected-outputs.json";

describe("Matching Parity", () => {
  it("should match products like Python script", () => {
    const result = matchProduct(input, products);
    expect(result).toEqual(expectedOutputs.matching);
  });
});
```

## Test-Coverage

### Ziel

- **Mindestens 80% Test-Coverage** für alle Metriken (Lines, Functions, Branches, Statements)
- **100% Coverage** für kritische Domain-Logik
- **Coverage-Thresholds** werden automatisch in CI/CD geprüft

### Coverage-Thresholds

Die folgenden Thresholds sind in `vitest.config.ts` konfiguriert:

- **Lines:** 80%
- **Functions:** 80%
- **Branches:** 80%
- **Statements:** 80%

### Coverage-Report

```bash
# Coverage-Report generieren
npm run test:coverage

# Coverage-Report wird in coverage/ gespeichert
# - coverage/index.html: HTML-Report
# - coverage/coverage-summary.json: JSON-Report
```

### Coverage-Tracking

- **CI/CD:** Coverage-Reports werden automatisch in GitHub Actions generiert
- **Artifacts:** Coverage-Reports werden als Artifacts gespeichert (30 Tage)
- **Badge:** Coverage-Badge im README zeigt aktuellen Coverage-Status

### Coverage-Verbesserung

1. **Identifiziere ungetestete Bereiche:** Öffne `coverage/index.html`
2. **Priorisiere kritische Bereiche:** Domain-Logik sollte 100% Coverage haben
3. **Schreibe Tests:** Füge Tests für ungetestete Bereiche hinzu
4. **Prüfe Thresholds:** Stelle sicher, dass Thresholds erfüllt sind

## Test-Best-Practices

### 1. AAA-Pattern

Verwenden Sie Arrange-Act-Assert:

```typescript
it("should do something", () => {
  // Arrange
  const input = "test";

  // Act
  const result = functionUnderTest(input);

  // Assert
  expect(result).toBe("expected");
});
```

### 2. Isolierung

Jeder Test sollte isoliert sein:

```typescript
beforeEach(() => {
  // Setup für jeden Test
});

afterEach(() => {
  // Cleanup nach jedem Test
});
```

### 3. Aussagekräftige Namen

Verwenden Sie beschreibende Test-Namen:

```typescript
it("should match product by SKU when SKU is exact match", () => {
  // ...
});
```

### 4. Mocking

Mocken Sie externe Abhängigkeiten:

```typescript
import { vi } from "vitest";

vi.mock("../../electron/services/shopify-service", () => ({
  getProducts: vi.fn().mockResolvedValue([]),
}));
```

## Test-Fixtures

### Location

**`tests/fixtures/`**

Siehe [tests/fixtures/README.md](../../tests/fixtures/README.md) für eine vollständige Dokumentation aller verfügbaren Fixtures.

### Verwendung

#### Fixtures laden

```typescript
import { loadFixture } from "../helpers/test-utils";

// CSV-Datei laden
const csvContent = loadFixture<string>("sample.csv");

// JSON-Datei laden
const products = loadFixture<Product[]>("sample-products.json");
```

#### Mock-Daten generieren

```typescript
import {
  createMockProduct,
  createMockCsvRow,
  createMockProducts,
  createMockCsvRows,
  createMockProductWithVariants,
  createMockProductEdgeCase,
  createMockCsvRowWithPriceFormat,
  createMockSyncTestData,
} from "../helpers/mock-generators";

// Einzelnes Produkt erstellen
const product = createMockProduct({ title: "Custom Product" });

// Mehrere Produkte erstellen
const products = createMockProducts(10);

// CSV-Zeile erstellen
const csvRow = createMockCsvRow({ sku: "CUSTOM-SKU" });

// Edge-Cases testen
const emptySkuProduct = createMockProductEdgeCase("empty-sku");
const specialCharsProduct = createMockProductEdgeCase("special-chars");

// Verschiedene Preisformate testen
const commaPrice = createMockCsvRowWithPriceFormat("comma");
const currencyPrice = createMockCsvRowWithPriceFormat("currency");

// Vollständigen Sync-Test-Datensatz erstellen
const { products, csvRows } = createMockSyncTestData(10, 10);
```

### Verfügbare Fixtures

- **Standard:** `sample.csv`, `sample-products.json`, `expected-outputs.json`
- **Edge-Cases:** `csv-edge-cases.csv`
- **Encoding:** `csv-encodings.csv`
- **Formate:** `csv-tab-delimited.csv`
- **Performance:** `shopify-products-large.json`

## Accessibility-Tests

### Übersicht

Accessibility-Tests prüfen WCAG 2.1 Level AA Compliance für alle UI-Komponenten.

**Location:** `tests/accessibility/`

### Setup

Accessibility-Tests verwenden:

- `jest-axe` für automatische Accessibility-Checks
- `@testing-library/react` für React-Komponenten-Tests
- `jsdom` als Test-Environment

### Beispiel

```typescript
import { describe, it, expect } from "vitest";
import { render } from "@testing-library/react";
import { axe, toHaveNoViolations } from "jest-axe";
import { CsvUpload } from "../../app/components/csv-upload";

describe("CsvUpload Component", () => {
  it("should have no accessibility violations", async () => {
    const { container } = render(
      <CsvUpload onFileSelected={vi.fn()} />
    );

    const results = await axe(container);
    expect(results).toHaveNoViolations();
  });
});
```

### Ausführung

```bash
# Nur Accessibility-Tests
npm run test:a11y

# Alle Tests inkl. Accessibility
npm run test:all
```

### Getestete Aspekte

- ARIA-Labels und -Attribute
- Keyboard-Navigation
- Color-Contrast
- Heading-Hierarchy
- Form-Labels
- Table-Semantics

## E2E-Tests

### Übersicht

E2E-Tests testen vollständige User-Flows über die gesamte Anwendung.

**Location:** `tests/e2e/`
**Framework:** Playwright

### Test-Szenarien

- **Sync-Workflow:** CSV-Upload → Mapping → Vorschau → Sync → Ergebnis
- **Settings-Konfiguration:** Shop-Konfiguration, Auto-Sync-Einstellungen
- **Dashboard-Navigation:** Dashboard-Ansicht, Historie-Anzeige

### Beispiel

```typescript
import { test, expect } from "@playwright/test";

test.describe("Sync Workflow", () => {
  test("should display sync page", async ({ page }) => {
    await page.goto("/sync");
    await expect(page).toHaveTitle(/WAWISync/i);
  });
});
```

### Ausführung

```bash
# E2E-Tests ausführen
npm run test:e2e

# E2E-Tests mit UI (Playwright UI Mode)
npm run test:e2e:ui
```

### Hinweise

- E2E-Tests erfordern eine laufende Next.js-Dev-Server (wird automatisch gestartet)
- Electron-spezifische Tests erfordern zusätzliche Konfiguration
- Tests werden in CI/CD automatisch ausgeführt

## Mutation Testing

### Übersicht

Mutation Testing bewertet die Qualität der Tests, indem es absichtlich Fehler (Mutationen) in den Code einbaut und prüft, ob die Tests diese Fehler finden. Wenn Tests Mutationen nicht erkennen, sind sie unvollständig.

**Tool:** Stryker  
**Location:** `stryker.conf.json`

### Was ist Mutation Testing?

Mutation Testing geht über Code-Coverage hinaus:

- **Code-Coverage** zeigt, welche Codezeilen ausgeführt werden
- **Mutation Testing** zeigt, ob Tests tatsächlich Fehler erkennen

**Beispiel:**

```typescript
// Original Code
function calculateTotal(price: number, quantity: number): number {
  return price * quantity;
}

// Mutation: * wird zu +
function calculateTotal(price: number, quantity: number): number {
  return price + quantity; // Falsch!
}

// Wenn Tests diese Mutation nicht erkennen, sind sie unvollständig
```

### Konfiguration

Mutation Testing ist für folgende Bereiche konfiguriert:

- `core/**/*.ts` - Core Domain-Logik
- `electron/services/**/*.ts` - Service-Layer

**Thresholds:**

- **High (70%+):** Exzellente Testqualität
- **Low (50-70%):** Gute Testqualität, Verbesserungspotenzial
- **Break (<40%):** Tests müssen verbessert werden

### Ausführung

```bash
# Vollständige Mutation Tests (kann 15-30 Minuten dauern)
npm run test:mutation

# Incremental Mode (nur geänderte Dateien, schneller)
npm run test:mutation:incremental

# CI-Modus mit HTML-Report
npm run test:mutation:ci
```

### Mutation-Reports lesen

Nach der Ausführung wird ein HTML-Report generiert:

1. **Öffne den Report:** `reports/mutation/mutation.html`
2. **Mutation Score:** Zeigt den Prozentsatz der getöteten Mutationen
3. **Überlebene Mutationen:** Zeigen unvollständige Tests
4. **Getötete Mutationen:** Zeigen, dass Tests funktionieren

### Mutation-Typen

Stryker erzeugt verschiedene Mutationen:

- **Arithmetische Operatoren:** `+` → `-`, `*` → `/`
- **Logische Operatoren:** `&&` → `||`, `!` → (entfernen)
- **Vergleichsoperatoren:** `===` → `!==`, `>` → `<`
- **Bedingte Operatoren:** `if` → entfernen, `else` → entfernen
- **Return-Statements:** `return x` → `return null`
- **Variablen:** `let x = 5` → `let x = 0`

### Best Practices

#### 1. Incremental Mode für lokale Entwicklung

```bash
# Nur geänderte Dateien mutieren (viel schneller)
npm run test:mutation:incremental
```

#### 2. Fokus auf kritische Bereiche

Mutation Testing ist rechenintensiv. Fokussiere auf:

- Domain-Logik (Core)
- Business-Critical Services
- Komplexe Algorithmen

#### 3. Überlebene Mutationen analysieren

Wenn Mutationen überleben:

1. **Prüfe den Test:** Deckt er den mutierten Code ab?
2. **Erweitere den Test:** Füge Assertions hinzu
3. **Prüfe Edge Cases:** Werden alle Szenarien getestet?

#### 4. Falsche Positive ignorieren

Manche Mutationen sind "falsche Positive":

- Mutationen, die semantisch gleichwertig sind
- Mutationen in Code, der nicht testbar ist

Diese können in der Konfiguration ignoriert werden.

### Performance-Optimierungen

Die Konfiguration ist für Performance optimiert:

- **`coverageAnalysis: "perTest"`** - Schneller als "all"
- **`typescriptChecker.prioritizePerformanceOverAccuracy: true`** - Schnellere TypeScript-Checks
- **Incremental Mode** - Nur geänderte Dateien mutieren

### CI/CD-Integration

Mutation Tests können in CI/CD integriert werden:

- **Optional:** Da sehr langsam (10-30+ Minuten)
- **Empfohlen:** Nur auf `main` Branch oder wöchentlich
- **Reports:** HTML-Reports als Artefakte hochladen

### Weitere Informationen

- [Stryker Documentation](https://stryker-mutator.io/)
- [Mutation Testing Explained](https://stryker-mutator.io/docs/mutation-testing-elements/)

## Continuous Integration

### GitHub Actions

Tests werden automatisch in CI ausgeführt:

- Bei jedem Push
- Bei Pull Requests
- Für verschiedene Node.js-Versionen
- Unit-Tests, Integration-Tests, Paritäts-Tests und Accessibility-Tests

## Weitere Informationen

- [Vitest Documentation](https://vitest.dev/)
- [Testing Best Practices](https://kentcdodds.com/blog/common-mistakes-with-react-testing-library)
