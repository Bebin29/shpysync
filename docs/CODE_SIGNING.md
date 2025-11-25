# Code-Signing Setup für WAWISync

## Übersicht

Code-Signing ist für Electron-Apps optional, aber empfohlen, um Warnungen beim Installieren zu vermeiden. Dieses Dokument erklärt, wie Sie ein Self-Signed-Zertifikat für die Entwicklung erstellen und verwenden.

## Entwicklung (ohne Code-Signing)

Für normale Entwicklung ist Code-Signing nicht erforderlich:

```bash
npm run electron:build
```

Dies erstellt eine signierte Version ohne Code-Signing.

## Produktion (mit Code-Signing)

### Schritt 1: Zertifikat erstellen

Führen Sie das PowerShell-Skript aus (als Administrator empfohlen):

```powershell
.\scripts\create-cert.ps1
```

Das Skript:
- Erstellt ein Self-Signed-Zertifikat
- Speichert es als `build\certificate.pfx`
- Zeigt Ihnen die notwendigen Umgebungsvariablen an

**Hinweis:** Sie müssen ein Passwort für das Zertifikat eingeben (mindestens 6 Zeichen).

### Schritt 2: Umgebungsvariablen setzen

**PowerShell:**
```powershell
$env:CSC_LINK="build\certificate.pfx"
$env:CSC_KEY_PASSWORD="Ihr_Passwort"
```

**CMD:**
```cmd
set CSC_LINK=build\certificate.pfx
set CSC_KEY_PASSWORD=Ihr_Passwort
```

**Permanent (PowerShell):**
```powershell
[System.Environment]::SetEnvironmentVariable('CSC_LINK', 'build\certificate.pfx', 'User')
[System.Environment]::SetEnvironmentVariable('CSC_KEY_PASSWORD', 'Ihr_Passwort', 'User')
```

### Schritt 3: Build mit Code-Signing

Das Build-Skript erkennt automatisch das Zertifikat und verwendet es:

```bash
npm run electron:build:prod
```

**Automatische Passwort-Verwaltung:**

Das Skript versucht automatisch, das Passwort aus folgenden Quellen zu laden:
1. Umgebungsvariable `CSC_KEY_PASSWORD`
2. `.env`-Datei im Projekt-Root (Format: `CSC_KEY_PASSWORD=Ihr_Passwort`)

Falls das Passwort nicht gefunden wird, wird der Build ohne Code-Signing durchgeführt.

## Self-Signed vs. Echtes Zertifikat

### Self-Signed-Zertifikat (dieses Skript)
- ✅ Kostenlos
- ✅ Einfach zu erstellen
- ❌ Windows zeigt Warnung beim Installieren
- ❌ Benutzer müssen Zertifikat manuell installieren
- **Empfohlen für:** Entwicklung, interne Tests

### Echtes Code-Signing-Zertifikat
- ✅ Keine Warnungen beim Installieren
- ✅ Automatisch vertrauenswürdig
- ❌ Muss von einer CA erworben werden (kostet Geld)
- **Empfohlen für:** Produktion, öffentliche Distribution

## Zertifikat installieren (für Benutzer)

Wenn Sie eine mit Self-Signed-Zertifikat signierte App verteilen, müssen Benutzer das Zertifikat installieren:

1. Doppelklicken Sie auf `build\certificate.pfx`
2. Wählen Sie "Aktueller Benutzer" oder "Lokaler Computer"
3. Geben Sie das Passwort ein
4. Wählen Sie "Alle erweiterten Eigenschaften aktivieren"
5. Klicken Sie auf "Fertig stellen"

**Alternativ:** Benutzer können die Warnung beim Installieren ignorieren, aber Windows wird weiterhin warnen.

## Troubleshooting

### "Cannot create symbolic link"
- **Problem:** electron-builder versucht macOS-Dateien zu extrahieren
- **Lösung:** Verwenden Sie `npm run electron:build` (ohne Code-Signing) oder setzen Sie `CSC_IDENTITY_AUTO_DISCOVERY=false`

### "Signing failed"
- **Problem:** Zertifikat-Passwort falsch oder Zertifikat nicht gefunden
- **Lösung:** Überprüfen Sie `CSC_LINK` und `CSC_KEY_PASSWORD` Umgebungsvariablen

### "Certificate not found"
- **Problem:** Pfad zum Zertifikat ist falsch
- **Lösung:** Verwenden Sie absoluten Pfad oder relativen Pfad vom Projekt-Root

## Weitere Informationen

- [electron-builder Code-Signing Dokumentation](https://www.electron.build/code-signing)
- [Windows Code-Signing Guide](https://docs.microsoft.com/en-us/windows-hardware/drivers/dashboard/code-signing-best-practices)

