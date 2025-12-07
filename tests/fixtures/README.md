# Test Fixtures

Dieses Verzeichnis enthält Test-Daten (Fixtures) für verschiedene Test-Szenarien.

## Übersicht

Die Fixtures sind in verschiedene Kategorien unterteilt:

- **Standard-Fixtures:** Basis-Test-Daten für normale Test-Szenarien
- **Edge-Case-Fixtures:** Test-Daten für Grenzfälle und Fehlerbehandlung
- **Encoding-Fixtures:** Test-Daten mit verschiedenen Zeichenkodierungen
- **Large-Dataset-Fixtures:** Test-Daten für Performance-Tests mit großen Datenmengen

## Dateien

### Standard-Fixtures

#### `sample.csv`
Basis-CSV-Datei mit Standard-Test-Daten. Enthält verschiedene Produkte mit unterschiedlichen Preisformaten und Beständen.

**Format:** Semikolon-getrennt, UTF-8
**Spalten:** SKU, Name, Preis, Bestand

#### `sample-products.json`
Basis-Shopify-Produkt-Daten im GraphQL-Format. Enthält verschiedene Produkttypen:
- Produkte mit SKU
- Produkte ohne SKU
- Produkte mit Barcode
- Produkte mit mehreren Wörtern im Namen

**Format:** JSON-Array von Shopify-Produkten

#### `expected-outputs.json`
Erwartete Ausgaben für Paritäts-Tests. Enthält:
- Preis-Normalisierungs-Ergebnisse
- Matching-Ergebnisse für verschiedene Szenarien

**Format:** JSON-Objekt mit `priceNormalization` und `matching` Arrays

### Edge-Case-Fixtures

#### `csv-edge-cases.csv`
CSV-Datei mit verschiedenen Edge-Cases:
- Leere SKU-Werte
- Fehlende Preise
- Fehlende Bestände
- Sonderzeichen in Namen
- Sehr lange Produktnamen
- Unicode-Zeichen

**Verwendung:** Tests für Fehlerbehandlung und Validierung

### Encoding-Fixtures

#### `csv-encodings.csv`
CSV-Datei mit verschiedenen Zeichenkodierungen und Sonderzeichen:
- UTF-8 Standard
- Umlaute (ä, ö, ü)
- Sonderzeichen (ß)

**Verwendung:** Tests für Encoding-Erkennung und -Verarbeitung

### Format-Fixtures

#### `csv-tab-delimited.csv`
CSV-Datei mit Tab-Trennung statt Semikolon.

**Verwendung:** Tests für verschiedene Delimiter-Erkennung

### Large-Dataset-Fixtures

#### `shopify-products-large.json`
Shopify-Produkt-Daten für Performance-Tests. Enthält:
- Produkte mit mehreren Varianten
- Große Datenmengen

**Verwendung:** Performance-Tests und Load-Tests

## Verwendung

### In Tests

```typescript
import { loadFixture } from "../helpers/test-utils";

// CSV-Datei laden
const csvContent = loadFixture<string>("sample.csv");

// JSON-Datei laden
const products = loadFixture<Product[]>("sample-products.json");

// Erwartete Ausgaben laden
const expected = loadFixture<ExpectedOutputs>("expected-outputs.json");
```

### Mit Mock-Generatoren

```typescript
import {
  createMockProduct,
  createMockCsvRow,
  createMockProducts,
} from "../helpers/mock-generators";

// Einzelnes Produkt erstellen
const product = createMockProduct({ title: "Custom Product" });

// Mehrere Produkte erstellen
const products = createMockProducts(10);

// CSV-Zeile erstellen
const csvRow = createMockCsvRow({ sku: "CUSTOM-SKU" });
```

## Versionierung

### Version 1.0 (aktuell)
- Basis-Fixtures für Standard-Tests
- Edge-Case-Fixtures
- Encoding-Fixtures

### Zukünftige Versionen
- Weitere Edge-Cases
- Performance-Test-Fixtures mit sehr großen Datenmengen
- Multi-Language-Fixtures

## Hinweise

- **Nicht committen:** Sensible Daten (echte Produktdaten, API-Keys) sollten nicht in Fixtures gespeichert werden
- **Konsistenz:** Fixtures sollten konsistent sein - Änderungen an einer Fixture können bestehende Tests beeinflussen
- **Dokumentation:** Neue Fixtures sollten in dieser README dokumentiert werden

## Erstellen neuer Fixtures

1. **Datei erstellen:** Neue Fixture-Datei im `tests/fixtures/` Verzeichnis
2. **Format wählen:** CSV für Tabellendaten, JSON für strukturierte Daten
3. **Dokumentieren:** Fixture in dieser README dokumentieren
4. **Testen:** Sicherstellen, dass die Fixture korrekt geladen wird

## Best Practices

- **Realistische Daten:** Fixtures sollten realistische, aber anonymisierte Daten enthalten
- **Vollständigkeit:** Fixtures sollten alle relevanten Felder enthalten
- **Wiederverwendbarkeit:** Fixtures sollten für mehrere Tests verwendbar sein
- **Isolation:** Jeder Test sollte unabhängig von anderen Tests sein



