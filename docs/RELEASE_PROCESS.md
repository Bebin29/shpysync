# Release-Prozess für WAWISync

## Automatischer Release-Prozess (Empfohlen)

WAWISync verwendet [semantic-release](https://github.com/semantic-release/semantic-release) für vollautomatische Releases basierend auf [Conventional Commits](https://www.conventionalcommits.org/).

### Wie funktioniert es?

1. **Commits folgen Conventional Commits Format:**
   - `feat:` → Minor Release (1.0.3 → 1.1.0)
   - `fix:` → Patch Release (1.0.3 → 1.0.4)
   - `BREAKING CHANGE:` → Major Release (1.0.3 → 2.0.0)

2. **Automatischer Workflow:**
   - CI läuft auf `main` Branch
   - Bei erfolgreichem CI: semantic-release analysiert Commits
   - Bestimmt neue Version basierend auf Commit-Types
   - Aktualisiert CHANGELOG.md automatisch
   - Generiert Release Notes aus Commits
   - Erstellt Git Tag
   - Erstellt GitHub Release (ohne Build-Artefakte)
   - `build-release.yml` wird durch Tag getriggert
   - Build-Artefakte werden automatisch zum Release hinzugefügt

3. **Keine manuellen Schritte erforderlich:**
   - Version wird automatisch bestimmt
   - CHANGELOG.md wird automatisch aktualisiert
   - Release Notes werden automatisch generiert
   - GitHub Release wird automatisch erstellt

### Konfiguration

Die semantic-release Konfiguration befindet sich in `.releaserc.json`:

- **Branches:** Nur `main` Branch erstellt Releases
- **Plugins:**
  - Commit-Analyzer (analysiert Conventional Commits)
  - Release Notes Generator (generiert Release Notes)
  - Changelog (aktualisiert CHANGELOG.md)
  - npm (aktualisiert package.json version)
  - git (committed CHANGELOG.md und package.json)
  - github (erstellt GitHub Releases)

### Workflow-Dateien

- `.github/workflows/release.yml` - semantic-release Workflow
- `.github/workflows/build-release.yml` - Build-Artefakte Workflow
- `.releaserc.json` - semantic-release Konfiguration

### Weitere Informationen

- [Release Checklist](./RELEASE_CHECKLIST.md) - Vollständige Release-Checklist
- [Rollback Strategy](./ROLLBACK_STRATEGY.md) - Rollback-Prozess
- [Contributing Guide](../CONTRIBUTING.md) - Conventional Commits Format

---

## Manueller Release-Prozess (Fallback)

Falls ein manueller Release erforderlich ist (z.B. für Hotfixes oder Notfälle):

### Option 1: Neues Release mit automatischem Upload (Empfohlen)

### Option 1: Neues Release mit automatischem Upload (Empfohlen)

1. **Version in `package.json` aktualisieren:**

   ```json
   "version": "1.0.1"
   ```

2. **Git Tag erstellen:**

   ```bash
   git tag v1.0.1
   git push origin v1.0.1
   ```

3. **Build mit automatischem Upload:**

   **Option A: Alle Plattformen auf einmal (Empfohlen)**

   ```bash
   npm run electron:build:all:publish
   ```

   Dieses Script baut automatisch für Windows, macOS und Linux und lädt alle Artefakte hoch.

   **Option B: Einzelne Plattformen**

   ```bash
   # Für macOS
   npm run electron:build:mac:publish

   # Für Windows
   npm run electron:build:win:publish

   # Für Linux
   npm run electron:build:linux:publish
   ```

   **Wichtig:** Die `--publish always` Option lädt automatisch:
   - `latest-mac.yml`, `latest.yml`, `latest-linux.yml` (Metadaten für Updates)
   - Die Installer-Dateien (.dmg, .exe, .AppImage, etc.)
   - Alle notwendigen Checksums und Blockmaps

4. **GitHub Token (optional, nur für private Repos):**
   ```bash
   export GH_TOKEN=your_github_token_here
   # Oder in .env Datei:
   # GH_TOKEN=your_github_token_here
   ```

### Option 2: Manuelles Hochladen der Build-Artefakte

Falls ein Release bereits existiert, aber die Build-Artefakte fehlen:

1. **Build ohne Upload:**

   ```bash
   npm run electron:build:mac
   ```

2. **Build-Artefakte finden:**
   Die Dateien werden in `dist/` erstellt:
   - `latest-mac.yml` (oder `latest.yml` für Windows)
   - `WAWISync-1.0.1-mac.zip`
   - `WAWISync-1.0.1.dmg`
   - `WAWISync-1.0.1.dmg.blockmap`

3. **Manuell zu GitHub Release hochladen:**
   - Gehe zu: https://github.com/Bebin29/shpysync/releases
   - Klicke auf das Release (z.B. 1.0.1)
   - Klicke auf "Edit release"
   - Ziehe die Dateien aus `dist/` in den "Attach binaries" Bereich
   - **Wichtig:** `latest-mac.yml` muss hochgeladen werden!

### Option 3: Bestehendes Release reparieren

Falls Release 1.0.1 bereits existiert:

1. **Build-Artefakte erstellen:**

   ```bash
   npm run electron:build:mac
   ```

2. **Dateien aus `dist/` zu Release 1.0.1 hochladen:**
   - `latest-mac.yml` (wichtig!)
   - `WAWISync-1.0.1-mac.zip`
   - `WAWISync-1.0.1.dmg`
   - `WAWISync-1.0.1.dmg.blockmap`

## Notwendige Dateien für electron-updater

### macOS

- ✅ `latest-mac.yml` (Metadaten für Updates)
- ✅ `WAWISync-{version}-mac.zip` (ZIP-Archiv)
- ✅ `WAWISync-{version}.dmg` (DMG-Installer)
- ✅ `WAWISync-{version}.dmg.blockmap` (Blockmap für Delta-Updates)

### Windows

- ✅ `latest.yml` (Metadaten für Updates)
- ✅ `WAWISync Setup {version}.exe` (NSIS Installer)
- ✅ `WAWISync Setup {version}.exe.blockmap` (Blockmap)
- ✅ `WAWISync {version}.exe` (Portable Version, optional)

### Linux

- ✅ `latest-linux.yml` (Metadaten für Updates)
- ✅ `WAWISync-{version}.AppImage` (AppImage)
- ✅ `WAWISync_{version}_amd64.deb` (Debian Package)

## Automatischer Release-Prozess

✅ **Implementiert:** GitHub Actions Workflows für automatische Releases sind eingerichtet:

1. **CI Workflow** (`.github/workflows/ci.yml`):
   - Läuft bei jedem Push auf `main` Branch
   - Führt Tests, Linting und Type-Checks durch

2. **Release Workflow** (`.github/workflows/release.yml`):
   - Wird nach erfolgreichem CI getriggert
   - Führt semantic-release aus
   - Erstellt automatisch Version, CHANGELOG, Release Notes und GitHub Release

3. **Build-Release Workflow** (`.github/workflows/build-release.yml`):
   - Wird durch Git Tags getriggert
   - Baut für alle Plattformen (Windows, macOS, Linux)
   - Lädt Build-Artefakte automatisch zum Release hoch
   - Erstellt `latest-*.yml` Dateien für electron-updater

Siehe: [docs/BEST_PRACTICES.md](./BEST_PRACTICES.md) - CI/CD Pipeline

## Troubleshooting

### Fehler: "Cannot find latest-mac.yml"

- **Ursache:** Release existiert, aber `latest-mac.yml` fehlt
- **Lösung:** Datei manuell hochladen oder neues Release mit `--publish` erstellen

### Fehler: "404 Not Found"

- **Ursache:** Release existiert nicht oder falscher Tag-Name
- **Lösung:** Prüfe, ob Release und Tag existieren

### Fehler: "Authentication failed"

- **Ursache:** GitHub Token fehlt oder ist ungültig (nur für private Repos)
- **Lösung:** `GH_TOKEN` Umgebungsvariable setzen

## Status

1. ✅ Build-Scripts mit `--publish` Option erstellt
2. ✅ GitHub Actions Workflow für automatische Releases implementiert
3. ✅ Semantic Versioning Automation mit semantic-release implementiert
4. ✅ Automatische CHANGELOG.md Aktualisierung
5. ✅ Automatische Release Notes Generierung

## Weitere Dokumentation

- [Release Checklist](./RELEASE_CHECKLIST.md) - Vollständige Pre-Release Checklist
- [Rollback Strategy](./ROLLBACK_STRATEGY.md) - Rollback-Prozess bei Problemen
- [Contributing Guide](../CONTRIBUTING.md) - Conventional Commits Format
