/**
 * Setup-Datei für Accessibility-Tests
 *
 * Diese Datei wird vor jedem Accessibility-Test ausgeführt.
 */

import { expect, afterEach } from "vitest";
import { cleanup } from "@testing-library/react";
import * as matchers from "@testing-library/jest-dom/matchers";
import { toHaveNoViolations } from "jest-axe";

// Erweitere Vitest-Expect mit jest-dom Matchers
expect.extend(matchers);

// Erweitere Vitest-Expect mit jest-axe Matchers
// @ts-expect-error - jest-axe hat keine TypeScript-Definitionen, aber funktioniert zur Laufzeit
expect.extend(toHaveNoViolations);

// Cleanup nach jedem Test
afterEach(() => {
  cleanup();
});
