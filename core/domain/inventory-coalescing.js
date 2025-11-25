/**
 * Inventory-Koaleszierung für Duplikat-Erkennung.
 *
 * Portiert von Python `coalesce_inventory_updates()` Funktion.
 *
 * Konsolidiert Inventory-Updates auf eindeutige (inventoryItemId, quantity)-Paare.
 * Last-write-wins: der letzte Eintrag für ein Item überschreibt frühere.
 *
 * @param updates - Liste von (inventoryItemId, quantity)-Paaren
 * @returns Koaleszierte Updates (ein Eintrag pro Item)
 */
export function coalesceInventoryUpdates(updates) {
    const lastValues = new Map();
    const countByItem = new Map();
    for (const { inventoryItemId, quantity } of updates) {
        // Zähle Duplikate
        const currentCount = countByItem.get(inventoryItemId) || 0;
        countByItem.set(inventoryItemId, currentCount + 1);
        // Last-write-wins: letzter Wert überschreibt frühere
        lastValues.set(inventoryItemId, quantity);
    }
    // Logging zu Duplikaten (nur Info)
    const duplicates = Array.from(countByItem.entries()).filter(([, count]) => count > 1);
    if (duplicates.length > 0) {
        console.warn(`Inventory: ${duplicates.length} Items hatten Duplikate im CSV/Mapping (werden koalesziert).`);
    }
    // Zurück als Array (ein Eintrag pro Item)
    return Array.from(lastValues.entries()).map(([inventoryItemId, quantity]) => ({
        inventoryItemId,
        quantity,
    }));
}
