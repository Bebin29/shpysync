# Release Checklist

Diese Checkliste stellt sicher, dass alle Releases von WAWISync professionell, sicher und zuverlässig durchgeführt werden.

## Automatische Releases

WAWISync verwendet [semantic-release](https://github.com/semantic-release/semantic-release) für vollautomatische Releases basierend auf [Conventional Commits](https://www.conventionalcommits.org/).

**Automatische Prozesse:**

- ✅ Versionierung basierend auf Commit-Types
- ✅ CHANGELOG.md Aktualisierung
- ✅ Release Notes Generierung
- ✅ GitHub Release Erstellung
- ✅ Git Tag Erstellung

**Manuelle Schritte sind nur erforderlich für:**

- Pre-Release Validierung (optional)
- Manuelle Releases (falls gewünscht)

## Pre-Release Checklist

Diese Checkliste sollte vor jedem Release (automatisch oder manuell) durchgegangen werden:

### Code Quality

- [ ] Alle Tests bestehen (`npm test`)
- [ ] Linting erfolgreich (`npm run lint`)
- [ ] Type-Check erfolgreich (`npm run type-check`)
- [ ] Prettier Formatierung korrekt (`npm run prettier:check`)
- [ ] Keine TypeScript-Fehler
- [ ] Keine ESLint-Fehler
- [ ] Code-Review abgeschlossen (falls manueller Release)

### Testing Checklist

- [ ] **Unit Tests:** Alle Unit-Tests bestehen

  ```bash
  npm run test:unit
  ```

- [ ] **Integration Tests:** Alle Integration-Tests bestehen

  ```bash
  npm run test:integration
  ```

- [ ] **Parity Tests:** Alle Parity-Tests bestehen

  ```bash
  npm run test:parity
  ```

- [ ] **Test Coverage:** Mindestens 80% Coverage erreicht

  ```bash
  npm run test:coverage
  ```

- [ ] **E2E Tests:** E2E-Tests bestehen (wenn vorhanden)

### Documentation Checklist

- [ ] **CHANGELOG.md:** Aktualisiert und korrekt (automatisch durch semantic-release)
- [ ] **README.md:** Aktuell und korrekt
- [ ] **API-Dokumentation:** Aktualisiert (falls API-Änderungen)
- [ ] **Breaking Changes:** Dokumentiert in CHANGELOG.md
- [ ] **Migration Guide:** Erstellt (falls Breaking Changes)
- [ ] **Release Notes:** Generiert automatisch durch semantic-release

### Security Checklist

- [ ] **npm audit:** Keine kritischen oder hohen Vulnerabilities

  ```bash
  npm audit
  ```

- [ ] **CodeQL:** Keine kritischen Security-Issues
  - Prüfe GitHub Security Tab

- [ ] **Secrets:** Keine Secrets im Code committed
  - Prüfe mit `gitleaks` oder ähnlichen Tools

- [ ] **Dependencies:** Alle Dependencies aktuell
  - Prüfe Dependabot PRs

- [ ] **Security Headers:** Korrekt konfiguriert (Electron)
- [ ] **CSP:** Content Security Policy korrekt (Electron)

### Build Checklist

- [ ] **Build erfolgreich:** Alle Plattformen bauen erfolgreich

  ```bash
  npm run electron:build:all
  ```

- [ ] **Code-Signing:** Zertifikate vorhanden (falls verwendet)
- [ ] **Installer:** Installer-Dateien werden korrekt erstellt
- [ ] **Update-Metadaten:** `latest-*.yml` Dateien werden erstellt

### Release Channels

Aktuell unterstützt WAWISync nur **Stable Releases**.

**Stable Releases:**

- Werden automatisch auf `main` Branch erstellt
- Semantische Versionierung (MAJOR.MINOR.PATCH)
- Vollständige Build-Artefakte für alle Plattformen

**Zukünftige Release Channels (optional):**

- **Beta Releases:** Für Pre-Release-Testing
- **Alpha Releases:** Für frühe Entwicklungsversionen

## Automatischer Release-Prozess

### Workflow-Ablauf

1. **CI läuft:** GitHub Actions CI Workflow wird auf `main` Branch ausgeführt
2. **CI erfolgreich:** Alle Tests, Linting und Type-Checks bestehen
3. **semantic-release startet:** Release Workflow wird automatisch getriggert
4. **Commit-Analyse:** semantic-release analysiert Commits seit letztem Release
5. **Version-Bestimmung:** Neue Version wird basierend auf Conventional Commits bestimmt
   - `feat:` → Minor Version (1.0.3 → 1.1.0)
   - `fix:` → Patch Version (1.0.3 → 1.0.4)
   - `BREAKING CHANGE:` → Major Version (1.0.3 → 2.0.0)
6. **CHANGELOG.md Update:** Automatische Aktualisierung
7. **Release Notes:** Automatische Generierung aus Commits
8. **Git Tag:** Automatische Tag-Erstellung
9. **GitHub Release:** Automatische Release-Erstellung (ohne Build-Artefakte)
10. **Build-Trigger:** `build-release.yml` wird durch Tag getriggert
11. **Build-Artefakte:** Werden automatisch zum Release hinzugefügt

### Manueller Release (Optional)

Falls ein manueller Release gewünscht ist:

1. **Version in package.json aktualisieren:**

   ```json
   "version": "1.0.4"
   ```

2. **CHANGELOG.md aktualisieren:**

   ```bash
   npm run changelog:update
   ```

3. **Git Tag erstellen:**

   ```bash
   git tag v1.0.4
   git push origin v1.0.4
   ```

4. **Build-Artefakte erstellen:**
   ```bash
   npm run electron:build:all:publish
   ```

## Rollback Plan

Falls ein Release Probleme verursacht, siehe [ROLLBACK_STRATEGY.md](./ROLLBACK_STRATEGY.md) für detaillierte Rollback-Anweisungen.

**Kurze Rollback-Schritte:**

1. Identifiziere problematische Version
2. Erstelle Hotfix-Release (falls möglich)
3. Oder markiere vorherige Version als "latest"
4. Kommuniziere Rollback an Benutzer

## Version-Historie

Alle Releases werden in folgenden Orten dokumentiert:

- **CHANGELOG.md:** Vollständige Änderungshistorie
- **GitHub Releases:** Release Notes und Build-Artefakte
- **Git Tags:** Versions-Tags im Repository

## Troubleshooting

### Release wird nicht erstellt

**Mögliche Ursachen:**

- Keine neuen Commits seit letztem Release
- Commits folgen nicht dem Conventional Commits Format
- CI-Workflow ist fehlgeschlagen
- Keine Änderungen, die ein Release rechtfertigen (nur `docs:`, `chore:`, etc.)

**Lösung:**

- Prüfe Commit-Messages (müssen Conventional Commits folgen)
- Prüfe CI-Workflow-Status
- Prüfe semantic-release Logs

### Build-Artefakte fehlen im Release

**Mögliche Ursachen:**

- `build-release.yml` Workflow ist fehlgeschlagen
- Code-Signing-Probleme
- Build-Fehler auf bestimmten Plattformen

**Lösung:**

- Prüfe `build-release.yml` Workflow-Status
- Prüfe Build-Logs für Fehler
- Manuell Build-Artefakte hochladen (falls nötig)

### Falsche Version bestimmt

**Mögliche Ursachen:**

- Commit-Messages nicht korrekt formatiert
- Breaking Changes nicht als `BREAKING CHANGE:` markiert

**Lösung:**

- Prüfe Commit-Messages
- Verwende `BREAKING CHANGE:` Footer für Major Releases
- Manueller Release möglich (siehe oben)

## Best Practices

1. **Conventional Commits verwenden:** Alle Commits sollten dem Conventional Commits Standard folgen
2. **Breaking Changes dokumentieren:** Verwende `BREAKING CHANGE:` Footer für Major Releases
3. **Tests vor Release:** Stelle sicher, dass alle Tests bestehen
4. **Dokumentation aktuell:** Aktualisiere Dokumentation vor Release
5. **Security-Scans:** Führe Security-Scans vor Release durch
6. **Release Notes prüfen:** Prüfe automatisch generierte Release Notes (falls manueller Release)

## Weitere Informationen

- [semantic-release Dokumentation](https://semantic-release.gitbook.io/)
- [Conventional Commits](https://www.conventionalcommits.org/)
- [Release Process](./RELEASE_PROCESS.md)
- [Rollback Strategy](./ROLLBACK_STRATEGY.md)
- [Contributing Guide](../CONTRIBUTING.md)

---

**Letzte Aktualisierung:** 2025-01-XX
