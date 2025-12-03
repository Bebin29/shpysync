# Debugging-Guide

Diese Dokumentation beschreibt Debugging-Techniken für WAWISync.

## VS Code Debugging

### Konfiguration

Erstellen Sie `.vscode/launch.json`:

```json
{
  "version": "0.2.0",
  "configurations": [
    {
      "name": "Debug Electron Main",
      "type": "node",
      "request": "launch",
      "cwd": "${workspaceFolder}",
      "runtimeExecutable": "${workspaceFolder}/node_modules/.bin/electron",
      "windows": {
        "runtimeExecutable": "${workspaceFolder}/node_modules/.bin/electron.cmd"
      },
      "args": [".", "--inspect=5858"],
      "outputCapture": "std",
      "console": "integratedTerminal"
    },
    {
      "name": "Debug Electron Renderer",
      "type": "chrome",
      "request": "attach",
      "port": 9222,
      "webRoot": "${workspaceFolder}",
      "timeout": 30000
    }
  ]
}
```

### Main Process Debugging

1. Setzen Sie Breakpoints in `electron/` Dateien
2. Starten Sie "Debug Electron Main"
3. Debugger stoppt an Breakpoints

### Renderer Process Debugging

1. Setzen Sie Breakpoints in `app/` Dateien
2. Starten Sie die App: `npm run electron:dev`
3. Öffnen Sie Chrome DevTools in Electron
4. Oder verwenden Sie "Debug Electron Renderer"

## Console-Logging

### Main Process

```typescript
console.log("Debug message");
console.error("Error message");
```

### Renderer Process

```typescript
console.log("Debug message");
console.error("Error message");
```

## IPC-Debugging

### IPC-Events loggen

Fügen Sie Logging zu IPC-Handlern hinzu:

```typescript
ipcMain.handle("sync:start", async (event, config) => {
  console.log("[IPC] sync:start", config);
  // ...
});
```

### Preload Script Debugging

```typescript
console.log("[Preload] API exposed:", electronAPI);
```

## React DevTools

1. Installieren Sie React DevTools Extension
2. Öffnen Sie Chrome DevTools in Electron
3. React-Tab ist verfügbar

## Network-Debugging

### Shopify API

Loggen Sie alle Shopify API-Aufrufe:

```typescript
// In shopify/client.ts
console.log("[Shopify] Request:", { query, variables });
console.log("[Shopify] Response:", response);
```

## Performance-Debugging

### React Profiler

1. Öffnen Sie React DevTools
2. Verwenden Sie den Profiler-Tab
3. Aufzeichnen Sie Performance-Daten

### Electron Performance

```typescript
console.time("sync-operation");
// ... code ...
console.timeEnd("sync-operation");
```

## Error-Tracking

### Error-Handler

Alle Fehler werden über `error-handler.ts` verarbeitet:

```typescript
import { errorToErrorInfo } from "./error-handler";

try {
  // ...
} catch (error) {
  const errorInfo = errorToErrorInfo(error);
  console.error("[Error]", errorInfo);
}
```

## Debugging-Tipps

### 1. TypeScript-Fehler

```bash
npm run type-check
```

### 2. IPC-Kommunikation

- Überprüfen Sie Preload Script
- Überprüfen Sie IPC-Handler-Registrierung
- Loggen Sie alle IPC-Events

### 3. State-Management

- Verwenden Sie React DevTools
- Loggen Sie State-Änderungen
- Überprüfen Sie Zustand-Stores

### 4. Async-Operationen

- Verwenden Sie `async/await` mit try-catch
- Loggen Sie Promise-Rejections
- Überprüfen Sie Event-Handler

## Weitere Informationen

- [VS Code Debugging](https://code.visualstudio.com/docs/editor/debugging)
- [Electron Debugging](https://www.electronjs.org/docs/latest/tutorial/debugging)
- [React DevTools](https://react.dev/learn/react-developer-tools)
