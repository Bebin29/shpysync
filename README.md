# WAWISync

<div align="center">

**Eine moderne Electron-App zur automatischen Synchronisation von Warenbeständen zwischen POS-Systemen und Shopify**

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.5-blue.svg)](https://www.typescriptlang.org/)
[![Electron](https://img.shields.io/badge/Electron-28.2-brightgreen.svg)](https://www.electronjs.org/)
[![Next.js](https://img.shields.io/badge/Next.js-14-black.svg)](https://nextjs.org/)

</div>

## ✨ Features

- 🔄 **Automatische Synchronisation** von Preisen und Beständen zwischen POS-System und Shopify
- 📊 **CSV/DBF-Unterstützung** für flexible Datenquellen
- 🎯 **Intelligentes Matching** von Produkten über SKU oder Name
- 🔍 **Vorschau-Funktion** vor der Synchronisation
- 🧪 **Test-Modus** für einzelne Artikel
- ⚙️ **Automatische Updates** über GitHub Releases
- 🔒 **Sichere Token-Speicherung** mit Verschlüsselung
- 📈 **Detaillierte Logs** und Synchronisations-Historie

## 🚀 Schnellstart

### Installation

```bash
# Repository klonen
git clone https://github.com/Bebin29/shpysync.git
cd shpysync

# Dependencies installieren
npm install
```

### Entwicklung

```bash
# Development-Modus starten
npm run electron:dev
```

### Production Build

```bash
# App bauen
npm run electron:build

# Für macOS
npm run electron:build:mac

# Für Windows
npm run electron:build

# Für Linux
npm run electron:build:linux
```

## 🛠️ Technologie-Stack

- **Frontend:** Next.js 14+ (App Router), React 18+, TypeScript, Tailwind CSS
- **Backend:** Electron 28+, Node.js
- **Datenbank:** SQLite (better-sqlite3) für Produkt-/Variant-Cache
- **API:** Shopify GraphQL Admin API
- **Konfiguration:** electron-store
- **Testing:** Vitest
- **Build:** electron-builder

## 📖 Dokumentation

- [Projektplan](./PROJEKTPLAN.md) - Detaillierte Projektplanung und Architektur
- [Code-Signing Setup](./docs/CODE_SIGNING.md) - Anleitung für Code-Signing

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
shpysync/
├── app/                    # Next.js App Router (Frontend)
│   ├── components/        # React-Komponenten
│   ├── hooks/             # Custom React Hooks
│   └── stores/            # Zustand State Management
├── electron/               # Electron Main Process
│   ├── main.ts            # Electron Entry Point
│   ├── preload.ts         # Preload Script (IPC Bridge)
│   ├── services/          # Backend-Services
│   │   ├── sync-engine.ts      # Synchronisations-Engine
│   │   ├── shopify-service.ts  # Shopify API Client
│   │   └── config-service.ts   # Konfigurations-Management
│   └── types/             # IPC-Type-Definitionen
├── core/                   # Core Domain Layer
│   ├── domain/            # Domain-Logik (Matching, Validierung)
│   └── infra/              # Infrastructure (CSV/DBF Parser)
├── tests/                  # Test-Suite
│   ├── unit/              # Unit-Tests
│   └── integration/        # Integration-Tests
└── public/                 # Statische Assets
```

## 🔒 Sicherheit

WAWISync wurde mit Sicherheit als oberste Priorität entwickelt:

- ✅ **Context Isolation** - Verhindert XSS → RCE Angriffe
- ✅ **Node Integration deaktiviert** - Kein direkter Node-Zugriff im Renderer
- ✅ **Verschlüsselte Token-Speicherung** - Access-Tokens werden sicher gespeichert
- ✅ **IPC-basierte Kommunikation** - Alle kritischen Operationen laufen über den Main Process
- ✅ **Code-Signing Support** - Optional für zusätzliche Sicherheit

## 🤝 Beitragen

Beiträge sind willkommen! Bitte erstelle ein Issue oder einen Pull Request.

## 📝 Lizenz

Dieses Projekt ist unter der MIT-Lizenz lizenziert - siehe [LICENSE](LICENSE) für Details.

## 👤 Autor

**Bebin29**

- GitHub: [@Bebin29](https://github.com/Bebin29)

## 🙏 Danksagungen

- [Electron](https://www.electronjs.org/) - Cross-platform Desktop Apps
- [Next.js](https://nextjs.org/) - React Framework
- [Shopify](https://www.shopify.com/) - E-Commerce Platform

