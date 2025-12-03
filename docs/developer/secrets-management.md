# Secrets Management

Dieses Dokument beschreibt die Strategie für die Verwaltung von Secrets (Passwörtern, Tokens, API-Keys) in WAWISync.

## Übersicht

WAWISync verwendet verschiedene Secrets für die Funktionalität:

- **Shopify Access Tokens** - Für API-Zugriff auf Shopify
- **Code-Signing-Zertifikate** - Für signierte Builds (optional)
- **GitHub Tokens** - Für private Repositories (optional)

## Secrets-Speicherung

### Lokale Entwicklung

#### 1. Umgebungsvariablen (.env)

Erstellen Sie eine `.env` Datei im Projekt-Root (siehe `.env.example`):

```bash
# GitHub Token (optional)
GH_TOKEN=your_github_token_here

# Code-Signing (optional)
CSC_LINK=build/certificate.pfx
CSC_KEY_PASSWORD=your_certificate_password
```

**Wichtig:**

- Die `.env` Datei ist bereits in `.gitignore` enthalten
- Niemals `.env` Dateien ins Repository committen
- Verwenden Sie `.env.example` als Template

#### 2. Electron Store (Verschlüsselt)

Shopify Access Tokens werden verschlüsselt im Electron Store gespeichert:

- **Speicherort:** `electron-store` mit Verschlüsselung
- **Verschlüsselung:** AES-256-GCM
- **Dateien:**
  - `electron/services/token-store.ts` - Token-Verwaltung
  - `electron/services/config-service.ts` - Konfigurations-Verwaltung

**Token-Format:**

- Tokens werden als `shpat_***` oder `shpca_***` erkannt
- Tokens werden niemals in Klartext gespeichert
- Tokens werden niemals in Logs ausgegeben

### CI/CD (GitHub Actions)

#### GitHub Secrets

Für CI/CD verwenden wir GitHub Secrets:

1. **Repository Secrets konfigurieren:**
   - Gehe zu Repository Settings → Secrets and variables → Actions
   - Füge Secrets hinzu (z.B. `GH_TOKEN`, `CSC_KEY_PASSWORD`)

2. **Verwendung in Workflows:**
   ```yaml
   env:
     GH_TOKEN: ${{ secrets.GH_TOKEN }}
     CSC_KEY_PASSWORD: ${{ secrets.CSC_KEY_PASSWORD }}
   ```

**Verfügbare Secrets:**

- `GH_TOKEN` - GitHub Personal Access Token (optional)
- `CSC_KEY_PASSWORD` - Code-Signing-Zertifikat-Passwort (optional)

## Secrets-Rotation

### Shopify Access Tokens

**Rotation-Strategie:**

1. Token in Shopify Admin erneuern
2. Neues Token in WAWISync-Einstellungen eingeben
3. Altes Token wird automatisch überschrieben
4. Token-Validierung bei App-Start

**Häufigkeit:**

- Bei Verdacht auf Kompromittierung: Sofort
- Regelmäßig: Alle 90 Tage (empfohlen)
- Bei Scope-Änderungen: Sofort

### Code-Signing-Zertifikate

**Rotation-Strategie:**

1. Neues Zertifikat erstellen (siehe `docs/CODE_SIGNING.md`)
2. Altes Zertifikat sichern (falls nötig)
3. Neues Zertifikat in `.env` oder GitHub Secrets konfigurieren
4. Build testen

**Häufigkeit:**

- Bei Ablauf des Zertifikats: Vor Ablaufdatum
- Bei Kompromittierung: Sofort

### GitHub Tokens

**Rotation-Strategie:**

1. Neues Token in GitHub erstellen
2. Altes Token widerrufen
3. Neues Token in `.env` oder GitHub Secrets aktualisieren

**Häufigkeit:**

- Regelmäßig: Alle 180 Tage (empfohlen)
- Bei Kompromittierung: Sofort

## Best Practices

### ✅ DO

- Verwenden Sie `.env.example` als Template
- Speichern Sie Secrets verschlüsselt (Electron Store)
- Verwenden Sie GitHub Secrets für CI/CD
- Rotieren Sie Secrets regelmäßig
- Validieren Sie Tokens bei App-Start
- Maskieren Sie Tokens in Logs (`shpat_***`)

### ❌ DON'T

- Niemals Secrets in Git committen
- Niemals Secrets in Klartext speichern
- Niemals Secrets in Logs ausgeben
- Niemals Secrets in Fehlermeldungen anzeigen
- Niemals Secrets in Code hardcoden
- Niemals Secrets in öffentlichen Repositories

## Secrets-Detection

### Automatische Erkennung

Wir verwenden **Gitleaks** in CI/CD, um versehentlich committed Secrets zu erkennen:

- **Workflow:** `.github/workflows/security.yml`
- **Job:** `secrets-scan`
- **Tool:** Gitleaks
- **Trigger:** Bei jedem Push/PR

### Manuelle Prüfung

Vor jedem Commit:

```bash
# Gitleaks lokal installieren (optional)
# brew install gitleaks  # macOS
# choco install gitleaks  # Windows

# Prüfen Sie Ihren Code
gitleaks detect --source . --verbose
```

## Troubleshooting

### Token wird nicht gespeichert

1. Prüfen Sie die Electron Store-Berechtigungen
2. Prüfen Sie die Verschlüsselungs-Key-Konfiguration
3. Prüfen Sie die Logs für Fehlermeldungen

### Token wird nicht validiert

1. Prüfen Sie das Token-Format (`shpat_` oder `shpca_`)
2. Prüfen Sie die Shopify-API-Verbindung
3. Prüfen Sie die Token-Scopes

### Secrets werden in Logs angezeigt

1. Prüfen Sie die Error-Handler-Konfiguration
2. Prüfen Sie, ob Stack-Traces in Produktion deaktiviert sind
3. Prüfen Sie die Logging-Konfiguration

## Weitere Informationen

- [Electron Store Documentation](https://github.com/sindresorhus/electron-store)
- [GitHub Secrets Documentation](https://docs.github.com/en/actions/security-guides/encrypted-secrets)
- [Gitleaks Documentation](https://github.com/gitleaks/gitleaks)
- [Code-Signing Setup](./CODE_SIGNING.md)
