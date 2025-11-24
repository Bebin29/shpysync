import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Upload, FileText } from "lucide-react";

/**
 * Synchronisations-Seite (Wizard).
 * 
 * TODO: Wizard-Stepper implementieren (Schritt 1-4)
 */
export default function SyncPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Synchronisation</h1>
        <p className="text-muted-foreground">
          CSV-Datei hochladen und mit Shopify synchronisieren
        </p>
      </div>

      {/* Wizard-Stepper (Platzhalter) */}
      <div className="space-y-4">
        <Card>
          <CardHeader>
            <CardTitle>Schritt 1: CSV hochladen</CardTitle>
            <CardDescription>
              Lade deine CSV-Datei mit Produktdaten hoch
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex flex-col items-center justify-center rounded-lg border-2 border-dashed border-gray-300 p-12">
              <Upload className="mb-4 h-12 w-12 text-gray-400" />
              <p className="mb-2 text-sm font-medium text-gray-700">
                CSV-Datei auswählen
              </p>
              <p className="mb-4 text-xs text-gray-500">
                Drag & Drop oder klicke zum Auswählen
              </p>
              <Button>
                <FileText className="mr-2 h-4 w-4" />
                Datei auswählen
              </Button>
            </div>
          </CardContent>
        </Card>

        <Card className="opacity-50">
          <CardHeader>
            <CardTitle>Schritt 2: Spalten zuordnen</CardTitle>
            <CardDescription>
              Ordne die CSV-Spalten den Shopify-Feldern zu
            </CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">
              Wird nach CSV-Upload verfügbar
            </p>
          </CardContent>
        </Card>

        <Card className="opacity-50">
          <CardHeader>
            <CardTitle>Schritt 3: Vorschau</CardTitle>
            <CardDescription>
              Überprüfe die geplanten Updates vor der Ausführung
            </CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">
              Wird nach Spalten-Zuordnung verfügbar
            </p>
          </CardContent>
        </Card>

        <Card className="opacity-50">
          <CardHeader>
            <CardTitle>Schritt 4: Ausführung</CardTitle>
            <CardDescription>
              Führe die Synchronisation aus
            </CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">
              Wird nach Bestätigung verfügbar
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

