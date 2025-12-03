# Testing-Strategie

Diese Dokumentation beschreibt die Testing-Strategie für WAWISync.

## Übersicht

WAWISync verwendet Vitest für Testing. Die Test-Strategie umfasst:

- Unit-Tests für Domain-Logik
- Integration-Tests für Services
- Paritäts-Tests für Python-Skript-Kompatibilität

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

- Mindestens 80% Test-Coverage
- 100% Coverage für kritische Domain-Logik

### Coverage-Report

```bash
npm run test:coverage
```

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

### Verwendung

```typescript
import { sampleProducts } from "../fixtures/sample-products.json";
import { sampleCsv } from "../fixtures/sample.csv";
```

## Continuous Integration

### GitHub Actions

Tests werden automatisch in CI ausgeführt:

- Bei jedem Push
- Bei Pull Requests
- Für verschiedene Node.js-Versionen

## Weitere Informationen

- [Vitest Documentation](https://vitest.dev/)
- [Testing Best Practices](https://kentcdodds.com/blog/common-mistakes-with-react-testing-library)
