# Security Policy

## Unterstützte Versionen

Wir veröffentlichen Security-Updates für die folgenden Versionen:

| Version | Unterstützt        |
| ------- | ------------------ |
| 1.0.x   | :white_check_mark: |
| < 1.0   | :x:                |

## Vulnerability Reporting

### Responsible Disclosure

Wir nehmen die Sicherheit von WAWISync ernst. Wenn Sie eine Sicherheitslücke entdecken, bitten wir Sie, diese verantwortungsvoll zu melden.

### Wie melde ich eine Sicherheitslücke?

**Bitte melden Sie Sicherheitslücken NICHT über öffentliche GitHub Issues.**

Stattdessen:

1. **Erstellen Sie ein privates Security Advisory:**
   - Gehen Sie zu https://github.com/Bebin29/shpysync/security/advisories/new
   - Erstellen Sie ein neues Security Advisory
   - Beschreiben Sie die Sicherheitslücke detailliert

2. **Alternativ kontaktieren Sie uns direkt:**
   - Erstellen Sie ein privates Issue mit dem Label "security"
   - Oder kontaktieren Sie den Maintainer direkt über GitHub

### Was sollte in der Meldung enthalten sein?

- **Beschreibung der Sicherheitslücke:** Detaillierte Beschreibung des Problems
- **Betroffene Versionen:** Welche Versionen sind betroffen?
- **Schritte zur Reproduktion:** Wie kann die Sicherheitslücke reproduziert werden?
- **Potenzielle Auswirkungen:** Was könnte ein Angreifer tun?
- **Vorgeschlagene Lösung:** Haben Sie eine Idee, wie das Problem behoben werden könnte?

### Was passiert nach der Meldung?

1. **Bestätigung:** Wir bestätigen den Erhalt Ihrer Meldung innerhalb von 48 Stunden
2. **Bewertung:** Wir bewerten die Sicherheitslücke und ihre Schwere
3. **Behebung:** Wir arbeiten an einem Fix
4. **Veröffentlichung:** Wir veröffentlichen den Fix in einer neuen Version
5. **Credits:** Wir geben Ihnen Credits für die Entdeckung (wenn gewünscht)

### Zeitrahmen

- **Kritische Sicherheitslücken:** Fix innerhalb von 7 Tagen
- **Hoch:** Fix innerhalb von 30 Tagen
- **Mittel:** Fix innerhalb von 90 Tagen
- **Niedrig:** Fix im nächsten regulären Release

## Bekannte Sicherheitslücken

Aktuell sind keine bekannten Sicherheitslücken bekannt.

## Security Best Practices

WAWISync implementiert folgende Security Best Practices:

### Electron Security

- ✅ **Context Isolation:** Aktiviert - Verhindert XSS → RCE Angriffe
- ✅ **Node Integration:** Deaktiviert - Kein direkter Node-Zugriff im Renderer
- ✅ **WebSecurity:** Aktiviert - Web-Security ist standardmäßig aktiviert
- ✅ **Content Security Policy (CSP):** Konfiguriert für Renderer-Prozess
  - Production: Restriktive CSP-Regeln
  - Development: Weniger restriktive Regeln für Development-Tools
- ✅ **Security Headers:** X-Content-Type-Options, X-Frame-Options, Referrer-Policy
- ⚠️ **Sandboxing:** Deaktiviert (nicht kompatibel mit Preload-Scripts)

### Daten-Sicherheit

- ✅ **Verschlüsselte Token-Speicherung:** Access-Tokens werden verschlüsselt gespeichert
- ✅ **IPC-basierte Kommunikation:** Alle kritischen Operationen laufen über den Main Process
- ✅ **Keine Hardcoded Secrets:** Alle Secrets werden sicher gespeichert
- ✅ **Secrets Management:** Dokumentierte Strategie für Secrets-Verwaltung
- ✅ **Error Handling:** Keine Stack-Traces oder sensible Daten in Produktion

### Code-Signing

- ✅ **Code-Signing Support:** Optional für zusätzliche Sicherheit
- ✅ **Zertifikat-Verwaltung:** Sichere Verwaltung von Code-Signing-Zertifikaten

### Dependency Security

- ✅ **Regelmäßige Updates:** Dependencies werden regelmäßig aktualisiert
- ✅ **Vulnerability Scanning:** npm audit wird regelmäßig ausgeführt
- ✅ **Dependabot:** Automatische Security-Updates konfiguriert
- ✅ **CodeQL:** Automatische Code-Security-Analyse bei jedem Push/PR
- ✅ **Secrets Detection:** Gitleaks scannt auf versehentlich committed Secrets

## Security Updates

### Automatische Updates

WAWISync unterstützt automatische Updates über GitHub Releases. Wir empfehlen, automatische Updates zu aktivieren, um sicherzustellen, dass Sie immer die neuesten Security-Patches erhalten.

### Manuelle Updates

Sie können auch manuell nach Updates suchen:

- Über die App-Einstellungen
- Über GitHub Releases: https://github.com/Bebin29/shpysync/releases

## Content Security Policy (CSP)

WAWISync implementiert eine Content Security Policy für den Renderer-Prozess:

### Production CSP

```
default-src 'self';
script-src 'self';
style-src 'self' 'unsafe-inline';
img-src 'self' data: https:;
font-src 'self' data:;
connect-src 'self' https://*.myshopify.com;
```

### Development CSP

Weniger restriktive Regeln für Development-Tools (DevTools, Hot Reload, etc.)

**Weitere Informationen:** Siehe `electron/main.ts` für die vollständige CSP-Konfiguration.

## Security Headers

WAWISync setzt folgende Security Headers:

- **X-Content-Type-Options:** `nosniff` - Verhindert MIME-Type-Sniffing
- **X-Frame-Options:** `DENY` - Verhindert Clickjacking
- **Referrer-Policy:** `strict-origin-when-cross-origin` - Kontrolliert Referrer-Informationen

**Hinweis:** Diese Headers sind für Electron-Apps weniger relevant, werden aber dennoch gesetzt für zusätzliche Sicherheit.

## Input Validation & Sanitization

WAWISync validiert und sanitized alle User-Inputs:

- ✅ **Zod-Schema-Validierung:** Alle Konfigurationen werden validiert
- ✅ **CSV-Sanitization:** Encoding-Normalisierung, Whitespace-Trim
- ✅ **SQL-Injection-Prävention:** Parameterized Queries für SQLite
- ✅ **XSS-Prävention:** React escaped automatisch, CSP zusätzlich

**Weitere Informationen:** Siehe `docs/developer/input-validation.md`

## Rate Limiting

WAWISync implementiert Client-seitiges Rate-Limiting für Shopify API:

- ✅ **Standard-Sleep:** 200ms zwischen Requests
- ✅ **Retry-Logik:** Exponential Backoff bei Rate-Limit-Fehlern
- ✅ **Rate-Limit-Monitoring:** Header-Parsing und Tracking

**Weitere Informationen:** Siehe `docs/developer/rate-limiting.md`

## Secrets Management

WAWISync verwendet eine sichere Secrets-Verwaltung:

- ✅ **.env.example:** Template für Umgebungsvariablen
- ✅ **Electron Store:** Verschlüsselte Speicherung von Tokens
- ✅ **GitHub Secrets:** Für CI/CD-Pipeline
- ✅ **Secrets Rotation:** Dokumentierte Strategie

**Weitere Informationen:** Siehe `docs/developer/secrets-management.md`

## Security Checklist für Entwickler

Wenn Sie Code zu WAWISync beitragen, beachten Sie bitte:

- [ ] Keine Hardcoded Secrets oder Passwörter
- [ ] Input-Validierung für alle User-Inputs (Zod)
- [ ] Sichere Fehlerbehandlung (keine Stack-Traces in Produktion)
- [ ] Dependency-Updates prüfen
- [ ] Security-Best-Practices für Electron beachten
- [ ] Code-Review durchführen lassen
- [ ] Secrets-Detection vor Commit prüfen
- [ ] CSP-Regeln beachten

## Weitere Informationen

- [Electron Security Best Practices](https://www.electronjs.org/docs/latest/tutorial/security)
- [OWASP Top 10](https://owasp.org/www-project-top-ten/)
- [Node.js Security Best Practices](https://nodejs.org/en/docs/guides/security/)

## Kontakt

Bei Fragen zur Sicherheit kontaktieren Sie bitte:

- GitHub Security Advisories: https://github.com/Bebin29/shpysync/security/advisories
- GitHub Issues (mit Label "security"): https://github.com/Bebin29/shpysync/issues

---

**Letzte Aktualisierung:** 2025-01-XX
