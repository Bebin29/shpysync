# Contributing to WAWISync

Vielen Dank für Ihr Interesse, zu WAWISync beizutragen! Dieses Dokument enthält Richtlinien und Informationen für Contributors.

## Inhaltsverzeichnis

- [Entwicklungsumgebung Setup](#entwicklungsumgebung-setup)
- [Code-Style-Guidelines](#code-style-guidelines)
- [Commit-Message-Konventionen](#commit-message-konventionen)
- [Pull-Request-Prozess](#pull-request-prozess)
- [Test-Anforderungen](#test-anforderungen)
- [Code-Review-Guidelines](#code-review-guidelines)
- [Issue-Reporting-Guidelines](#issue-reporting-guidelines)
- [Feature-Request-Prozess](#feature-request-prozess)

## Entwicklungsumgebung Setup

### Voraussetzungen

- **Node.js:** Version 18 oder 20 (empfohlen: 20)
- **npm:** Version 9 oder höher
- **Git:** Für Versionskontrolle
- **IDE:** VS Code empfohlen (mit TypeScript-Extension)

### Setup-Schritte

1. **Repository klonen:**

   ```bash
   git clone https://github.com/Bebin29/shpysync.git
   cd shpysync
   ```

2. **Dependencies installieren:**

   ```bash
   npm install
   ```

3. **Development-Modus starten:**

   ```bash
   npm run electron:dev
   ```

4. **Tests ausführen:**
   ```bash
   npm test
   ```

### Nützliche Scripts

- `npm run electron:dev` - Startet die App im Development-Modus
- `npm run lint` - Führt ESLint aus
- `npm run prettier:check` - Prüft Code-Formatierung
- `npm run prettier:write` - Formatiert Code automatisch
- `npm run type-check` - Prüft TypeScript-Typen
- `npm test` - Führt alle Tests aus
- `npm run test:watch` - Tests im Watch-Modus
- `npm run test:coverage` - Test-Coverage-Report

## Code-Style-Guidelines

### TypeScript

- **Strict Mode:** TypeScript Strict Mode ist aktiviert
- **Typen:** Explizite Typen für alle Funktionen und Klassen
- **Return Types:** Immer explizite Return-Types angeben (inkl. `void` oder `Promise<void>`)
- **Docstrings:** Alle Funktionen und Klassen benötigen JSDoc-Kommentare
- **PEP 257:** Docstrings folgen PEP 257-Konventionen (für Python-ähnliche Struktur)

**Beispiel:**

```typescript
/**
 * Berechnet den Gesamtpreis für eine gegebene Anzahl von Produkten.
 *
 * @param productQuantity - Die Anzahl der Produkte
 * @param productPrice - Der Preis pro Produkt
 * @returns Der Gesamtpreis
 */
function calculateProductPrice(productQuantity: number, productPrice: number): number {
  return productQuantity * productPrice;
}
```

### React/Next.js

- **Functional Components:** Verwenden Sie funktionale Komponenten
- **Hooks:** Verwenden Sie React Hooks für State-Management
- **TypeScript:** Alle Komponenten müssen TypeScript-Typen haben
- **Props:** Props müssen explizit typisiert sein

**Beispiel:**

```typescript
interface ButtonProps {
  label: string;
  onClick: () => void;
  disabled?: boolean;
}

export function Button({ label, onClick, disabled = false }: ButtonProps): JSX.Element {
  return (
    <button onClick={onClick} disabled={disabled}>
      {label}
    </button>
  );
}
```

### Code-Formatierung

- **Prettier:** Code wird automatisch mit Prettier formatiert
- **Formatierung prüfen:** `npm run prettier:check`
- **Formatierung anwenden:** `npm run prettier:write`

### ESLint

- **Linting:** Code wird mit ESLint geprüft
- **Linting ausführen:** `npm run lint`
- **Regeln:** Siehe `.eslintrc.json` für Details

### Namenskonventionen

- **Variablen/Funktionen:** `camelCase`
- **Klassen/Interfaces:** `PascalCase`
- **Konstanten:** `UPPER_SNAKE_CASE`
- **Dateien:** `kebab-case` für Dateien, `PascalCase` für Komponenten

### Kommentare

- **Code-Kommentare:** Verwenden Sie JSDoc für Funktionen und Klassen
- **Inline-Kommentare:** Sparsam verwenden, Code sollte selbsterklärend sein
- **Warum, nicht Was:** Kommentare sollten das "Warum" erklären, nicht das "Was"

## Commit-Message-Konventionen

Wir verwenden [Conventional Commits](https://www.conventionalcommits.org/) für Commit-Messages.

### Format

```
<type>[optional scope]: <description>

[optional body]

[optional footer(s)]
```

### Types

- `feat:` - Neue Features
- `fix:` - Bug-Fixes
- `docs:` - Dokumentationsänderungen
- `style:` - Code-Formatierung (keine Funktionsänderungen)
- `refactor:` - Code-Refactoring
- `test:` - Test-Änderungen
- `chore:` - Build-Prozess oder Tool-Änderungen
- `perf:` - Performance-Verbesserungen
- `ci:` - CI/CD-Änderungen

### Beispiele

```bash
feat(sync): add support for DBF file format
fix(config): resolve token storage encryption issue
docs(api): update IPC API documentation
refactor(matching): improve product matching algorithm
test(sync): add integration tests for sync engine
```

### Scope (Optional)

Der Scope sollte den betroffenen Bereich angeben:

- `sync` - Synchronisations-Engine
- `config` - Konfigurations-Management
- `ui` - User Interface
- `api` - API/IPC
- `cache` - Cache-Service
- `docs` - Dokumentation

### Automatische Releases

**Wichtig:** WAWISync verwendet [semantic-release](https://github.com/semantic-release/semantic-release) für vollautomatische Releases basierend auf Conventional Commits.

**Wie funktioniert es:**

- Commits mit `feat:` erzeugen automatisch **Minor Releases** (1.0.3 → 1.1.0)
- Commits mit `fix:` erzeugen automatisch **Patch Releases** (1.0.3 → 1.0.4)
- Commits mit `BREAKING CHANGE:` erzeugen automatisch **Major Releases** (1.0.3 → 2.0.0)
- Commits mit `docs:`, `chore:`, `test:`, `ci:` erzeugen **keine Releases** (nur CHANGELOG-Updates)

**Beispiele für automatische Releases:**

```bash
# Minor Release (1.0.3 → 1.1.0)
feat(sync): add support for DBF file format

# Patch Release (1.0.3 → 1.0.4)
fix(config): resolve token storage encryption issue

# Major Release (1.0.3 → 2.0.0)
feat(api): redesign IPC communication

BREAKING CHANGE: IPC API has been completely redesigned.
All existing IPC handlers need to be updated.
```

**Kein Release (nur CHANGELOG-Update):**

```bash
# Kein Release, nur CHANGELOG-Update
docs(api): update IPC API documentation
chore(deps): update dependencies
test(sync): add integration tests
```

**Vorteile:**

- ✅ Automatische Versionierung
- ✅ Automatische CHANGELOG.md Aktualisierung
- ✅ Automatische Release Notes Generierung
- ✅ Keine manuellen Schritte erforderlich

**Weitere Informationen:**

- [Release Process](./docs/RELEASE_PROCESS.md) - Vollständiger Release-Prozess
- [Release Checklist](./docs/RELEASE_CHECKLIST.md) - Pre-Release Checklist

## Pull-Request-Prozess

### Vor dem Pull Request

1. **Fork erstellen:** Forken Sie das Repository
2. **Branch erstellen:** Erstellen Sie einen Feature-Branch
   ```bash
   git checkout -b feat/your-feature-name
   ```
3. **Änderungen machen:** Implementieren Sie Ihre Änderungen
4. **Tests schreiben:** Schreiben Sie Tests für neue Features
5. **Tests ausführen:** Stellen Sie sicher, dass alle Tests bestehen
6. **Linting:** Führen Sie `npm run lint` aus
7. **Formatierung:** Führen Sie `npm run prettier:write` aus
8. **Type-Check:** Führen Sie `npm run type-check` aus

### Pull Request erstellen

1. **Beschreibung:** Beschreiben Sie Ihre Änderungen klar
2. **Referenzen:** Verlinken Sie zu relevanten Issues
3. **Checkliste:** Verwenden Sie die PR-Template-Checkliste
4. **Screenshots:** Fügen Sie Screenshots hinzu (falls UI-Änderungen)

### PR-Template

```markdown
## Beschreibung

Kurze Beschreibung der Änderungen

## Änderungstyp

- [ ] Bug-Fix
- [ ] Neues Feature
- [ ] Breaking Change
- [ ] Dokumentation

## Checkliste

- [ ] Code folgt den Style-Guidelines
- [ ] Selbst-Review durchgeführt
- [ ] Kommentare für komplexe Code-Stellen hinzugefügt
- [ ] Dokumentation aktualisiert
- [ ] Keine neuen Warnings
- [ ] Tests hinzugefügt/aktualisiert
- [ ] Alle Tests bestehen
- [ ] Type-Check erfolgreich
```

### Code-Review-Prozess

- **Reviewer:** Mindestens ein Reviewer muss den PR genehmigen
- **Feedback:** Beantworten Sie alle Review-Kommentare
- [ ] **Änderungen:** Committen Sie Änderungen basierend auf Feedback
- **Merge:** Nach Genehmigung wird der PR gemerged

## Test-Anforderungen

### Test-Typen

1. **Unit-Tests:** Für einzelne Funktionen/Klassen
2. **Integration-Tests:** Für Service-Integrationen
3. **Paritäts-Tests:** Für Daten-Konsistenz
4. **Accessibility-Tests:** Für UI-Komponenten (WCAG 2.1 Level AA)
5. **E2E-Tests:** Für vollständige User-Flows

### Test-Struktur

- **Location:** `tests/unit/`, `tests/integration/`, `tests/parity/`, `tests/accessibility/`
- **Naming:** `*.test.ts` oder `*.spec.ts` (`.test.tsx` für React-Komponenten)
- **Framework:** Vitest (mit jsdom für React-Komponenten)

### Test-Beispiel

```typescript
import { describe, it, expect } from "vitest";
import { calculateProductPrice } from "../core/utils/price-calculator";

describe("calculateProductPrice", () => {
  it("should calculate total price correctly", () => {
    const result = calculateProductPrice(5, 10);
    expect(result).toBe(50);
  });

  it("should handle zero quantity", () => {
    const result = calculateProductPrice(0, 10);
    expect(result).toBe(0);
  });
});
```

### Test-Coverage

- **Ziel:** Mindestens 80% Test-Coverage
- **Prüfung:** `npm run test:coverage`
- **Neue Features:** Neue Features müssen Tests haben

## Code-Review-Guidelines

### Für Reviewer

- **Konstruktiv:** Geben Sie konstruktives Feedback
- **Spezifisch:** Seien Sie spezifisch in Ihren Kommentaren
- **Respektvoll:** Seien Sie respektvoll und professionell
- **Timely:** Geben Sie zeitnah Feedback

### Review-Kriterien

- [ ] Code folgt den Style-Guidelines
- [ ] Code ist verständlich und wartbar
- [ ] Tests sind vorhanden und aussagekräftig
- [ ] Dokumentation ist aktualisiert
- [ ] Keine Sicherheitsprobleme
- [ ] Performance ist akzeptabel

## Issue-Reporting-Guidelines

### Bug Reports

Verwenden Sie die Bug-Report-Vorlage:

```markdown
## Beschreibung

Kurze Beschreibung des Bugs

## Schritte zur Reproduktion

1. Gehe zu '...'
2. Klicke auf '...'
3. Scrolle zu '...'
4. Siehe Fehler

## Erwartetes Verhalten

Was sollte passieren?

## Tatsächliches Verhalten

Was passiert tatsächlich?

## Screenshots

Falls zutreffend, fügen Sie Screenshots hinzu

## Umgebung

- OS: [z.B. Windows 10, macOS 13]
- App-Version: [z.B. 1.0.3]
- Node-Version: [z.B. 20.10.0]

## Zusätzlicher Kontext

Weitere Informationen
```

### Feature Requests

Verwenden Sie die Feature-Request-Vorlage:

```markdown
## Problem/Bedarf

Beschreiben Sie das Problem oder den Bedarf

## Vorgeschlagene Lösung

Beschreiben Sie Ihre vorgeschlagene Lösung

## Alternativen

Beschreiben Sie alternative Lösungen, die Sie in Betracht gezogen haben

## Zusätzlicher Kontext

Weitere Informationen, Screenshots, etc.
```

## Feature-Request-Prozess

1. **Issue erstellen:** Erstellen Sie ein Feature-Request-Issue
2. **Diskussion:** Diskutieren Sie das Feature mit Maintainern
3. **Genehmigung:** Warten Sie auf Genehmigung
4. **Implementierung:** Implementieren Sie das Feature
5. **Pull Request:** Erstellen Sie einen Pull Request
6. **Review:** Durchlaufen Sie den Review-Prozess
7. **Merge:** Nach Genehmigung wird das Feature gemerged

## Weitere Ressourcen

- [Projektplan](./PROJEKTPLAN.md) - Detaillierte Projektplanung
- [Best Practices](./docs/BEST_PRACTICES.md) - Best Practices und Standards
- [API-Dokumentation](./docs/API.md) - IPC-API-Dokumentation
- [Developer Documentation](./docs/developer/) - Entwickler-Dokumentation

## Fragen?

Bei Fragen können Sie:

- Ein Issue erstellen
- Einen Pull Request mit Fragen erstellen
- Die Maintainer direkt kontaktieren

Vielen Dank für Ihre Beiträge! 🎉
