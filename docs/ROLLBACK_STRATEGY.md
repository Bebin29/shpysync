# Rollback Strategy

Diese Dokumentation beschreibt den Prozess zum Rollback von WAWISync-Releases, falls ein Release kritische Probleme verursacht.

## Übersicht

Ein Rollback ist notwendig, wenn ein Release:

- Kritische Bugs enthält
- Sicherheitslücken einführt
- Datenverlust verursacht
- Die App unbrauchbar macht
- Performance-Probleme verursacht

## Rollback-Optionen

### Option 1: Hotfix-Release (Empfohlen)

**Wann verwenden:**

- Problem kann schnell behoben werden
- Fix ist einfach und sicher
- Weniger als 24 Stunden seit Release

**Prozess:**

1. **Problem identifizieren:** Dokumentiere das Problem detailliert
2. **Fix entwickeln:** Erstelle einen Fix-Branch
3. **Tests:** Stelle sicher, dass der Fix alle Tests besteht
4. **Hotfix-Release:** Erstelle einen Patch-Release (z.B. 1.0.4 → 1.0.5)
5. **Kommunikation:** Informiere Benutzer über den Hotfix

**Vorteile:**

- Schnelle Lösung
- Keine Datenverlust-Risiken
- Benutzer erhalten automatische Updates

### Option 2: Version-Markierung (Schnell)

**Wann verwenden:**

- Sofortiger Rollback erforderlich
- Hotfix nicht schnell möglich
- Temporäre Lösung bis Hotfix verfügbar

**Prozess:**

1. **GitHub Release bearbeiten:**
   - Gehe zu: https://github.com/Bebin29/shpysync/releases
   - Finde das problematische Release
   - Markiere es als "Pre-release" oder "Draft"

2. **Vorherige Version markieren:**
   - Finde die letzte stabile Version
   - Stelle sicher, dass sie als "Latest" markiert ist
   - Oder erstelle einen neuen Release mit der vorherigen Version

3. **Kommunikation:**
   - Erstelle ein GitHub Issue/Advisory
   - Informiere Benutzer über das Problem
   - Gib Anweisungen zum Downgrade

**Vorteile:**

- Sofortiger Rollback
- Keine Code-Änderungen nötig
- Benutzer können manuell downgraden

**Nachteile:**

- Benutzer müssen manuell downgraden
- Keine automatischen Updates

### Option 3: Vollständiger Rollback (Letzte Option)

**Wann verwenden:**

- Kritische Sicherheitslücke
- Datenverlust-Risiko
- App komplett unbrauchbar

**Prozess:**

1. **Git Tag löschen (falls nötig):**

   ```bash
   git tag -d v1.0.4
   git push origin :refs/tags/v1.0.4
   ```

2. **GitHub Release löschen:**
   - Gehe zu GitHub Releases
   - Lösche das problematische Release
   - Oder markiere es als "Pre-release"

3. **Code-Rollback (falls nötig):**

   ```bash
   git revert <commit-hash>
   git push origin main
   ```

4. **Kommunikation:**
   - Erstelle GitHub Advisory (Security)
   - Informiere alle Benutzer
   - Gib klare Anweisungen

**Vorteile:**

- Vollständige Entfernung des problematischen Releases
- Verhindert weitere Schäden

**Nachteile:**

- Komplexer Prozess
- Kann Git-Historie beeinflussen
- Benutzer müssen manuell handeln

## Rollback-Prozess Schritt-für-Schritt

### 1. Problem identifizieren

**Checkliste:**

- [ ] Problem dokumentieren
- [ ] Schweregrad bestimmen (kritisch, hoch, mittel, niedrig)
- [ ] Betroffene Versionen identifizieren
- [ ] Potenzielle Auswirkungen bewerten
- [ ] Benutzer-Betroffenheit abschätzen

### 2. Entscheidung treffen

**Fragen:**

- Kann das Problem mit einem Hotfix behoben werden?
- Wie viele Benutzer sind betroffen?
- Wie kritisch ist das Problem?
- Wie schnell kann ein Fix bereitgestellt werden?

### 3. Rollback durchführen

**Je nach gewählter Option:**

- Hotfix-Release erstellen
- Version-Markierung ändern
- Vollständiger Rollback

### 4. Kommunikation

**Benutzer informieren:**

- GitHub Issue/Advisory erstellen
- Release Notes aktualisieren
- E-Mail/Newsletter (falls vorhanden)
- Dokumentation aktualisieren

### 5. Monitoring

**Nach Rollback:**

- Überwache Fehler-Rate
- Prüfe Benutzer-Feedback
- Stelle sicher, dass Rollback erfolgreich war
- Plane Hotfix-Release (falls nötig)

## Automatische Rollback-Mechanismen

### GitHub Releases

GitHub Releases bieten einige automatische Rollback-Features:

1. **Pre-release Markierung:**
   - Releases können als "Pre-release" markiert werden
   - Verhindert automatische Updates für einige Benutzer

2. **Release-Löschung:**
   - Releases können gelöscht werden
   - Verhindert weitere Downloads

3. **Latest Tag:**
   - GitHub markiert automatisch den neuesten Release als "Latest"
   - Kann manuell geändert werden

### electron-updater

**Automatische Updates:**

- `electron-updater` prüft GitHub Releases
- Benutzer erhalten automatische Updates
- Bei Rollback: Benutzer können manuell downgraden

**Manueller Downgrade:**

1. Alte Version von GitHub Releases herunterladen
2. App deinstallieren
3. Alte Version installieren

## Version-Historie

### Version-Tracking

Alle Releases werden in folgenden Orten dokumentiert:

- **CHANGELOG.md:** Vollständige Änderungshistorie
- **GitHub Releases:** Release Notes und Build-Artefakte
- **Git Tags:** Versions-Tags im Repository

### Version-Vergleich

**Tools für Version-Vergleich:**

- `git diff v1.0.3..v1.0.4` - Code-Änderungen
- GitHub Compare View - Visueller Vergleich
- CHANGELOG.md - Änderungsliste

## Datenbank-Rollback

**Falls relevant:**

- WAWISync verwendet SQLite für lokale Daten
- Datenbank-Schema-Änderungen sollten rückwärtskompatibel sein
- Bei Breaking Changes: Migration-Script bereitstellen

**Datenbank-Backup:**

- Benutzer sollten regelmäßig Backups erstellen
- Dokumentation für Backup/Restore bereitstellen

## User-Kommunikation bei Rollbacks

### Kommunikations-Kanäle

1. **GitHub Advisory:**
   - Für Security-Issues
   - Automatische Benachrichtigungen

2. **GitHub Release Notes:**
   - Update Release Notes mit Rollback-Information
   - Klare Anweisungen für Benutzer

3. **GitHub Issues:**
   - Erstelle Issue für Rollback-Kommunikation
   - Sammle Benutzer-Feedback

### Kommunikations-Template

**Beispiel:**

```
⚠️ WICHTIG: Rollback für Version 1.0.4

Version 1.0.4 wurde aufgrund eines kritischen Problems zurückgezogen.

Problem:
- [Beschreibung des Problems]

Betroffene Versionen:
- 1.0.4

Empfohlene Aktion:
1. Downgrade auf Version 1.0.3
2. Warten auf Hotfix-Release 1.0.5

Download Version 1.0.3:
https://github.com/Bebin29/shpysync/releases/tag/v1.0.3

Wir entschuldigen uns für die Unannehmlichkeiten.
```

## Prävention

### Release-Qualität sicherstellen

1. **Umfangreiche Tests:**
   - Unit Tests
   - Integration Tests
   - E2E Tests
   - Manuelle Tests

2. **Code-Review:**
   - Alle Änderungen reviewen
   - Breaking Changes besonders prüfen

3. **Staging-Umgebung:**
   - Test-Releases in Staging
   - Beta-Testing (wenn möglich)

4. **Monitoring:**
   - Error-Monitoring (Sentry)
   - Performance-Monitoring
   - User-Feedback

### Rollback-Plan vorbereiten

1. **Dokumentation:**
   - Rollback-Prozess dokumentieren
   - Kommunikations-Templates vorbereiten

2. **Tools:**
   - Rollback-Scripts vorbereiten
   - Monitoring-Tools einrichten

3. **Team:**
   - Rollback-Verantwortlichkeiten definieren
   - Kommunikations-Kanäle etablieren

## Best Practices

1. **Schnelle Reaktion:**
   - Reagiere schnell auf kritische Probleme
   - Kommuniziere transparent

2. **Dokumentation:**
   - Dokumentiere alle Rollbacks
   - Lerne aus Fehlern

3. **Prävention:**
   - Investiere in Qualitätssicherung
   - Führe umfangreiche Tests durch

4. **Kommunikation:**
   - Informiere Benutzer proaktiv
   - Gib klare Anweisungen

## Weitere Informationen

- [Release Checklist](./RELEASE_CHECKLIST.md)
- [Release Process](./RELEASE_PROCESS.md)
- [Security Policy](../SECURITY.md)
- [Contributing Guide](../CONTRIBUTING.md)

---

**Letzte Aktualisierung:** 2025-01-XX
