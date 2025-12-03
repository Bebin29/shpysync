# Rate Limiting

Dieses Dokument beschreibt die Rate-Limiting-Strategie für Shopify API-Aufrufe in WAWISync.

## Übersicht

Shopify hat Rate-Limits für API-Aufrufe, um die API-Stabilität zu gewährleisten. WAWISync implementiert eine Client-seitige Rate-Limiting-Strategie, um diese Limits einzuhalten.

## Shopify Rate-Limits

### GraphQL Admin API

**Standard-Limits:**

- **Shop API Call Limit:** Variiert je nach Plan (z.B. 40 Calls/Sekunde)
- **Header:** `X-Shopify-Shop-Api-Call-Limit: "40/40"` (used/limit)
- **Cost-Tracking:** `X-Request-Cost: "1.0"` (Query-Kosten)

**Bei Überschreitung:**

- HTTP 429 (Too Many Requests)
- `Retry-After` Header mit Wartezeit in Sekunden

### REST Admin API

**Hinweis:** REST Admin API ist seit 1. Oktober 2024 veraltet. WAWISync verwendet ausschließlich GraphQL.

## Implementierung

### Client-seitiges Rate-Limiting

**Datei:** `core/infra/shopify/client.ts`

**Strategie:**

1. **Standard-Sleep:** 200ms zwischen jedem Request
2. **Retry-Logik:** Exponential Backoff bei 429-Fehlern
3. **Rate-Limit-Monitoring:** Header-Parsing und Tracking

**Code-Beispiel:**

```typescript
// Standard-Sleep zwischen Requests
const DEFAULT_SLEEP_MS = 200;

// Retry-Konfiguration
const MAX_RETRIES = 5;
const BACKOFF_FACTOR = 1.5;

// Rate-Limit-Sleep
await new Promise((resolve) => setTimeout(resolve, DEFAULT_SLEEP_MS));
```

### Retry-Strategie

**Bei HTTP 429 (Rate-Limit):**

1. Prüfe `Retry-After` Header
2. Warte mindestens die angegebene Zeit
3. Exponential Backoff als Fallback
4. Maximal 5 Retry-Versuche

**Bei HTTP 5xx (Server-Fehler):**

1. Exponential Backoff
2. Maximal 5 Retry-Versuche

**Code-Beispiel:**

```typescript
if (axiosError.response?.status === 429) {
  const retryAfter = axiosError.response.headers["retry-after"];
  const waitTime = retryAfter
    ? Math.max(parseFloat(retryAfter) * 1000, 1000)
    : 1000 * Math.pow(BACKOFF_FACTOR, attempt);

  await new Promise((resolve) => setTimeout(resolve, waitTime));
  attempt++;
  continue;
}
```

## Rate-Limit-Monitoring

### Header-Parsing

**Funktion:** `parseRateLimitHeader(rateLimitHeader: string)`

**Format:** `"40/40"` (used/limit)

**Rückgabe:**

```typescript
interface RateLimitInfo {
  used: number;
  limit: number;
  remaining: number;
  percentage: number;
}
```

### Debug-Informationen

**Global verfügbar:**

```typescript
// Letzte Rate-Limit-Info
getLastRateLimitInfo(): RateLimitInfo | null

// Letzte Request-Cost
getLastRequestCost(): string | null

// Cost-Tracking-Info
getCostTrackingInfo(): { cost: string; rateLimit: RateLimitInfo | null }
```

**Verwendung:**

- UI-Anzeige des Rate-Limit-Status
- Debug-Logging
- Performance-Monitoring

## Best Practices

### ✅ DO

- Respektieren Sie die Rate-Limits
- Verwenden Sie Retry-Logik mit Backoff
- Überwachen Sie Rate-Limit-Header
- Implementieren Sie Client-seitiges Throttling
- Zeigen Sie Rate-Limit-Status in der UI an

### ❌ DON'T

- Keine aggressiven Retry-Versuche
- Keine Ignorierung von `Retry-After` Headers
- Keine parallelen Requests ohne Throttling
- Keine Rate-Limit-Überschreitungen

## Konfiguration

### Anpassbare Parameter

**In `core/infra/shopify/client.ts`:**

```typescript
const DEFAULT_SLEEP_MS = 200; // Sleep zwischen Requests
const MAX_RETRIES = 5; // Maximale Retry-Versuche
const BACKOFF_FACTOR = 1.5; // Exponential Backoff-Faktor
```

**Anpassung:**

- Für schnellere Syncs: Reduzieren Sie `DEFAULT_SLEEP_MS` (Vorsicht!)
- Für stabilere Syncs: Erhöhen Sie `DEFAULT_SLEEP_MS`
- Für bessere Retry-Logik: Anpassen Sie `BACKOFF_FACTOR`

## UI-Integration

### Rate-Limit-Anzeige

**In Settings:**

- Rate-Limit-Status nach Connection-Test
- Verbleibende API-Calls
- Cost-Tracking-Informationen

**Beispiel:**

```typescript
const rateLimitInfo = getLastRateLimitInfo();
if (rateLimitInfo) {
  console.log(
    `Rate Limit: ${rateLimitInfo.used}/${rateLimitInfo.limit} (${rateLimitInfo.percentage}%)`
  );
}
```

## Troubleshooting

### Rate-Limit wird überschritten

**Symptome:**

- HTTP 429 Fehler
- Syncs schlagen fehl
- Langsame API-Antworten

**Lösungen:**

1. Erhöhen Sie `DEFAULT_SLEEP_MS` (z.B. auf 500ms)
2. Reduzieren Sie die Anzahl paralleler Requests
3. Prüfen Sie die Rate-Limit-Header in Logs
4. Implementieren Sie adaptive Throttling

### Retry-Logik funktioniert nicht

**Symptome:**

- Keine automatischen Retries
- Fehler werden sofort geworfen

**Lösungen:**

1. Prüfen Sie die Retry-Konfiguration
2. Prüfen Sie die Error-Handler
3. Prüfen Sie die Network-Connectivity

## Performance-Optimierung

### Query-Optimierung

**GraphQL Cost-Minimierung:**

- Verwenden Sie spezifische Felder (keine `*`)
- Vermeiden Sie verschachtelte Queries
- Nutzen Sie Pagination für große Datensätze

**Beispiel:**

```graphql
# Gut: Spezifische Felder
query {
  products(first: 10) {
    edges {
      node {
        id
        title
        variants(first: 1) {
          edges {
            node {
              id
              price
            }
          }
        }
      }
    }
  }
}
```

### Batch-Processing

**Strategie:**

- Gruppieren Sie Updates in Batches
- Verwenden Sie Bulk-Mutations
- Minimieren Sie die Anzahl der Requests

## Weitere Informationen

- [Shopify GraphQL Admin API Rate Limits](https://shopify.dev/docs/api/admin-graphql/latest/rate-limits)
- [Shopify API Best Practices](https://shopify.dev/docs/api/usage/best-practices)
- [Client Implementation](../core/infra/shopify/client.ts)
