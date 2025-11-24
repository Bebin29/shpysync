import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { TestTube } from "lucide-react";

/**
 * Einstellungs-Seite für Shop-Konfiguration.
 */
export default function SettingsPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Einstellungen</h1>
        <p className="text-muted-foreground">
          Konfiguriere deine Shopify-Verbindung und Standard-Einstellungen
        </p>
      </div>

      {/* Shop-Konfiguration */}
      <Card>
        <CardHeader>
          <CardTitle>Shop-Konfiguration</CardTitle>
          <CardDescription>
            Verbinde dich mit deinem Shopify-Shop
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="shop-url">Shop-URL</Label>
            <Input
              id="shop-url"
              placeholder="https://dein-shop.myshopify.com"
              type="url"
            />
            <p className="text-xs text-muted-foreground">
              Die URL deines Shopify-Shops (muss auf .myshopify.com enden)
            </p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="access-token">Access-Token</Label>
            <Input
              id="access-token"
              placeholder="shpat_..."
              type="password"
            />
            <p className="text-xs text-muted-foreground">
              Dein Shopify Admin API Access-Token
            </p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="location">Location</Label>
            <Select>
              <SelectTrigger id="location">
                <SelectValue placeholder="Location auswählen" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">Keine Location verfügbar</SelectItem>
              </SelectContent>
            </Select>
            <p className="text-xs text-muted-foreground">
              Die Location für Bestands-Updates
            </p>
          </div>

          <div className="flex gap-2">
            <Button>
              <TestTube className="mr-2 h-4 w-4" />
              Verbindung testen
            </Button>
            <Button variant="outline">Speichern</Button>
          </div>
        </CardContent>
      </Card>

      {/* Standard-Spalten-Mapping */}
      <Card>
        <CardHeader>
          <CardTitle>Standard-Spalten-Mapping</CardTitle>
          <CardDescription>
            Standard-Zuordnung für CSV-Spalten (kann bei jedem Sync angepasst werden)
          </CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">
            Wird in Phase 5 implementiert
          </p>
        </CardContent>
      </Card>

      {/* Automatische Synchronisation */}
      <Card>
        <CardHeader>
          <CardTitle>Automatische Synchronisation</CardTitle>
          <CardDescription>
            Konfiguriere automatische Syncs (Post-MVP Feature)
          </CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">
            Wird in Phase 10 (v1.1) implementiert
          </p>
        </CardContent>
      </Card>
    </div>
  );
}

