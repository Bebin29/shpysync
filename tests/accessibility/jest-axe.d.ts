/**
 * TypeScript-Definitionen für jest-axe
 * 
 * jest-axe hat keine offiziellen TypeScript-Definitionen,
 * daher definieren wir sie hier.
 */

declare module "jest-axe" {
  import type { AxeResults } from "axe-core";

  /**
   * Führt einen Accessibility-Check mit axe-core durch.
   * 
   * @param container - DOM-Element oder Container-Element
   * @param options - Optionale axe-core-Optionen
   * @returns Promise mit AxeResults
   */
  export function axe(
    container?: Element | Document,
    options?: Record<string, unknown>
  ): Promise<AxeResults>;

  /**
   * Vitest-Matcher für Accessibility-Violations.
   * 
   * @param received - AxeResults
   * @returns Matcher-Result
   */
  export function toHaveNoViolations(
    received: AxeResults
  ): {
    message: () => string;
    pass: boolean;
  };
}


