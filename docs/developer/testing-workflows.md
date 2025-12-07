# GitHub Workflows lokal testen

Dieses Dokument beschreibt, wie du die GitHub Actions Workflows lokal testen kannst, bevor du Änderungen pusht.

## Schnelle Methode: Lokales Test-Skript

Das einfachste und schnellste Verfahren ist das lokale Test-Skript, das die wichtigsten CI-Schritte simuliert:

```bash
npm run test:workflows
```

Oder direkt:

```bash
./scripts/test-workflows.sh
```

### Was wird getestet?

Das Skript führt folgende Schritte aus (entspricht dem CI-Workflow):

1. **Lint & Format Check**
   - ESLint
   - Prettier Format Check

2. **TypeScript Type Check**
   - Vollständige Typüberprüfung

3. **Tests**
   - Unit Tests
   - Integration Tests
   - Parity Tests
   - Accessibility Tests

4. **Security Scan**
   - npm audit (Dependency Vulnerability Scan)

### Vorteile

- ✅ Schnell und einfach
- ✅ Keine zusätzlichen Tools erforderlich
- ✅ Testet die wichtigsten CI-Schritte
- ✅ Gibt klare Fehlermeldungen aus

### Nachteile

- ❌ Testet nicht die vollständigen Workflows (z.B. Build-Prozesse)
- ❌ Keine Docker-Container-Simulation
- ❌ Keine GitHub Actions-spezifischen Features

## Erweiterte Methode: act (GitHub Actions lokal)

Für vollständige Workflow-Tests kannst du [`act`](https://github.com/nektos/act) verwenden, das GitHub Actions lokal in Docker-Containern ausführt.

### Installation

**macOS (Homebrew):**

```bash
brew install act
```

**Linux:**

```bash
curl https://raw.githubusercontent.com/nektos/act/master/install.sh | sudo bash
```

**Windows:**

```bash
choco install act-cli
```

### Verwendung

**Alle Workflows testen:**

```bash
act push
```

**Spezifischen Workflow testen:**

```bash
act -W .github/workflows/ci.yml push
```

**Workflow mit Pull Request Event:**

```bash
act pull_request
```

**Workflow mit Tag Event (für Build & Release):**

```bash
act push --eventpath .github/workflows/build-release.yml -e <(echo '{"ref":"refs/tags/v1.0.0"}')
```

### Konfiguration

Erstelle eine `.actrc` Datei im Projektroot für häufig verwendete Optionen:

```bash
# .actrc
-P ubuntu-latest=catthehacker/ubuntu:act-latest
-P windows-latest=catthehacker/ubuntu:act-latest
-P macos-latest=catthehoster/ubuntu:act-latest
```

### Vorteile

- ✅ Testet vollständige Workflows
- ✅ Simuliert GitHub Actions-Umgebung
- ✅ Testet auch Build-Prozesse
- ✅ Docker-Container-Isolation

### Nachteile

- ❌ Benötigt Docker
- ❌ Langsamer als lokales Skript
- ❌ Nicht alle Actions sind vollständig kompatibel
- ❌ Secrets müssen manuell konfiguriert werden

### Secrets für act

Erstelle eine `.secrets` Datei (nicht committen!):

```bash
# .secrets
GITHUB_TOKEN=your_token_here
WINDOWS_SIGNING_CERT=...
WINDOWS_SIGNING_PASSWORD=...
```

Dann verwenden:

```bash
act push --secret-file .secrets
```

## Empfohlener Workflow

1. **Vor jedem Commit:**

   ```bash
   npm run test:workflows
   ```

2. **Vor größeren Änderungen oder Releases:**

   ```bash
   # Lokales Skript
   npm run test:workflows

   # Optional: Vollständiger Test mit act
   act push
   ```

3. **Vor dem Push:**
   ```bash
   npm run test:workflows
   ```

## Troubleshooting

### act-Probleme

**Problem:** `act` findet keine Runner
**Lösung:** Installiere Docker und stelle sicher, dass es läuft

**Problem:** Workflow schlägt wegen fehlender Secrets fehl
**Lösung:** Erstelle `.secrets` Datei oder verwende `--secret` Flag

**Problem:** Workflow verwendet nicht unterstützte Actions
**Lösung:** Manche Actions funktionieren nicht mit act. Verwende das lokale Test-Skript als Alternative.

### Lokales Test-Skript Probleme

**Problem:** Tests schlagen lokal fehl, aber in CI funktionieren sie
**Lösung:**

- Stelle sicher, dass alle Dependencies installiert sind: `npm ci`
- Prüfe Node.js Version (sollte 20 sein)
- Prüfe Umgebungsvariablen

**Problem:** Playwright Tests schlagen fehl
**Lösung:** Installiere Browser: `npx playwright install --with-deps chromium`

## Weitere Ressourcen

- [act Dokumentation](https://github.com/nektos/act)
- [GitHub Actions Dokumentation](https://docs.github.com/en/actions)
- [CI/CD Best Practices](./best-practices.md)
