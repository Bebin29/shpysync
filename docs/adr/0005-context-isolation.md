# ADR-0005: Context Isolation und Node Integration deaktiviert

**Status:** Akzeptiert  
**Datum:** 2024-XX-XX  
**Entscheider:** Entwicklungsteam

## Kontext

Electron-Apps haben verschiedene Sicherheitsoptionen für die Kommunikation zwischen Renderer und Main Process. Die Standard-Konfiguration ist unsicher und ermöglicht XSS → RCE Angriffe.

## Entscheidung

Wir aktivieren Context Isolation und deaktivieren Node Integration im Renderer-Prozess.

## Konfiguration

```typescript
webPreferences: {
  contextIsolation: true,
  nodeIntegration: false,
  preload: path.join(__dirname, "preload.js"),
}
```

## Alternativen

### 1. Standard-Konfiguration (unsicher)

- **Vorteile:** Einfacher, direkter Node-Zugriff
- **Nachteile:** Sicherheitsrisiko (XSS → RCE), nicht empfohlen

### 2. Context Isolation + Node Integration

- **Vorteile:** Direkter Node-Zugriff möglich
- **Nachteile:** Immer noch Sicherheitsrisiken

### 3. Context Isolation + Preload Script (gewählt)

- **Vorteile:** Sicher, explizite API, keine direkten Node-Zugriffe
- **Nachteile:** Mehr Boilerplate-Code

## Konsequenzen

### Positiv

- Verhindert XSS → RCE Angriffe
- Sichere Kommunikation zwischen Renderer und Main Process
- Explizite API-Definition über Preload Script
- Best Practice für Electron-Apps

### Negativ

- Mehr Boilerplate-Code für Preload Script
- Kein direkter Node-Zugriff im Renderer (muss über IPC)

## Sicherheit

Diese Konfiguration verhindert:

- XSS → RCE Angriffe
- Unbefugten Node-Zugriff im Renderer
- Direkte Manipulation von Node-Modulen

## Implementierung

- **Main Process:** `electron/main.ts` - WebPreferences-Konfiguration
- **Preload Script:** `electron/preload.ts` - API-Exposition

## Referenzen

- [Electron Security Best Practices](https://www.electronjs.org/docs/latest/tutorial/security)
- [electron/main.ts](../electron/main.ts)
- [electron/preload.ts](../electron/preload.ts)
