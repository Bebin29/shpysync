# Erste Schritte

Diese Anleitung führt Sie durch die ersten Schritte mit WAWISync.

## Voraussetzungen

Bevor Sie beginnen, benötigen Sie:

- WAWISync installiert (siehe [Installation](./installation.md))
- Einen Shopify-Shop mit Admin-Zugriff
- Ein Shopify Admin API Access Token
- Eine CSV- oder DBF-Datei mit Produktdaten

## Schritt 1: Shopify Access Token erstellen

1. **Shopify Admin öffnen:**
   - Gehen Sie zu Ihrem Shopify Admin
   - Navigieren Sie zu **Einstellungen** → **Apps und Verkaufsstellen**

2. **Custom App erstellen:**
   - Klicken Sie auf **"Entwickeln Sie Apps für Ihren Shop"**
   - Klicken Sie auf **"App erstellen"**
   - Geben Sie einen Namen ein (z.B. "WAWISync")

3. **API-Berechtigungen konfigurieren:**
   - Aktivieren Sie **"Admin API"**
   - Gewähren Sie folgende Berechtigungen:
     - `read_products` - Produkte lesen
     - `write_products` - Produkte schreiben
     - `read_inventory` - Bestand lesen
     - `write_inventory` - Bestand schreiben
     - `read_locations` - Standorte lesen

4. **Access Token kopieren:**
   - Klicken Sie auf **"Installieren"**
   - Kopieren Sie den **Admin API Access Token** (beginnt mit `shpat_`)

## Schritt 2: WAWISync konfigurieren

1. **App starten:**
   - Öffnen Sie WAWISync

2. **Shop konfigurieren:**
   - Gehen Sie zu **Einstellungen**
   - Geben Sie Ihre Shop-URL ein (z.B. `https://mein-shop.myshopify.com`)
   - Fügen Sie den Access Token ein
   - Wählen Sie einen Standort aus
   - Klicken Sie auf **"Verbindung testen"**
   - Wenn erfolgreich, klicken Sie auf **"Speichern"**

## Schritt 3: CSV/DBF-Datei vorbereiten

Ihre CSV/DBF-Datei sollte folgende Spalten enthalten:

- **SKU** - Produkt-SKU (für Matching)
- **Name** - Produktname (optional, für Matching)
- **Preis** - Produktpreis
- **Bestand** - Lagerbestand

**Beispiel CSV:**

```csv
SKU,Name,Preis,Bestand
ABC123,Produkt 1,19.99,50
DEF456,Produkt 2,29.99,30
```

## Schritt 4: Erste Synchronisation

1. **Sync-Seite öffnen:**
   - Gehen Sie zur **Sync**-Seite

2. **Datei auswählen:**
   - Klicken Sie auf **"Datei auswählen"**
   - Wählen Sie Ihre CSV- oder DBF-Datei aus

3. **Spalten-Mapping:**
   - WAWISync versucht automatisch, die Spalten zuzuordnen
   - Überprüfen Sie das Mapping und passen Sie es bei Bedarf an

4. **Vorschau:**
   - Klicken Sie auf **"Vorschau"**
   - Überprüfen Sie die geplanten Änderungen
   - Stellen Sie sicher, dass alle Produkte korrekt zugeordnet sind

5. **Synchronisation starten:**
   - Wählen Sie aus, was synchronisiert werden soll:
     - ✅ Preise aktualisieren
     - ✅ Bestand aktualisieren
   - Klicken Sie auf **"Synchronisieren"**

6. **Ergebnis überprüfen:**
   - Die Synchronisation läuft im Hintergrund
   - Sie sehen den Fortschritt in Echtzeit
   - Nach Abschluss wird eine Zusammenfassung angezeigt

## Schritt 5: Auto-Sync einrichten (Optional)

1. **Auto-Sync aktivieren:**
   - Gehen Sie zu **Einstellungen** → **Auto-Sync**
   - Aktivieren Sie **"Auto-Sync aktivieren"**
   - Wählen Sie ein Intervall (z.B. 60 Minuten)
   - Geben Sie den Pfad zu Ihrer CSV/DBF-Datei an

2. **Auto-Sync starten:**
   - Klicken Sie auf **"Auto-Sync starten"**
   - Die App synchronisiert automatisch in den konfigurierten Intervallen

## Nächste Schritte

- **Dashboard:** Überprüfen Sie die [Dashboard-Features](./features.md#dashboard)
- **Features:** Erkunden Sie alle [verfügbaren Features](./features.md)
- **FAQ:** Lesen Sie die [häufig gestellten Fragen](./faq.md)

## Tipps

- **Test-Modus:** Verwenden Sie den Test-Modus, um einzelne Artikel zu testen
- **Vorschau:** Überprüfen Sie immer die Vorschau vor der Synchronisation
- **Backup:** Erstellen Sie regelmäßig Backups Ihrer Shopify-Daten
- **Logs:** Überprüfen Sie die Logs bei Problemen

## Hilfe

Bei Fragen oder Problemen:

- Konsultieren Sie die [FAQ](./faq.md)
- Lesen Sie den [Troubleshooting-Guide](../TROUBLESHOOTING.md)
- Erstellen Sie ein [GitHub Issue](https://github.com/Bebin29/shpysync/issues)
