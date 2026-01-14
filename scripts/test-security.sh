#!/bin/bash

# Lokales Test-Skript für Security Workflow
# Simuliert die Security-Scans ohne Push

set -e  # Exit on error

# Farben für Output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo -e "${BLUE}========================================${NC}"
echo -e "${BLUE}Security Workflow - Lokaler Test${NC}"
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

# Security Workflow - Dependency Scan
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${BLUE}Security Workflow: Dependency Scan${NC}"
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo ""

# npm audit mit audit-level=high (wie im Workflow)
# Erstelle audit-report.json für Analyse
if ! run_step "npm audit (high level)" "npm audit --audit-level=high --json > audit-report.json 2>&1 || true"; then
    FAILED_STEPS+=("npm audit")
fi

# Prüfe auf kritische Vulnerabilities (wie im Workflow)
if [ -f audit-report.json ]; then
    echo -e "${YELLOW}▶ Analysiere Audit-Report${NC}"
    if command -v jq &> /dev/null; then
        CRITICAL=$(jq -r '.metadata.vulnerabilities.critical // 0' audit-report.json 2>/dev/null || echo "0")
        HIGH=$(jq -r '.metadata.vulnerabilities.high // 0' audit-report.json 2>/dev/null || echo "0")
        
        if [ "$CRITICAL" -gt 0 ] || [ "$HIGH" -gt 5 ]; then
            echo -e "${RED}❌ Kritische oder zu viele High Vulnerabilities gefunden!${NC}"
            echo -e "${RED}Critical: $CRITICAL${NC}"
            echo -e "${RED}High: $HIGH${NC}"
            FAILED_STEPS+=("Vulnerability Check")
        else
            echo -e "${GREEN}✅ Keine kritischen Vulnerabilities und akzeptable Anzahl von High Vulnerabilities${NC}"
            echo -e "${GREEN}Critical: $CRITICAL${NC}"
            echo -e "${GREEN}High: $HIGH${NC}"
        fi
    else
        echo -e "${YELLOW}⚠ jq nicht installiert - überspringe Analyse${NC}"
        echo -e "${YELLOW}Installiere jq für vollständige Analyse: sudo apt-get install jq (Linux) oder brew install jq (macOS)${NC}"
    fi
    echo ""
fi

# Security Workflow - Secrets Scan
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${BLUE}Security Workflow: Secrets Detection${NC}"
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo ""

# Prüfe ob Gitleaks installiert ist
if command -v gitleaks &> /dev/null; then
    # Führe Gitleaks Scan aus (wie im Workflow: --verbose --redact)
    if ! run_step "Gitleaks Secrets Scan" "gitleaks detect --verbose --redact --source . --no-banner"; then
        FAILED_STEPS+=("Gitleaks Secrets Scan")
    fi
else
    echo -e "${YELLOW}⚠ Gitleaks nicht installiert - überspringe Secrets Scan${NC}"
    echo -e "${YELLOW}Installiere Gitleaks für Secrets Detection:${NC}"
    echo -e "${YELLOW}  Linux: https://github.com/gitleaks/gitleaks#installation${NC}"
    echo -e "${YELLOW}  macOS: brew install gitleaks${NC}"
    echo -e "${YELLOW}  Windows: choco install gitleaks${NC}"
    echo ""
fi

# Zusammenfassung
echo -e "${BLUE}========================================${NC}"
echo -e "${BLUE}Zusammenfassung${NC}"
echo -e "${BLUE}========================================${NC}"
echo ""

if [ ${#FAILED_STEPS[@]} -eq 0 ]; then
    echo -e "${GREEN}✅ Alle Security-Tests erfolgreich!${NC}"
    exit 0
else
    echo -e "${RED}❌ Folgende Security-Schritte sind fehlgeschlagen:${NC}"
    for step in "${FAILED_STEPS[@]}"; do
        echo -e "${RED}  - ${step}${NC}"
    done
    echo ""
    echo -e "${YELLOW}Bitte behebe die Fehler, bevor du pushst.${NC}"
    exit 1
fi
