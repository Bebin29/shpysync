# FAQ - Häufig gestellte Fragen

## Allgemein

### Was ist WAWISync?

WAWISync ist eine Desktop-Anwendung zur automatischen Synchronisation von Warenbeständen zwischen POS-Systemen und Shopify.

### Welche Betriebssysteme werden unterstützt?

WAWISync unterstützt:

- Windows 10+
- macOS 10.15+
- Linux (Ubuntu 20.04+)

### Ist WAWISync kostenlos?

Ja, WAWISync ist kostenlos und Open Source.

## Installation

### Wie installiere ich WAWISync?

Siehe [Installations-Anleitung](./installation.md).

### Warum zeigt Windows eine Warnung beim Installieren?

Wenn Sie eine mit Self-Signed-Zertifikat signierte Version installieren, zeigt Windows möglicherweise eine Warnung an. Sie können die Warnung ignorieren oder das Zertifikat installieren.

### Warum zeigt macOS eine Warnung bei der ersten Ausführung?

macOS Gatekeeper zeigt eine Warnung bei nicht-notarisierten Apps. Gehen Sie zu Systemeinstellungen → Sicherheit → "Trotzdem öffnen".

## Konfiguration

### Wie erstelle ich einen Shopify Access Token?

1. Gehen Sie zu Shopify Admin → Einstellungen → Apps und Verkaufsstellen
2. Klicken Sie auf "Entwickeln Sie Apps für Ihren Shop"
3. Erstellen Sie eine Custom App
4. Gewähren Sie die erforderlichen Berechtigungen
5. Kopieren Sie den Access Token

### Welche Berechtigungen benötige ich?

- `read_products` - Produkte lesen
- `write_products` - Produkte schreiben
- `read_inventory` - Bestand lesen
- `write_inventory` - Bestand schreiben
- `read_locations` - Standorte lesen

### Wie teste ich die Verbindung?

Gehen Sie zu Einstellungen → Shop-Konfiguration → "Verbindung testen".

## Synchronisation

### Welche Dateiformate werden unterstützt?

- CSV (Komma-separierte Werte)
- DBF (dBASE-Dateiformat)

### Welche Spalten benötige ich?

- **SKU:** Produkt-SKU (erforderlich)
- **Name:** Produktname (optional)
- **Preis:** Produktpreis
- **Bestand:** Lagerbestand

### Wie funktioniert das Produkt-Matching?

WAWISync verwendet mehrere Strategien:

1. SKU-Matching (höchste Priorität)
2. Barcode-Matching
3. Name-Matching (niedrigste Priorität)

### Was passiert, wenn ein Produkt nicht gefunden wird?

Produkte, die nicht gefunden werden, erscheinen in der "Unmatched Rows"-Liste in der Vorschau. Sie können das Mapping manuell anpassen oder die SKU in Ihrer CSV/DBF-Datei korrigieren.

### Kann ich Preise und Bestand getrennt synchronisieren?

Ja, Sie können wählen, ob Preise, Bestand oder beides synchronisiert werden soll.

### Was ist der Test-Modus?

Der Test-Modus ermöglicht es, einzelne Artikel zu testen, bevor Sie die vollständige Synchronisation durchführen.

## Auto-Sync

### Wie aktiviere ich Auto-Sync?

Gehen Sie zu Einstellungen → Auto-Sync → "Auto-Sync aktivieren".

### Welche Intervalle sind verfügbar?

- 15 Minuten
- 30 Minuten
- 60 Minuten
- 120 Minuten

### Kann ich Auto-Sync pausieren?

Ja, Sie können Auto-Sync jederzeit starten und stoppen.

## Probleme

### Die Synchronisation schlägt fehl. Was soll ich tun?

1. Überprüfen Sie die Logs
2. Testen Sie die Verbindung zu Shopify
3. Überprüfen Sie Ihre CSV/DBF-Datei
4. Konsultieren Sie den [Troubleshooting-Guide](../TROUBLESHOOTING.md)

### Die App startet nicht. Was soll ich tun?

1. Überprüfen Sie die Systemanforderungen
2. Überprüfen Sie, ob alle Abhängigkeiten installiert sind
3. Konsultieren Sie den [Troubleshooting-Guide](../TROUBLESHOOTING.md)
4. Erstellen Sie ein [GitHub Issue](https://github.com/Bebin29/shpysync/issues)

### Wie exportiere ich Logs?

Gehen Sie zur Sync-Historie → Wählen Sie einen Sync → "Logs exportieren".

## Updates

### Wie aktualisiere ich WAWISync?

WAWISync prüft automatisch auf Updates. Sie können auch manuell über Einstellungen → Updates prüfen.

### Werden meine Einstellungen bei Updates beibehalten?

Ja, alle Einstellungen werden bei Updates beibehalten.

## Sicherheit

### Werden meine Access Tokens sicher gespeichert?

Ja, Access Tokens werden verschlüsselt gespeichert.

### Werden Daten an Dritte gesendet?

Nein, WAWISync sendet keine Daten an Dritte. Alle Daten bleiben lokal auf Ihrem Computer.

## Weitere Fragen

### Wo finde ich weitere Hilfe?

- [Troubleshooting-Guide](../TROUBLESHOOTING.md)
- [GitHub Issues](https://github.com/Bebin29/shpysync/issues)
- [Dokumentation](../README.md)

### Kann ich zu WAWISync beitragen?

Ja! Siehe [CONTRIBUTING.md](../../CONTRIBUTING.md) für Details.
