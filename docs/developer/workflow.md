# Entwicklungsworkflow

Diese Dokumentation beschreibt den empfohlenen Entwicklungsworkflow für WAWISync.

## Branch-Strategie

### Main Branch

- `main` - Produktions-Branch
- Nur mergen nach Code-Review
- Alle Commits müssen Tests bestehen

### Feature Branches

- `feat/feature-name` - Neue Features
- `fix/bug-name` - Bug-Fixes
- `docs/documentation-name` - Dokumentation
- `refactor/refactoring-name` - Refactoring

## Development-Workflow

### 1. Feature-Branch erstellen

```bash
git checkout -b feat/your-feature-name
```

### 2. Entwicklung

- Code schreiben
- Tests schreiben
- Dokumentation aktualisieren

### 3. Code-Qualität prüfen

```bash
# Linting
npm run lint

# Formatierung
npm run prettier:write

# Type-Check
npm run type-check

# Tests
npm test
```

### 4. Commit

Verwenden Sie [Conventional Commits](https://www.conventionalcommits.org/):

```bash
git commit -m "feat(sync): add support for DBF file format"
```

### 5. Push und Pull Request

```bash
git push origin feat/your-feature-name
```

Erstellen Sie einen Pull Request auf GitHub.

## Pull-Request-Prozess

### PR-Beschreibung

- Beschreiben Sie Ihre Änderungen klar
- Verlinken Sie zu relevanten Issues
- Verwenden Sie die PR-Template-Checkliste

### Code-Review

- Mindestens ein Reviewer muss genehmigen
- Beantworten Sie alle Review-Kommentare
- Committen Sie Änderungen basierend auf Feedback

### Merge

- Nach Genehmigung wird der PR gemerged
- Squash-Merge wird empfohlen

## Testing-Workflow

### Vor jedem Commit

```bash
# Schnelle Tests
npm run test:unit

# Type-Check
npm run type-check

# Linting
npm run lint
```

### Vor Pull Request

```bash
# Alle Tests
npm test

# Coverage
npm run test:coverage

# Integration-Tests
npm run test:integration
```

## Code-Formatierung

### Prettier

Code wird automatisch mit Prettier formatiert:

```bash
# Formatierung prüfen
npm run prettier:check

# Formatierung anwenden
npm run prettier:write
```

### ESLint

Code wird mit ESLint geprüft:

```bash
npm run lint
```

## TypeScript

### Type-Check

```bash
npm run type-check
```

### Strict Mode

TypeScript Strict Mode ist aktiviert. Alle Typen müssen explizit sein.

## Debugging

Siehe [Debugging-Guide](./debugging.md) für Details.

## Best Practices

### Code-Qualität

- Schreiben Sie sauberen, wartbaren Code
- Verwenden Sie aussagekräftige Variablennamen
- Kommentieren Sie komplexe Logik
- Halten Sie Funktionen klein und fokussiert

### Testing

- Schreiben Sie Tests für neue Features
- Ziel: Mindestens 80% Test-Coverage
- Unit-Tests für Domain-Logik
- Integration-Tests für Services

### Dokumentation

- Aktualisieren Sie Dokumentation bei Änderungen
- Verwenden Sie JSDoc für Funktionen
- Dokumentieren Sie komplexe Algorithmen

## Weitere Informationen

- [CONTRIBUTING.md](../../CONTRIBUTING.md) - Detaillierte Beitrags-Richtlinien
- [Debugging-Guide](./debugging.md)
- [Testing-Strategie](./testing.md)
