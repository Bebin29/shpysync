# ADR-0004: SQLite-basierter Cache für Dashboard-Stats

**Status:** Akzeptiert  
**Datum:** 2024-XX-XX  
**Entscheider:** Entwicklungsteam

## Kontext

Das Dashboard benötigt Statistiken über Produkte und Varianten. Diese Daten müssen effizient geladen und angezeigt werden, ohne bei jedem Aufruf die Shopify API zu belasten.

## Entscheidung

Wir verwenden SQLite (better-sqlite3) für einen lokalen Cache, der NUR für Dashboard-Statistiken verwendet wird.

## Wichtige Design-Entscheidung

**Der Cache wird bewusst NICHT im Sync-Prozess verwendet**, um immer die neuesten Daten zu garantieren. Der Sync-Prozess lädt immer die neuesten Daten direkt von Shopify.

## Alternativen

### 1. Kein Cache

- **Vorteile:** Immer aktuelle Daten, einfacher
- **Nachteile:** Hohe API-Belastung, langsamere Dashboard-Ladezeiten

### 2. In-Memory-Cache

- **Vorteile:** Sehr schnell
- **Nachteile:** Daten gehen bei App-Neustart verloren

### 3. SQLite-Cache

- **Vorteile:** Persistente Daten, schnell, effizient
- **Nachteile:** Zusätzliche Komplexität, Cache-Invalidierung erforderlich

## Konsequenzen

### Positiv

- Schnelle Dashboard-Ladezeiten
- Reduzierte API-Belastung
- Persistente Daten (überleben App-Neustarts)
- Effiziente Abfragen mit SQL

### Negativ

- Zusätzliche Komplexität
- Cache-Invalidierung erforderlich
- Potenzielle Inkonsistenzen (wenn Cache nicht aktualisiert wird)

## Cache-Strategie

1. **Cache-Update:** Nach jedem erfolgreichen Sync wird der Cache im Hintergrund aktualisiert
2. **Cache-Nutzung:** Nur für Dashboard-Statistiken, nicht im Sync-Prozess
3. **Cache-Rebuild:** Manueller Rebuild über UI möglich
4. **Cache-Clear:** Manuelles Löschen über UI möglich

## Implementierung

- **Cache Service:** `electron/services/cache-service.ts`
- **Database:** SQLite-Datei im App-Data-Verzeichnis
- **Schema:** Produkte, Varianten, Inventory-Levels

## Referenzen

- [electron/services/cache-service.ts](../electron/services/cache-service.ts)
- [docs/BEST_PRACTICES.md](../BEST_PRACTICES.md) - Cache-Strategie dokumentiert
