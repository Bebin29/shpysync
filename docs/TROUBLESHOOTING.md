# Troubleshooting - Release-Prozess

## Problem: "401 Unauthorized - Bad credentials"

### Symptome

- Build erfolgreich, aber Upload zu GitHub schlägt fehl
- Fehlermeldung: `HttpError: 401 Unauthorized "Bad credentials"`

### Ursachen

1. **Token ist ungültig oder abgelaufen**
   - GitHub Personal Access Tokens können ablaufen
   - Token wurde gelöscht oder deaktiviert

2. **Token hat nicht die richtigen Berechtigungen**
   - Benötigt: `repo` Scope (vollständiger Zugriff auf Repositories)
   - Ohne `repo` Scope kann nicht zu Releases hochgeladen werden

3. **Token wird nicht korrekt weitergegeben**
   - `.env` Datei wird nicht geladen
   - Token enthält ungültige Zeichen (Leerzeichen, Anführungszeichen)

### Lösung

#### Schritt 1: Neues Token erstellen

1. Gehe zu: https://github.com/settings/tokens
2. Klicke auf "Generate new token" → "Generate new token (classic)"
3. Name: z.B. "WAWISync Releases"
4. **Wichtig:** Wähle den Scope `repo` (vollständiger Zugriff)
5. Token generieren und kopieren

#### Schritt 2: Token in .env aktualisieren

```bash
# Öffne .env Datei
nano .env

# Aktualisiere oder füge hinzu:
GH_TOKEN=dein_neues_token_hier

# WICHTIG: Keine Anführungszeichen um den Token!
# FALSCH: GH_TOKEN="token"
# RICHTIG: GH_TOKEN=token
```

#### Schritt 3: Token testen

```bash
# Teste ob Token funktioniert
export GH_TOKEN=$(grep GH_TOKEN .env | cut -d '=' -f2)
curl -H "Authorization: token $GH_TOKEN" https://api.github.com/user
```

Sollte deinen GitHub-Benutzernamen zurückgeben, wenn das Token gültig ist.

#### Schritt 4: Build erneut ausführen

```bash
npm run electron:build:all:publish
```

### Alternative: Manuelles Hochladen

Falls das Token-Problem weiterhin besteht, kannst du die Dateien manuell hochladen:

1. **Build ohne Upload:**

   ```bash
   npm run electron:build:mac
   npm run electron:build:win
   npm run electron:build:linux
   ```

2. **Dateien zu GitHub Release hochladen:**
   - Gehe zu: https://github.com/Bebin29/shpysync/releases/edit/v1.0.2
   - Ziehe alle Dateien aus `dist/` hoch:
     - `WAWISync-1.0.2-mac.zip`
     - `WAWISync-1.0.2.dmg`
     - `WAWISync-1.0.2.dmg.blockmap`
     - `WAWISync-1.0.2-mac.zip.blockmap`
     - `latest-mac.yml` (wichtig!)
     - `WAWISync Setup 1.0.2.exe`
     - `WAWISync Setup 1.0.2.exe.blockmap`
     - `WAWISync-1.0.2.exe`
     - `latest.yml` (wichtig!)
     - etc.

## Problem: Token wird nicht erkannt

### Symptome

- Script zeigt "GitHub Token fehlt!" obwohl Token in `.env` vorhanden ist

### Lösung

1. Prüfe, ob `.env` im Projekt-Root liegt (nicht in einem Unterordner)
2. Prüfe Format: `GH_TOKEN=token_ohne_anführungszeichen`
3. Prüfe, ob keine Leerzeichen um das `=` sind
4. Starte Terminal neu (um Umgebungsvariablen zu aktualisieren)

## Problem: Icon zu klein für Windows

### Symptome

- `image /Users/.../build/icon.ico must be at least 256x256`

### Lösung

```bash
# Icon neu erstellen
python3 scripts/create-icon-ico.py
```

Das Script erstellt automatisch ein Icon mit allen notwendigen Größen (16x16 bis 256x256).

## Weitere Probleme

### Build schlägt fehl bei bestimmter Plattform

- **Windows auf macOS:** Normal, da Cross-Compilation. Nutze GitHub Actions für automatische Builds.
- **Linux auf macOS:** Normal, da Cross-Compilation.

### Upload dauert sehr lange

- Große Dateien (100+ MB) benötigen Zeit
- Nicht mit Ctrl+C abbrechen, sonst müssen Dateien manuell hochgeladen werden
