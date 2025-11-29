# Release-Prozess für WAWISync

## Problem: Update-Fehler "Cannot find latest-mac.yml"

Dieser Fehler tritt auf, wenn ein GitHub Release existiert, aber die notwendigen Build-Artefakte fehlen, die `electron-updater` benötigt.

## Lösung

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

## Automatischer Release-Prozess (Zukunft)

Für zukünftige Releases sollte ein GitHub Actions Workflow eingerichtet werden, der:
1. Bei Git Tags automatisch baut
2. Build-Artefakte zu GitHub Releases hochlädt
3. `latest-*.yml` Dateien erstellt

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

## Nächste Schritte

1. ✅ Build-Scripts mit `--publish` Option erstellt
2. ⏳ GitHub Actions Workflow für automatische Releases (siehe Issue #2)
3. ⏳ Semantic Versioning Automation (siehe Issue #11)

