#!/usr/bin/env node

/**
 * Lokaler CI-Test-Runner
 * Simuliert alle GitHub Workflow-Checks vor dem Push
 *
 * Usage: npm run test:ci:local
 *        npm run test:ci:local -- --quick    (nur schnelle Checks)
 *        npm run test:ci:local -- --full     (alle Checks inkl. langsame)
 */

const { execSync } = require("child_process");

// Farben für Output
const colors = {
  reset: "\x1b[0m",
  red: "\x1b[31m",
  green: "\x1b[32m",
  yellow: "\x1b[33m",
  blue: "\x1b[34m",
  magenta: "\x1b[35m",
  cyan: "\x1b[36m",
  gray: "\x1b[90m",
};

const symbols = {
  success: "\u2714",
  failure: "\u2716",
  warning: "\u26A0",
  running: "\u25B6",
  skipped: "\u25CB",
};

// Parse CLI arguments
const args = process.argv.slice(2);
const isQuick = args.includes("--quick");
const isFull = args.includes("--full");

function log(message, color = colors.reset) {
  console.log(`${color}${message}${colors.reset}`);
}

function logStep(step, status, duration = null) {
  const statusColors = {
    running: colors.blue,
    success: colors.green,
    failure: colors.red,
    skipped: colors.gray,
    warning: colors.yellow,
  };
  const statusSymbols = {
    running: symbols.running,
    success: symbols.success,
    failure: symbols.failure,
    skipped: symbols.skipped,
    warning: symbols.warning,
  };

  const durationStr = duration ? ` ${colors.gray}(${duration})${colors.reset}` : "";
  console.log(
    `${statusColors[status]}${statusSymbols[status]}${colors.reset} ${step}${durationStr}`
  );
}

function runCommand(command, options = {}) {
  const startTime = Date.now();
  const timeout = options.timeout || 180000; // 3 min default
  try {
    execSync(command, {
      encoding: "utf-8",
      stdio: options.silent ? "pipe" : "inherit",
      timeout: timeout,
      maxBuffer: 10 * 1024 * 1024, // 10 MB
      ...options,
    });
    const duration = ((Date.now() - startTime) / 1000).toFixed(1) + "s";
    return { success: true, duration };
  } catch (error) {
    const duration = ((Date.now() - startTime) / 1000).toFixed(1) + "s";
    // Check if it was a timeout
    if (error.killed || error.signal === "SIGTERM") {
      return {
        success: false,
        duration,
        error: `Timeout nach ${timeout / 1000}s`,
        timedOut: true,
      };
    }
    return {
      success: false,
      duration,
      error: error.message,
      stdout: error.stdout,
      stderr: error.stderr,
    };
  }
}

function commandExists(command) {
  try {
    if (process.platform === "win32") {
      execSync(`where ${command}`, { stdio: "ignore" });
    } else {
      execSync(`which ${command}`, { stdio: "ignore" });
    }
    return true;
  } catch {
    return false;
  }
}

// CI Checks Definition
const checks = [
  // ===== Lint & Format =====
  {
    name: "ESLint",
    command: "npm run lint",
    category: "lint",
    required: true,
  },
  {
    name: "Prettier",
    command: "npm run prettier:check",
    category: "lint",
    required: true,
  },
  {
    name: "TypeScript",
    command: "npm run type-check",
    category: "lint",
    required: true,
  },

  // ===== Tests =====
  {
    name: "Unit Tests",
    command: "npx vitest run tests/unit --reporter=dot",
    category: "test",
    required: true,
    timeout: 120000, // 2 min
  },
  {
    name: "Integration Tests",
    command: "npx vitest run tests/integration --reporter=dot",
    category: "test",
    required: true,
    timeout: 60000,
  },
  {
    name: "Parity Tests",
    command: "npx vitest run tests/parity --reporter=dot",
    category: "test",
    required: true,
    timeout: 60000,
  },
  {
    name: "Accessibility Tests",
    command: "npx vitest run --config vitest.config.a11y.ts --reporter=dot",
    category: "test",
    required: true,
    timeout: 60000,
  },

  // ===== Security =====
  {
    name: "npm audit",
    command: "npm audit --audit-level=high",
    category: "security",
    required: false, // Kann fehlschlagen wegen Dev-Dependencies
    continueOnError: true,
  },
  {
    name: "Gitleaks (Secrets)",
    command: "gitleaks detect --redact -v --no-git",
    category: "security",
    required: true,
    condition: () => commandExists("gitleaks"),
    skipMessage: "gitleaks nicht installiert - installiere mit: choco install gitleaks",
  },

  // ===== Coverage (optional) =====
  {
    name: "Test Coverage",
    command: "npm run test:coverage",
    category: "coverage",
    required: false,
    slow: true,
  },

  // ===== Build =====
  {
    name: "Next.js Build",
    command: "npm run build",
    category: "build",
    required: false,
    slow: true,
  },
  {
    name: "Electron TypeScript",
    command: "npm run electron:build:ts",
    category: "build",
    required: false,
    slow: true,
  },
];

async function main() {
  console.log("");
  log("=".repeat(60), colors.cyan);
  log("  CI Local Test Runner", colors.cyan);
  log("  Simuliert GitHub Actions Workflow Checks", colors.cyan);
  log("=".repeat(60), colors.cyan);
  console.log("");

  if (isQuick) {
    log("Mode: QUICK (nur schnelle Checks)", colors.yellow);
  } else if (isFull) {
    log("Mode: FULL (alle Checks inkl. Build)", colors.yellow);
  } else {
    log("Mode: STANDARD (Lint + Tests + Security)", colors.yellow);
  }
  console.log("");

  const results = {
    passed: [],
    failed: [],
    skipped: [],
    warnings: [],
  };

  // Gruppiere Checks nach Kategorie
  const categories = {
    lint: { name: "Lint & Format", checks: [] },
    test: { name: "Tests", checks: [] },
    security: { name: "Security", checks: [] },
    coverage: { name: "Coverage", checks: [] },
    build: { name: "Build", checks: [] },
  };

  checks.forEach((check) => {
    categories[check.category].checks.push(check);
  });

  // Führe Checks aus
  for (const [categoryKey, category] of Object.entries(categories)) {
    if (category.checks.length === 0) continue;

    // Skip slow checks in quick mode
    if (isQuick && ["coverage", "build"].includes(categoryKey)) {
      log(`\n${symbols.skipped} ${category.name} (übersprungen im Quick-Mode)`, colors.gray);
      category.checks.forEach((check) => {
        results.skipped.push(check.name);
      });
      continue;
    }

    // Skip build in standard mode (only in full mode)
    if (!isFull && categoryKey === "build") {
      log(`\n${symbols.skipped} ${category.name} (nur im Full-Mode)`, colors.gray);
      category.checks.forEach((check) => {
        results.skipped.push(check.name);
      });
      continue;
    }

    log(`\n${"─".repeat(50)}`, colors.gray);
    log(`${category.name}`, colors.magenta);
    log(`${"─".repeat(50)}`, colors.gray);

    for (const check of category.checks) {
      // Check condition
      if (check.condition && !check.condition()) {
        logStep(check.name, "skipped");
        if (check.skipMessage) {
          log(`  ${check.skipMessage}`, colors.gray);
        }
        results.skipped.push(check.name);
        continue;
      }

      // Skip slow checks unless in full mode
      if (check.slow && !isFull) {
        logStep(check.name, "skipped");
        log(`  Langsamer Check - verwende --full`, colors.gray);
        results.skipped.push(check.name);
        continue;
      }

      logStep(check.name, "running");

      const result = runCommand(check.command, {
        silent: true,
        timeout: check.timeout,
      });

      if (result.success) {
        logStep(check.name, "success", result.duration);
        results.passed.push(check.name);
      } else if (check.continueOnError) {
        logStep(check.name, "warning", result.duration);
        log(`  Warnung: Check fehlgeschlagen (nicht kritisch)`, colors.yellow);
        results.warnings.push(check.name);
      } else {
        logStep(check.name, "failure", result.duration);
        results.failed.push({ name: check.name, error: result.error });

        // Show error details
        if (result.stderr) {
          log(`  Fehler: ${result.stderr.split("\n")[0]}`, colors.red);
        }

        // Stop on required check failure
        if (check.required) {
          log(`\n  Kritischer Fehler - Abbruch`, colors.red);
          break;
        }
      }
    }

    // Stop if we had a critical failure
    if (results.failed.some((f) => checks.find((c) => c.name === f.name)?.required)) {
      break;
    }
  }

  // Summary
  console.log("");
  log("=".repeat(60), colors.cyan);
  log("  Zusammenfassung", colors.cyan);
  log("=".repeat(60), colors.cyan);
  console.log("");

  log(`${colors.green}${symbols.success} Bestanden: ${results.passed.length}${colors.reset}`);
  if (results.warnings.length > 0) {
    log(`${colors.yellow}${symbols.warning} Warnungen: ${results.warnings.length}${colors.reset}`);
  }
  if (results.skipped.length > 0) {
    log(`${colors.gray}${symbols.skipped} Übersprungen: ${results.skipped.length}${colors.reset}`);
  }
  if (results.failed.length > 0) {
    log(`${colors.red}${symbols.failure} Fehlgeschlagen: ${results.failed.length}${colors.reset}`);
    console.log("");
    log("Fehlgeschlagene Checks:", colors.red);
    results.failed.forEach((f) => {
      log(`  - ${f.name}`, colors.red);
    });
  }

  console.log("");

  if (results.failed.length === 0) {
    log(`${symbols.success} Alle CI-Checks bestanden! Bereit zum Push.`, colors.green);
    process.exit(0);
  } else {
    log(
      `${symbols.failure} CI-Checks fehlgeschlagen. Bitte Fehler beheben vor dem Push.`,
      colors.red
    );
    process.exit(1);
  }
}

main().catch((error) => {
  console.error("Unerwarteter Fehler:", error);
  process.exit(1);
});
