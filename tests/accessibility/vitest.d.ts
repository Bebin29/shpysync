/**
 * Erweiterte TypeScript-Definitionen für Vitest mit jest-dom und jest-axe Matchers
 */

import "@testing-library/jest-dom";

declare module "vitest" {
  interface Assertion<T = unknown> {
    /**
     * Prüft, ob ein Element im DOM vorhanden ist.
     */
    toBeInTheDocument(): T;

    /**
     * Prüft, ob ein Element ein bestimmtes Attribut hat.
     */
    toHaveAttribute(attr: string, value?: string): T;

    /**
     * Prüft, ob keine Accessibility-Violations vorhanden sind.
     */
    toHaveNoViolations(): T;
  }

  interface AsymmetricMatchersContaining {
    /**
     * Prüft, ob ein Element im DOM vorhanden ist.
     */
    toBeInTheDocument(): T;

    /**
     * Prüft, ob ein Element ein bestimmtes Attribut hat.
     */
    toHaveAttribute(attr: string, value?: string): T;

    /**
     * Prüft, ob keine Accessibility-Violations vorhanden sind.
     */
    toHaveNoViolations(): T;
  }
}


