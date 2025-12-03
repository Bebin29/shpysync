#!/usr/bin/env node
/**
 * Script zum automatischen Aktualisieren der CHANGELOG.md
 *
 * Fügt einen neuen Versions-Eintrag am Anfang der CHANGELOG.md hinzu.
 * Das Format folgt Keep a Changelog Standard.
 */

const fs = require("fs");
const path = require("path");

const CHANGELOG_PATH = path.join(process.cwd(), "CHANGELOG.md");
const PACKAGE_JSON_PATH = path.join(process.cwd(), "package.json");

/**
 * Liest die Version aus package.json
 */
function getVersionFromPackage() {
  const packageJson = JSON.parse(fs.readFileSync(PACKAGE_JSON_PATH, "utf-8"));
  return packageJson.version;
}

/**
 * Erstellt einen neuen CHANGELOG-Eintrag für die gegebene Version
 */
function createChangelogEntry(version) {
  const today = new Date().toISOString().split("T")[0]; // YYYY-MM-DD Format

  return `## [${version}] - ${today}

### ✨ Features
- (Automatisch generiert - bitte manuell ausfüllen)

### 🔧 Fixes
- (Automatisch generiert - bitte manuell ausfüllen)

### 📝 Dokumentation
- (Automatisch generiert - bitte manuell ausfüllen)

`;
}

/**
 * Fügt einen neuen Eintrag am Anfang der CHANGELOG.md hinzu
 */
function updateChangelog(version) {
  if (!fs.existsSync(CHANGELOG_PATH)) {
    console.error("❌ CHANGELOG.md nicht gefunden!");
    process.exit(1);
  }

  let changelogContent = fs.readFileSync(CHANGELOG_PATH, "utf-8");

  // Prüfe, ob die Version bereits existiert
  // eslint-disable-next-line security/detect-non-literal-regexp
  const versionPattern = new RegExp(`^## \\[${version.replace(/\./g, "\\.")}\\]`, "m");
  if (versionPattern.test(changelogContent)) {
    console.log(`⚠️  Version ${version} existiert bereits in CHANGELOG.md`);
    return false;
  }

  // Finde die Position nach dem Header (nach "und dieses Projekt folgt...")
  const headerEnd = changelogContent.indexOf("\n## [");
  if (headerEnd === -1) {
    console.error("❌ Konnte Header-Ende in CHANGELOG.md nicht finden!");
    process.exit(1);
  }

  // Erstelle neuen Eintrag
  const newEntry = createChangelogEntry(version);

  // Füge neuen Eintrag ein
  changelogContent =
    changelogContent.slice(0, headerEnd + 1) +
    "\n" +
    newEntry +
    changelogContent.slice(headerEnd + 1);

  // Füge Link am Ende hinzu (falls Links-Sektion existiert)
  const linksSection = changelogContent.match(
    /^\[.*\]: https:\/\/github\.com\/.*\/releases\/tag\/v.*$/m
  );
  if (linksSection) {
    // Finde die letzte Zeile mit einem Link
    const lines = changelogContent.split("\n");
    let lastLinkIndex = -1;
    for (let i = lines.length - 1; i >= 0; i--) {
      // eslint-disable-next-line security/detect-object-injection
      if (lines[i].match(/^\[.*\]: https:\/\/github\.com\/.*\/releases\/tag\/v.*$/)) {
        lastLinkIndex = i;
        break;
      }
    }

    if (lastLinkIndex !== -1) {
      // Extrahiere Repository-Info aus bestehenden Links
      // eslint-disable-next-line security/detect-object-injection
      const repoMatch = lines[lastLinkIndex].match(
        /https:\/\/github\.com\/([^\/]+)\/([^\/]+)\/releases\/tag\/(v.*)/
      );
      if (repoMatch) {
        // eslint-disable-next-line security/detect-object-injection
        const [, owner, repo] = repoMatch;
        const newLink = `[${version}]: https://github.com/${owner}/${repo}/releases/tag/v${version}`;
        lines.splice(lastLinkIndex + 1, 0, newLink);
        changelogContent = lines.join("\n");
      }
    }
  }

  // Schreibe aktualisierte CHANGELOG.md
  fs.writeFileSync(CHANGELOG_PATH, changelogContent, "utf-8");
  console.log(`✅ CHANGELOG.md wurde mit Version ${version} aktualisiert`);
  return true;
}

// Haupt-Logik
const version = process.argv[2] || getVersionFromPackage();

if (!version) {
  console.error("❌ Keine Version angegeben und konnte nicht aus package.json lesen!");
  process.exit(1);
}

console.log(`📝 Aktualisiere CHANGELOG.md für Version ${version}...`);
updateChangelog(version);
