# Installation

Diese Anleitung erklärt, wie Sie WAWISync auf Windows, macOS oder Linux installieren.

## Voraussetzungen

- **Betriebssystem:** Windows 10+, macOS 10.15+, oder Linux (Ubuntu 20.04+)
- **RAM:** Mindestens 4 GB
- **Festplatte:** Mindestens 500 MB freier Speicherplatz
- **Internetverbindung:** Für Updates und Shopify-API-Zugriff

## Windows

### Installation

1. **Download:**
   - Gehen Sie zu [GitHub Releases](https://github.com/Bebin29/shpysync/releases)
   - Laden Sie `WAWISync Setup X.X.X.exe` herunter

2. **Installation:**
   - Doppelklicken Sie auf die heruntergeladene `.exe` Datei
   - Folgen Sie den Installationsanweisungen
   - Die App wird automatisch installiert

3. **Starten:**
   - WAWISync wird im Startmenü verfügbar sein
   - Sie können es auch über den Desktop-Shortcut starten

### Code-Signing (Optional)

Wenn Sie eine mit Self-Signed-Zertifikat signierte Version installieren:

- Windows zeigt möglicherweise eine Warnung an
- Sie können die Warnung ignorieren oder das Zertifikat installieren
- Siehe [Code-Signing Dokumentation](../CODE_SIGNING.md) für Details

## macOS

### Installation

1. **Download:**
   - Gehen Sie zu [GitHub Releases](https://github.com/Bebin29/shpysync/releases)
   - Laden Sie `WAWISync-X.X.X.dmg` herunter

2. **Installation:**
   - Öffnen Sie die heruntergeladene `.dmg` Datei
   - Ziehen Sie WAWISync in den Applications-Ordner
   - Die App ist jetzt installiert

3. **Starten:**
   - Öffnen Sie den Applications-Ordner
   - Doppelklicken Sie auf WAWISync
   - Bei der ersten Ausführung zeigt macOS möglicherweise eine Warnung an
   - Gehen Sie zu Systemeinstellungen → Sicherheit → "Trotzdem öffnen"

### Gatekeeper (Erste Ausführung)

Bei der ersten Ausführung zeigt macOS möglicherweise eine Warnung an:

1. Gehen Sie zu **Systemeinstellungen** → **Sicherheit & Datenschutz**
2. Klicken Sie auf **"Trotzdem öffnen"** neben der Warnung
3. Bestätigen Sie die Ausführung

## Linux

### Installation

1. **Download:**
   - Gehen Sie zu [GitHub Releases](https://github.com/Bebin29/shpysync/releases)
   - Laden Sie `WAWISync-X.X.X.AppImage` oder das `.deb` Paket herunter

2. **AppImage:**

   ```bash
   chmod +x WAWISync-X.X.X.AppImage
   ./WAWISync-X.X.X.AppImage
   ```

3. **DEB-Paket (Ubuntu/Debian):**

   ```bash
   sudo dpkg -i WAWISync-X.X.X.deb
   sudo apt-get install -f  # Falls Abhängigkeiten fehlen
   ```

4. **Starten:**
   - AppImage: Führen Sie die AppImage-Datei aus
   - DEB: WAWISync ist im Anwendungsmenü verfügbar

## Automatische Updates

WAWISync unterstützt automatische Updates:

- Die App prüft automatisch auf Updates (standardmäßig alle 24 Stunden)
- Sie können Updates manuell über die Einstellungen prüfen
- Updates werden automatisch heruntergeladen und installiert

## Deinstallation

### Windows

1. Gehen Sie zu **Systemsteuerung** → **Programme** → **Programme und Features**
2. Wählen Sie WAWISync aus
3. Klicken Sie auf **Deinstallieren**

### macOS

1. Öffnen Sie den **Applications**-Ordner
2. Ziehen Sie WAWISync in den Papierkorb
3. Leeren Sie den Papierkorb

### Linux

**AppImage:**

- Löschen Sie einfach die AppImage-Datei

**DEB:**

```bash
sudo dpkg -r wawisync
```

## Troubleshooting

### Installation schlägt fehl

- **Windows:** Stellen Sie sicher, dass Sie Administrator-Rechte haben
- **macOS:** Überprüfen Sie die Gatekeeper-Einstellungen
- **Linux:** Stellen Sie sicher, dass alle Abhängigkeiten installiert sind

### App startet nicht

- Überprüfen Sie die Systemanforderungen
- Konsultieren Sie den [Troubleshooting-Guide](../TROUBLESHOOTING.md)
- Erstellen Sie ein [GitHub Issue](https://github.com/Bebin29/shpysync/issues)

## Weitere Informationen

- [Erste Schritte](./getting-started.md) - Nach der Installation
- [Features](./features.md) - Verfügbare Features
- [FAQ](./faq.md) - Häufig gestellte Fragen
