# ADR-0002: Verwendung von Electron für Desktop-App

**Status:** Akzeptiert  
**Datum:** 2024-XX-XX  
**Entscheider:** Entwicklungsteam

## Kontext

WAWISync benötigt eine Desktop-Anwendung, die auf Windows, macOS und Linux läuft. Es gibt verschiedene Optionen für die Entwicklung von Cross-Platform-Desktop-Apps.

## Entscheidung

Wir verwenden Electron für die Desktop-Anwendung.

## Alternativen

### 1. Native Entwicklung

- **Vorteile:** Beste Performance, native Look & Feel
- **Nachteile:** Separate Codebases für jede Plattform, hoher Entwicklungsaufwand

### 2. Tauri

- **Vorteile:** Kleinere Bundle-Größe, bessere Performance
- **Nachteile:** Jüngeres Framework, weniger etabliert, eingeschränkte API-Unterstützung

### 3. Electron

- **Vorteile:** Etabliertes Framework, große Community, Web-Technologien wiederverwendbar
- **Nachteile:** Größere Bundle-Größe, höherer RAM-Verbrauch

## Konsequenzen

### Positiv

- Wiederverwendung von Web-Technologien (React, TypeScript)
- Einheitliche Codebase für alle Plattformen
- Große Community und umfangreiche Dokumentation
- Viele verfügbare Libraries und Tools

### Negativ

- Größere Bundle-Größe (~100-200 MB)
- Höherer RAM-Verbrauch
- Potenzielle Sicherheitsrisiken (wenn nicht richtig konfiguriert)

## Sicherheitsmaßnahmen

Um die Sicherheitsrisiken zu minimieren:

- Context Isolation aktiviert
- Node Integration deaktiviert
- Preload Script für sichere API-Exposition
- IPC-basierte Kommunikation

## Referenzen

- [Electron Security Best Practices](https://www.electronjs.org/docs/latest/tutorial/security)
- [electron/main.ts](../electron/main.ts)
