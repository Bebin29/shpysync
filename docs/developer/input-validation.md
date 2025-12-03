# Input Validation & Sanitization

Dieses Dokument beschreibt die Strategie für Input-Validierung und Sanitization in WAWISync.

## Übersicht

WAWISync validiert und sanitized alle User-Inputs, um Sicherheitsrisiken wie SQL-Injection, XSS und andere Angriffe zu verhindern.

## Validierungs-Framework

### Zod

WAWISync verwendet **Zod** für Schema-basierte Validierung:

**Vorteile:**

- Type-Safe Validierung
- Automatische Type-Inference
- Klare Fehlermeldungen
- Komposierbare Schemas

**Dateien:**

- `electron/lib/validators.ts` - IPC-Validatoren
- `core/domain/validators.ts` - Domain-Validatoren

## Validierungs-Bereiche

### 1. Shop-Konfiguration

**Schema:** `shopConfigSchema` (Zod)

**Validierte Felder:**

- `shopUrl` - Muss auf `.myshopify.com` enden
- `accessToken` - Muss mit `shpat_` oder `shpca_` beginnen
- `locationId` - Muss gültige GID sein
- `locationName` - String-Validierung

**Beispiel:**

```typescript
const shopConfigSchema = z.object({
  shopUrl: z
    .string()
    .url()
    .refine((url) => url.endsWith(".myshopify.com"), {
      message: "Shop-URL muss auf '.myshopify.com' enden",
    }),
  accessToken: z
    .string()
    .refine((token) => token.startsWith("shpat_") || token.startsWith("shpca_"), {
      message: "Token muss mit 'shpat_' oder 'shpca_' beginnen",
    }),
  locationId: z.string().min(1),
  locationName: z.string().min(1),
});
```

### 2. CSV-Daten

**Validierung:**

- Spalten-Existenz-Prüfung
- Datentyp-Validierung (Zahlen, Strings)
- Leere Werte-Behandlung
- Encoding-Validierung (UTF-8, Windows-1252)

**Dateien:**

- `electron/services/csv-service.ts` - CSV-Parsing
- `core/domain/csv-parser.ts` - CSV-Validierung

**Beispiel:**

```typescript
// Spalten-Validierung
if (!csvColumns.includes(skuColumn)) {
  throw WawiError.csvError("CSV_MISSING_COLUMN", `Spalte '${skuColumn}' nicht gefunden`);
}

// Datentyp-Validierung
const price = parseFloat(row[priceColumn]);
if (isNaN(price) || price < 0) {
  throw WawiError.csvError("CSV_INVALID_FORMAT", `Ungültiger Preis in Zeile ${index}`);
}
```

### 3. Spalten-Mapping

**Schema:** `columnMappingSchema` (Zod)

**Validierte Felder:**

- `skuColumn` - Muss existierende CSV-Spalte sein
- `nameColumn` - Muss existierende CSV-Spalte sein
- `priceColumn` - Muss existierende CSV-Spalte sein
- `stockColumn` - Muss existierende CSV-Spalte sein

### 4. GraphQL-Queries

**Validierung:**

- Query-String-Validierung
- Variable-Validierung
- Response-Validierung

**Dateien:**

- `core/infra/shopify/client.ts` - GraphQL-Client
- `core/infra/shopify/queries.ts` - Query-Definitionen

## Sanitization

### CSV-Daten

**Sanitization-Schritte:**

1. **Encoding-Normalisierung:** Windows-1252 → UTF-8
2. **Whitespace-Trim:** Führende/nachfolgende Leerzeichen entfernen
3. **Sonderzeichen:** HTML-Entities escapen (falls nötig)
4. **Leere Zeilen:** Ignorieren

**Beispiel:**

```typescript
// Encoding-Normalisierung
const content = iconv.decode(buffer, "windows-1252");

// Whitespace-Trim
const sku = row[skuColumn]?.trim() || "";

// Leere Zeilen ignorieren
if (!sku) {
  continue; // Überspringe leere Zeilen
}
```

### SQL-Injection-Prävention

**SQLite-Parameterized Queries:**

WAWISync verwendet **better-sqlite3** mit Parameterized Queries:

**Beispiel:**

```typescript
// ✅ Sicher: Parameterized Query
const stmt = db.prepare("SELECT * FROM products WHERE sku = ?");
const product = stmt.get(sku);

// ❌ Unsicher: String-Interpolation (NIEMALS!)
const product = db.prepare(`SELECT * FROM products WHERE sku = '${sku}'`).get();
```

**Dateien:**

- `electron/services/cache-service.ts` - Cache-Datenbank
- Alle SQL-Queries verwenden Parameterized Statements

### XSS-Prävention

**React-Schutz:**

- React escaped automatisch alle Werte in JSX
- Keine `dangerouslySetInnerHTML` ohne Sanitization

**Zusätzliche Maßnahmen:**

- Content Security Policy (CSP) im Electron Renderer
- Input-Sanitization vor Rendering

**Beispiel:**

```typescript
// ✅ Sicher: React escaped automatisch
<div>{userInput}</div>

// ❌ Unsicher: dangerouslySetInnerHTML (VERMEIDEN!)
<div dangerouslySetInnerHTML={{ __html: userInput }} />
```

## Error-Handling

### Validierungs-Fehler

**WawiError-Typen:**

- `CSV_INVALID_FORMAT` - Ungültiges CSV-Format
- `CSV_MISSING_COLUMN` - Fehlende Spalte
- `CONFIG_INVALID` - Ungültige Konfiguration
- `CONFIG_SHOP_URL_INVALID` - Ungültige Shop-URL
- `CONFIG_TOKEN_INVALID` - Ungültiges Token

**Beispiel:**

```typescript
try {
  const config = shopConfigSchema.parse(input);
  // Validierung erfolgreich
} catch (error) {
  if (error instanceof z.ZodError) {
    throw WawiError.configError("CONFIG_INVALID", error.errors[0].message);
  }
}
```

## Best Practices

### ✅ DO

- Validieren Sie alle User-Inputs mit Zod
- Verwenden Sie Parameterized Queries für SQL
- Sanitizen Sie CSV-Daten vor Verarbeitung
- Zeigen Sie benutzerfreundliche Fehlermeldungen
- Loggen Sie Validierungs-Fehler für Debugging

### ❌ DON'T

- Keine String-Interpolation in SQL-Queries
- Keine `dangerouslySetInnerHTML` ohne Sanitization
- Keine Annahme, dass Inputs valide sind
- Keine sensiblen Daten in Fehlermeldungen
- Keine Bypass-Validierung für "Performance"

## Testing

### Unit-Tests

**Dateien:**

- `tests/unit/core/domain/validators.test.ts`
- `tests/unit/electron/lib/validators.test.ts`

**Beispiele:**

```typescript
describe("shopConfigSchema", () => {
  it("should validate valid shop URL", () => {
    const config = { shopUrl: "https://example.myshopify.com" };
    expect(() => shopConfigSchema.parse(config)).not.toThrow();
  });

  it("should reject invalid shop URL", () => {
    const config = { shopUrl: "https://example.com" };
    expect(() => shopConfigSchema.parse(config)).toThrow();
  });
});
```

## Weitere Informationen

- [Zod Documentation](https://zod.dev/)
- [OWASP Input Validation Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/Input_Validation_Cheat_Sheet.html)
- [React XSS Prevention](https://react.dev/learn/escape-hatches#dangerously-setting-the-inner-html)
- [SQL Injection Prevention](https://owasp.org/www-community/attacks/SQL_Injection)
