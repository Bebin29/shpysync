# Setup-Anleitung für Entwickler

Diese Anleitung führt Sie durch das Setup der Entwicklungsumgebung für WAWISync.

## Voraussetzungen

- **Node.js:** Version 18 oder 20 (empfohlen: 20)
- **npm:** Version 9 oder höher
- **Git:** Für Versionskontrolle
- **IDE:** VS Code empfohlen (mit TypeScript-Extension)

## Schritt 1: Repository klonen

```bash
git clone https://github.com/Bebin29/shpysync.git
cd shpysync
```

## Schritt 2: Dependencies installieren

```bash
npm install
```

## Schritt 3: Entwicklungsumgebung starten

```bash
npm run electron:dev
```

Dies startet:

- Next.js Development Server (Port 3000)
- Electron App im Development-Modus

## Schritt 4: Tests ausführen

```bash
# Alle Tests
npm test

# Tests im Watch-Modus
npm run test:watch

# Test-Coverage
npm run test:coverage

# Unit-Tests
npm run test:unit

# Integration-Tests
npm run test:integration
```

## Schritt 5: Code-Qualität prüfen

```bash
# ESLint
npm run lint

# Prettier (prüfen)
npm run prettier:check

# Prettier (formatieren)
npm run prettier:write

# TypeScript Type-Check
npm run type-check
```

## Build

### Development Build

```bash
npm run electron:build:ts  # TypeScript kompilieren
npm run dev                 # Next.js Development Server
```

### Production Build

```bash
# Windows
npm run electron:build

# macOS
npm run electron:build:mac

# Linux
npm run electron:build:linux

# Alle Plattformen
npm run electron:build:all
```

## Umgebungsvariablen

Erstellen Sie eine `.env` Datei im Projekt-Root (siehe `.env.example`):

```bash
# Optional: GitHub Token für private Repositories
GH_TOKEN=your_github_token_here

# Optional: Code-Signing
CSC_LINK=build/certificate.pfx
CSC_KEY_PASSWORD=your_certificate_password
```

## VS Code Setup

### Empfohlene Extensions

- **ESLint** - Linting
- **Prettier** - Code-Formatierung
- **TypeScript** - TypeScript-Unterstützung
- **GitLens** - Git-Integration

### VS Code Settings

Erstellen Sie `.vscode/settings.json`:

```json
{
  "editor.formatOnSave": true,
  "editor.defaultFormatter": "esbenp.prettier-vscode",
  "editor.codeActionsOnSave": {
    "source.fixAll.eslint": true
  },
  "typescript.tsdk": "node_modules/typescript/lib"
}
```

## Troubleshooting

### Dependencies installieren schlägt fehl

- Stellen Sie sicher, dass Node.js Version 18 oder 20 installiert ist
- Löschen Sie `node_modules` und `package-lock.json`, dann `npm install` erneut

### Electron startet nicht

- Überprüfen Sie, ob Port 3000 verfügbar ist
- Stellen Sie sicher, dass Next.js Development Server läuft

### TypeScript-Fehler

- Führen Sie `npm run type-check` aus
- Überprüfen Sie `tsconfig.json` Konfiguration

## Nächste Schritte

- [Architektur-Übersicht](./architecture.md)
- [Codebase-Tour](./codebase-tour.md)
- [Entwicklungsworkflow](./workflow.md)
