# Features

Diese Dokumentation beschreibt alle verfügbaren Features von WAWISync.

## Übersicht

WAWISync bietet folgende Hauptfunktionen:

- CSV/DBF-Datei-Unterstützung
- Intelligentes Produkt-Matching
- Vorschau-Funktion
- Test-Modus
- Automatische Synchronisation
- Dashboard mit Statistiken
- Sync-Historie
- Automatische Updates

## CSV/DBF-Unterstützung

### Unterstützte Formate

- **CSV:** Komma-separierte Werte
- **DBF:** dBASE-Dateiformat

### Spalten-Mapping

WAWISync unterstützt flexibles Spalten-Mapping:

- Automatische Erkennung von Spalten
- Manuelle Zuordnung möglich
- Mapping wird gespeichert für zukünftige Verwendung

### Unterstützte Spalten

- **SKU:** Produkt-SKU (erforderlich für Matching)
- **Name:** Produktname (optional, für Matching)
- **Preis:** Produktpreis
- **Bestand:** Lagerbestand

## Intelligentes Produkt-Matching

WAWISync verwendet mehrere Strategien für Produkt-Matching:

1. **SKU-Matching:** Exakte Übereinstimmung der SKU
2. **Name-Matching:** Ähnliche Produktnamen
3. **Barcode-Matching:** Barcode-Übereinstimmung

### Matching-Priorität

1. SKU (höchste Priorität)
2. Barcode
3. Name (niedrigste Priorität)

## Vorschau-Funktion

Vor jeder Synchronisation können Sie eine Vorschau der geplanten Änderungen anzeigen:

- **Geplante Operationen:** Alle geplanten Preis- und Bestands-Updates
- **Unmatched Rows:** Zeilen, die keinem Produkt zugeordnet werden konnten
- **Details:** Detaillierte Informationen zu jeder Operation

## Test-Modus

Der Test-Modus ermöglicht es, einzelne Artikel zu testen:

- Wählen Sie einen Artikel aus der Vorschau
- Führen Sie einen Test-Sync durch
- Überprüfen Sie das Ergebnis in Shopify

## Automatische Synchronisation

### Auto-Sync

WAWISync kann automatisch in konfigurierbaren Intervallen synchronisieren:

- **Intervall:** 15, 30, 60 oder 120 Minuten
- **Datei-Pfad:** Automatische Verwendung einer CSV/DBF-Datei
- **Status:** Anzeige des aktuellen Status und nächsten Syncs

### Konfiguration

- Aktivieren/Deaktivieren von Auto-Sync
- Intervall-Einstellung
- Datei-Pfad-Konfiguration
- Test-Sync-Funktion

## Dashboard

Das Dashboard bietet einen Überblick über:

- **Statistiken:**
  - Gesamtanzahl Produkte
  - Gesamtanzahl Varianten
  - Letzte Synchronisation
  - Erfolgs-/Fehler-Rate

- **Sync-Historie:**
  - Letzte 10 Synchronisationen
  - Detaillierte Ergebnisse
  - Zeitstempel und Konfiguration

## Sync-Historie

Die Sync-Historie speichert alle durchgeführten Synchronisationen:

- **Erfolgreiche Syncs:** Grüne Markierung
- **Fehlgeschlagene Syncs:** Rote Markierung
- **Details:** Detaillierte Informationen zu jedem Sync
- **Export:** Export-Funktion für Logs

## Automatische Updates

WAWISync unterstützt automatische Updates:

- **Automatische Prüfung:** Standardmäßig alle 24 Stunden
- **Manuelle Prüfung:** Über die Einstellungen
- **Download:** Automatischer Download von Updates
- **Installation:** Ein-Klick-Installation

## Einstellungen

### Shop-Konfiguration

- Shop-URL
- Access Token
- Standort-Auswahl
- Verbindungstest

### Spalten-Mapping

- Standard-Mapping speichern
- Mapping für verschiedene Dateiformate

### Auto-Sync

- Aktivieren/Deaktivieren
- Intervall-Einstellung
- Datei-Pfad-Konfiguration

### Updates

- Automatische Update-Prüfung
- Update-Intervall-Einstellung

## Export-Funktionen

### CSV-Export

- Export von Sync-Ergebnissen
- Export von Logs
- Export von Historie

### Log-Export

- Detaillierte Logs
- Fehler-Logs
- Erfolgs-Logs

## Sicherheit

WAWISync implementiert verschiedene Sicherheitsmaßnahmen:

- **Verschlüsselte Token-Speicherung:** Access-Tokens werden verschlüsselt gespeichert
- **Sichere Kommunikation:** IPC-basierte Kommunikation
- **Context Isolation:** Verhindert XSS → RCE Angriffe

## Weitere Informationen

- [Installation](./installation.md)
- [Erste Schritte](./getting-started.md)
- [FAQ](./faq.md)
- [Troubleshooting](../TROUBLESHOOTING.md)
