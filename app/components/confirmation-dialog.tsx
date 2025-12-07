"use client";

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { AlertCircle, CheckCircle2 } from "lucide-react";
import { useState } from "react";

interface ConfirmationDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  priceUpdatesCount: number;
  inventoryUpdatesCount: number;
  unmatchedRowsCount: number;
  onConfirm: () => void;
  onCancel: () => void;
}

/**
 * Bestätigungs-Dialog für Sync-Ausführung.
 *
 * Zeigt eine Zusammenfassung der geplanten Updates und erfordert
 * explizite Bestätigung durch den Benutzer.
 */
export function ConfirmationDialog({
  open,
  onOpenChange,
  priceUpdatesCount,
  inventoryUpdatesCount,
  unmatchedRowsCount,
  onConfirm,
  onCancel,
}: ConfirmationDialogProps) {
  const [isConfirmed, setIsConfirmed] = useState(false);

  const handleConfirm = () => {
    if (isConfirmed) {
      onConfirm();
      setIsConfirmed(false);
      onOpenChange(false);
    }
  };

  const handleCancel = () => {
    setIsConfirmed(false);
    onCancel();
    onOpenChange(false);
  };

  const totalUpdates = priceUpdatesCount + inventoryUpdatesCount;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Synchronisation bestätigen</DialogTitle>
          <DialogDescription>
            Bitte überprüfe die geplanten Änderungen und bestätige die Ausführung.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* Zusammenfassung */}
          <div className="space-y-2">
            <div className="flex items-center justify-between rounded-lg border p-3">
              <div className="flex items-center gap-2">
                <CheckCircle2 className="h-5 w-5 text-blue-500" />
                <span className="font-medium">Preis-Updates</span>
              </div>
              <span className="text-lg font-semibold">{priceUpdatesCount}</span>
            </div>

            <div className="flex items-center justify-between rounded-lg border p-3">
              <div className="flex items-center gap-2">
                <CheckCircle2 className="h-5 w-5 text-blue-500" />
                <span className="font-medium">Bestands-Updates</span>
              </div>
              <span className="text-lg font-semibold">{inventoryUpdatesCount}</span>
            </div>

            <div className="flex items-center justify-between rounded-lg border p-3 bg-muted/50">
              <span className="font-medium">Gesamt</span>
              <span className="text-lg font-semibold">{totalUpdates}</span>
            </div>
          </div>

          {/* Warnung bei nicht-gematchten Zeilen */}
          {unmatchedRowsCount > 0 && (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>
                <strong>{unmatchedRowsCount}</strong> Zeile{unmatchedRowsCount !== 1 ? "n" : ""}{" "}
                konnte
                {unmatchedRowsCount === 1 ? "" : "n"} nicht gematcht werden und wird übersprungen.
              </AlertDescription>
            </Alert>
          )}

          {/* Bestätigungs-Checkbox */}
          <div className="flex items-start space-x-2 rounded-lg border p-3">
            <input
              type="checkbox"
              id="confirm-sync"
              checked={isConfirmed}
              onChange={(e) => setIsConfirmed(e.target.checked)}
              className="mt-1 h-4 w-4 cursor-pointer"
            />
            <label htmlFor="confirm-sync" className="text-sm leading-relaxed cursor-pointer">
              Ich bestätige, dass diese Änderungen in Shopify angewendet werden sollen.
              <br />
              <span className="text-muted-foreground">
                Die Synchronisation kann nicht rückgängig gemacht werden.
              </span>
            </label>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={handleCancel}>
            Abbrechen
          </Button>
          <Button onClick={handleConfirm} disabled={!isConfirmed || totalUpdates === 0}>
            🔄 Synchronisieren
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
