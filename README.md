# WAWISync

Electron-App zur Synchronisation von Warenbeständen zwischen einem POS-System und Shopify.

## 🚀 Projekt-Status

**Aktuell:** Phase 1 - Projekt-Setup ✅

## 📋 Technologie-Stack

- **Frontend:** Next.js 14+ (App Router), React 18+, TypeScript, Tailwind CSS
- **Backend:** Electron 28+, Node.js
- **Datenbank:** SQLite (better-sqlite3) für Produkt-/Variant-Cache
- **Konfiguration:** electron-store
- **Testing:** Vitest

## 🛠️ Entwicklung

### Voraussetzungen

- Node.js 18+ (aktuell: v22.11.0)
- npm oder yarn

### Installation

```bash
npm install
```

### Entwicklung starten

```bash
# Next.js Dev-Server starten
npm run dev

# Electron-App starten (in separatem Terminal)
npm run electron:dev
```

### Build

```bash
# Production-Build
npm run build

# Electron-App bauen (ohne Code-Signing)
npm run electron:build

# Electron-App bauen (mit Code-Signing)
# Siehe docs/CODE_SIGNING.md für Setup-Anleitung
npm run electron:build:prod
```

**Hinweis:** Für Code-Signing siehe [docs/CODE_SIGNING.md](docs/CODE_SIGNING.md)

### Automatische Updates

Die App unterstützt automatische Updates über GitHub Releases. Da das Repository öffentlich ist, ist **kein GitHub Token erforderlich**.

**Für private Repositories (optional):**
Falls das Repository später privat gestellt wird, kann ein GitHub Personal Access Token verwendet werden:

1. **Token erstellen:**
   - Gehe zu https://github.com/settings/tokens
   - Erstelle ein neues Token mit `repo` Berechtigung
   - Kopiere das Token

2. **Token konfigurieren:**
   - Erstelle eine `.env` Datei im Projekt-Root (siehe `.env.example`)
   - Füge das Token hinzu: `GH_TOKEN=your_github_token_here`
   - Oder setze es als Umgebungsvariable: `export GH_TOKEN=your_github_token_here`

**Wichtig:** Die `.env` Datei ist bereits in `.gitignore` enthalten und wird nicht ins Repository committed.

## 📁 Projektstruktur

```
wawisync/
├── app/                    # Next.js App Router
├── electron/               # Electron Main Process
│   ├── main.ts            # Electron Entry Point
│   ├── preload.ts         # Preload Script
│   ├── services/          # Backend-Services
│   └── types/             # IPC-Type-Definitionen
├── core/                   # Core Domain Layer (wird erstellt)
├── tests/                  # Tests (wird erstellt)
└── public/                 # Statische Assets
```

## 📖 Dokumentation

Siehe [PROJEKTPLAN.md](./PROJEKTPLAN.md) für detaillierte Projektplanung.

## 🔒 Sicherheit

- `contextIsolation: true` - Verhindert XSS → RCE
- `nodeIntegration: false` - Kein direkter Node-Zugriff im Renderer
- Alle FS/Netzwerk-Zugriffe laufen über Main Process
- Access-Tokens werden verschlüsselt gespeichert

## 📝 Lizenz

MIT

