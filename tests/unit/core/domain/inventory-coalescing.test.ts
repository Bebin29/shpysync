import { describe, it, expect } from "vitest";
import { coalesceInventoryUpdates } from "../../../../core/domain/inventory-coalescing.js";

describe("coalesceInventoryUpdates", () => {
  describe("Duplikat-Erkennung (Last-write-wins)", () => {
    it("sollte Duplikate entfernen und letzten Wert behalten", () => {
      const updates = [
        { inventoryItemId: "item1", quantity: 10 },
        { inventoryItemId: "item1", quantity: 20 },
        { inventoryItemId: "item1", quantity: 30 },
      ];

      const result = coalesceInventoryUpdates(updates);
      expect(result).toHaveLength(1);
      expect(result[0]).toEqual({ inventoryItemId: "item1", quantity: 30 });
    });

    it("sollte mehrere Duplikate für ein Item behandeln", () => {
      const updates = [
        { inventoryItemId: "item1", quantity: 10 },
        { inventoryItemId: "item1", quantity: 20 },
        { inventoryItemId: "item1", quantity: 15 },
        { inventoryItemId: "item1", quantity: 25 },
      ];

      const result = coalesceInventoryUpdates(updates);
      expect(result).toHaveLength(1);
      expect(result[0]).toEqual({ inventoryItemId: "item1", quantity: 25 });
    });
  });

  describe("Mehrere Items", () => {
    it("sollte mehrere verschiedene Items korrekt behandeln", () => {
      const updates = [
        { inventoryItemId: "item1", quantity: 10 },
        { inventoryItemId: "item2", quantity: 20 },
        { inventoryItemId: "item3", quantity: 30 },
      ];

      const result = coalesceInventoryUpdates(updates);
      expect(result).toHaveLength(3);
      expect(result.find((u) => u.inventoryItemId === "item1")?.quantity).toBe(10);
      expect(result.find((u) => u.inventoryItemId === "item2")?.quantity).toBe(20);
      expect(result.find((u) => u.inventoryItemId === "item3")?.quantity).toBe(30);
    });

    it("sollte Duplikate bei mehreren Items behandeln", () => {
      const updates = [
        { inventoryItemId: "item1", quantity: 10 },
        { inventoryItemId: "item2", quantity: 20 },
        { inventoryItemId: "item1", quantity: 15 },
        { inventoryItemId: "item3", quantity: 30 },
        { inventoryItemId: "item2", quantity: 25 },
      ];

      const result = coalesceInventoryUpdates(updates);
      expect(result).toHaveLength(3);
      expect(result.find((u) => u.inventoryItemId === "item1")?.quantity).toBe(15);
      expect(result.find((u) => u.inventoryItemId === "item2")?.quantity).toBe(25);
      expect(result.find((u) => u.inventoryItemId === "item3")?.quantity).toBe(30);
    });
  });

  describe("Leere Liste", () => {
    it("sollte leere Liste zurückgeben", () => {
      const result = coalesceInventoryUpdates([]);
      expect(result).toEqual([]);
    });
  });

  describe("Große Listen mit vielen Duplikaten", () => {
    it("sollte große Listen mit vielen Duplikaten effizient verarbeiten", () => {
      const updates: Array<{ inventoryItemId: string; quantity: number }> = [];
      
      // Erstelle 100 Updates für 10 verschiedene Items (jedes Item 10x)
      for (let i = 0; i < 10; i++) {
        for (let j = 0; j < 10; j++) {
          updates.push({
            inventoryItemId: `item${i}`,
            quantity: j * 10, // Letzter Wert für jedes Item ist 90
          });
        }
      }

      const result = coalesceInventoryUpdates(updates);
      expect(result).toHaveLength(10);
      
      // Jedes Item sollte den letzten Wert (90) haben
      for (let i = 0; i < 10; i++) {
        const item = result.find((u) => u.inventoryItemId === `item${i}`);
        expect(item).toBeDefined();
        expect(item?.quantity).toBe(90);
      }
    });
  });

  describe("Null und Zero-Werte", () => {
    it("sollte Null-Werte korrekt behandeln", () => {
      const updates = [
        { inventoryItemId: "item1", quantity: 10 },
        { inventoryItemId: "item1", quantity: 0 },
      ];

      const result = coalesceInventoryUpdates(updates);
      expect(result).toHaveLength(1);
      expect(result[0]).toEqual({ inventoryItemId: "item1", quantity: 0 });
    });

    it("sollte negative Werte korrekt behandeln", () => {
      const updates = [
        { inventoryItemId: "item1", quantity: 10 },
        { inventoryItemId: "item1", quantity: -5 },
      ];

      const result = coalesceInventoryUpdates(updates);
      expect(result).toHaveLength(1);
      expect(result[0]).toEqual({ inventoryItemId: "item1", quantity: -5 });
    });
  });

  describe("Reihenfolge", () => {
    it("sollte Reihenfolge der Items beibehalten (erste Erscheinung)", () => {
      const updates = [
        { inventoryItemId: "item3", quantity: 30 },
        { inventoryItemId: "item1", quantity: 10 },
        { inventoryItemId: "item2", quantity: 20 },
        { inventoryItemId: "item1", quantity: 15 },
      ];

      const result = coalesceInventoryUpdates(updates);
      expect(result).toHaveLength(3);
      // Reihenfolge sollte item3, item1, item2 sein (erste Erscheinung)
      expect(result[0].inventoryItemId).toBe("item3");
      expect(result[1].inventoryItemId).toBe("item1");
      expect(result[2].inventoryItemId).toBe("item2");
    });
  });
});





