#!/bin/bash

# Lokales Test-Skript für GitHub Workflows
# Simuliert die wichtigsten CI-Schritte ohne Push

set -e  # Exit on error

# Farben für Output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo -e "${BLUE}========================================${NC}"
echo -e "${BLUE}GitHub Workflows - Lokaler Test${NC}"
echo -e "${BLUE}========================================${NC}"
echo ""

# Funktion zum Ausführen eines Schritts
run_step() {
    local step_name=$1
    local command=$2
    
    echo -e "${YELLOW}▶ ${step_name}${NC}"
    if eval "$command"; then
        echo -e "${GREEN}✅ ${step_name} erfolgreich${NC}"
        echo ""
        return 0
    else
        echo -e "${RED}❌ ${step_name} fehlgeschlagen${NC}"
        echo ""
        return 1
    fi
}

# Sammle Fehler
FAILED_STEPS=()

# CI Workflow - Lint & Format Check
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${BLUE}CI Workflow: Lint & Format Check${NC}"
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo ""

if ! run_step "ESLint" "npm run lint"; then
    FAILED_STEPS+=("ESLint")
fi

if ! run_step "Prettier Check" "npm run prettier:check"; then
    FAILED_STEPS+=("Prettier Check")
fi

# CI Workflow - Type Check
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${BLUE}CI Workflow: TypeScript Type Check${NC}"
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo ""

if ! run_step "Type Check" "npm run type-check"; then
    FAILED_STEPS+=("Type Check")
fi

# CI Workflow - Tests
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${BLUE}CI Workflow: Tests${NC}"
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo ""

if ! run_step "Unit Tests" "npm run test:unit"; then
    FAILED_STEPS+=("Unit Tests")
fi

if ! run_step "Integration Tests" "npm run test:integration"; then
    FAILED_STEPS+=("Integration Tests")
fi

if ! run_step "Parity Tests" "npm run test:parity"; then
    FAILED_STEPS+=("Parity Tests")
fi

if ! run_step "Accessibility Tests" "npm run test:a11y"; then
    FAILED_STEPS+=("Accessibility Tests")
fi

# Security Workflow - Dependency Scan
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${BLUE}Security Workflow: Dependency Scan${NC}"
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo ""

# npm audit nur für kritische Vulnerabilities
# Moderate und High Vulnerabilities werden ignoriert, da sie meist breaking changes erfordern
# und oft in Development-Dependencies liegen (z.B. glob in npm, semantic-release)
if ! run_step "npm audit" "npm audit --audit-level=critical"; then
    FAILED_STEPS+=("npm audit")
fi

# Zusammenfassung
echo -e "${BLUE}========================================${NC}"
echo -e "${BLUE}Zusammenfassung${NC}"
echo -e "${BLUE}========================================${NC}"
echo ""

if [ ${#FAILED_STEPS[@]} -eq 0 ]; then
    echo -e "${GREEN}✅ Alle Tests erfolgreich!${NC}"
    echo -e "${GREEN}Du kannst jetzt sicher pushen.${NC}"
    exit 0
else
    echo -e "${RED}❌ Folgende Schritte sind fehlgeschlagen:${NC}"
    for step in "${FAILED_STEPS[@]}"; do
        echo -e "${RED}  - ${step}${NC}"
    done
    echo ""
    echo -e "${YELLOW}Bitte behebe die Fehler, bevor du pushst.${NC}"
    exit 1
fi


