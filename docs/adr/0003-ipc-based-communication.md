# ADR-0003: IPC-basierte Kommunikation zwischen Renderer und Main Process

**Status:** Akzeptiert  
**Datum:** 2024-XX-XX  
**Entscheider:** Entwicklungsteam

## Kontext

In Electron-Apps müssen Renderer-Prozess (Frontend) und Main-Prozess (Backend) sicher kommunizieren. Es gibt verschiedene Ansätze für die Kommunikation.

## Entscheidung

Wir verwenden IPC (Inter-Process Communication) für alle Kommunikation zwischen Renderer und Main Process.

## Alternativen

### 1. Direkter Node-Zugriff im Renderer

- **Vorteile:** Einfacher, direkter Zugriff
- **Nachteile:** Sicherheitsrisiko (XSS → RCE), nicht empfohlen

### 2. Remote Module

- **Vorteile:** Einfache Verwendung
- **Nachteile:** Deprecated, Sicherheitsrisiken

### 3. IPC mit Preload Script

- **Vorteile:** Sicher, explizite API, gute TypeScript-Unterstützung
- **Nachteile:** Mehr Boilerplate-Code

## Konsequenzen

### Positiv

- Sichere Kommunikation (kein direkter Node-Zugriff im Renderer)
- Explizite API-Definition über Preload Script
- Gute TypeScript-Unterstützung
- Klare Trennung zwischen Frontend und Backend

### Negativ

- Mehr Boilerplate-Code für IPC-Handler
- Asynchrone Kommunikation (kann komplexer sein)

## Implementierung

- **Preload Script:** `electron/preload.ts` - Exponiert API im Renderer
- **IPC Handlers:** `electron/services/ipc-handlers.ts` - Registriert Handler im Main Process
- **Type Definitions:** `electron/types/ipc.ts` - TypeScript-Typen für IPC

## Sicherheit

- Context Isolation aktiviert
- Node Integration deaktiviert
- Nur explizit definierte API-Methoden verfügbar
- Alle kritischen Operationen laufen im Main Process

## Referenzen

- [Electron IPC Documentation](https://www.electronjs.org/docs/latest/api/ipc-main)
- [electron/preload.ts](../electron/preload.ts)
- [electron/services/ipc-handlers.ts](../electron/services/ipc-handlers.ts)
