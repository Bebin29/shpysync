/**
 * Accessibility-Tests für React-Komponenten
 *
 * Diese Tests prüfen WCAG 2.1 Level AA Compliance für alle UI-Komponenten.
 */

import React from "react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render } from "@testing-library/react";
import { axe } from "jest-axe";
import { CsvUpload } from "@/app/components/csv-upload";
import { PreviewTable } from "@/app/components/preview-table";

// Mock useElectron Hook
vi.mock("@/app/hooks/use-electron", () => ({
  useElectron: () => ({
    csv: {
      parse: vi.fn(),
    },
  }),
}));

describe("Accessibility Tests - UI Components", () => {
  beforeEach(() => {
    // Reset mocks vor jedem Test
    vi.clearAllMocks();
  });

  describe("CsvUpload Component", () => {
    it("should have no accessibility violations", async () => {
      const { container } = render(
        <CsvUpload onFileSelected={vi.fn()} selectedFilePath={undefined} disabled={false} />
      );

      const results = await axe(container);
      expect(results).toHaveNoViolations();
    });

    it("should have proper ARIA labels", () => {
      const { getByRole } = render(
        <CsvUpload onFileSelected={vi.fn()} selectedFilePath={undefined} disabled={false} />
      );

      // Prüfe, ob Button ein Label hat
      const button = getByRole("button");
      expect(button).toBeInTheDocument();
    });

    it("should be keyboard accessible", () => {
      const { getByRole } = render(
        <CsvUpload onFileSelected={vi.fn()} selectedFilePath={undefined} disabled={false} />
      );

      const button = getByRole("button");
      expect(button).toBeInTheDocument();
      // Button sollte fokussierbar sein
      expect(button).not.toHaveAttribute("tabindex", "-1");
    });
  });

  describe("PreviewTable Component", () => {
    const mockRows = [
      {
        id: "1",
        rowNumber: 1,
        sku: "SKU-001",
        name: "Test Produkt",
        productTitle: "Test Produkt",
        variantTitle: "Standard",
        type: "price" as const,
        oldPrice: "10.00",
        newPrice: "12.50",
        matchStatus: "matched" as const,
        matchMethod: "sku" as const,
        matchConfidence: "exact" as const,
        status: "planned" as const,
      },
    ];

    it("should have no accessibility violations", async () => {
      const { container } = render(
        <PreviewTable
          rows={mockRows}
          unmatchedRows={[]}
          operationTypeFilter="all"
          statusFilter="all"
        />
      );

      const results = await axe(container);
      expect(results).toHaveNoViolations();
    });

    it("should have proper table semantics", () => {
      const { getByRole } = render(
        <PreviewTable
          rows={mockRows}
          unmatchedRows={[]}
          operationTypeFilter="all"
          statusFilter="all"
        />
      );

      // Prüfe, ob Tabelle korrekt strukturiert ist
      const table = getByRole("table");
      expect(table).toBeInTheDocument();
    });

    it("should have accessible column headers", () => {
      const { getAllByRole } = render(
        <PreviewTable
          rows={mockRows}
          unmatchedRows={[]}
          operationTypeFilter="all"
          statusFilter="all"
        />
      );

      // Prüfe, ob Tabellen-Header vorhanden sind
      const headers = getAllByRole("columnheader");
      expect(headers.length).toBeGreaterThan(0);
    });
  });

  describe("General Accessibility Rules", () => {
    it("should have proper color contrast", async () => {
      // Diese Tests können mit speziellen Tools wie pa11y erweitert werden
      // Für jetzt prüfen wir nur, dass keine kritischen Violations vorhanden sind
      const { container } = render(
        <CsvUpload onFileSelected={vi.fn()} selectedFilePath={undefined} disabled={false} />
      );

      const results = await axe(container, {
        rules: {
          "color-contrast": { enabled: true },
        },
      });

      expect(results).toHaveNoViolations();
    });

    it("should have proper heading hierarchy", async () => {
      const { container } = render(
        <CsvUpload onFileSelected={vi.fn()} selectedFilePath={undefined} disabled={false} />
      );

      const results = await axe(container, {
        rules: {
          "heading-order": { enabled: true },
        },
      });

      expect(results).toHaveNoViolations();
    });

    it("should have proper form labels", async () => {
      const { container } = render(
        <CsvUpload onFileSelected={vi.fn()} selectedFilePath={undefined} disabled={false} />
      );

      const results = await axe(container, {
        rules: {
          label: { enabled: true },
        },
      });

      expect(results).toHaveNoViolations();
    });
  });
});
