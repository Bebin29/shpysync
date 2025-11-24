"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { TestTube, Save, CheckCircle2, AlertCircle, Loader2 } from "lucide-react";
import { useConfig } from "@/app/hooks/use-config";
import type { ShopConfig } from "../../electron/types/ipc";

/**
 * Einstellungs-Seite für Shop-Konfiguration.
 */
export default function SettingsPage() {
  const {
    shopConfig,
    columnMapping,
    loading,
    error,
    saveShopConfig,
    saveColumnMapping,
    testConnection,
    getLocations,
  } = useConfig();

  const [shopUrl, setShopUrl] = useState("");
  const [accessToken, setAccessToken] = useState("");
  const [locationId, setLocationId] = useState("");
  const [locationName, setLocationName] = useState("");

  const [locations, setLocations] = useState<Array<{ id: string; name: string }>>([]);
  const [loadingLocations, setLoadingLocations] = useState(false);
  const [testingConnection, setTestingConnection] = useState(false);
  const [connectionResult, setConnectionResult] = useState<{
    success: boolean;
    message: string;
    rateLimitInfo?: {
      used: number;
      limit: number;
      remaining: number;
      percentage: number;
    };
  } | null>(null);
  const [saving, setSaving] = useState(false);

  // Lade vorhandene Konfiguration
  useEffect(() => {
    if (shopConfig) {
      setShopUrl(shopConfig.shopUrl);
      setAccessToken(shopConfig.accessToken);
      setLocationId(shopConfig.locationId);
      setLocationName(shopConfig.locationName);
    }
  }, [shopConfig]);

  // Lade Locations wenn Shop-URL und Token vorhanden
  const handleLoadLocations = async () => {
    if (!shopUrl || !accessToken) {
      return;
    }

    setLoadingLocations(true);
    try {
      const locs = await getLocations({
        shopUrl,
        accessToken,
        locationId: "",
        locationName: "",
      });
      setLocations(locs);
    } catch (err) {
      console.error("Fehler beim Laden der Locations:", err);
    } finally {
      setLoadingLocations(false);
    }
  };

  // Lade Locations automatisch wenn URL und Token geändert werden
  useEffect(() => {
    if (shopUrl && accessToken && shopUrl.includes(".myshopify.com")) {
      handleLoadLocations();
    }
  }, [shopUrl, accessToken]);

  const handleTestConnection = async () => {
    if (!shopUrl || !accessToken) {
      setConnectionResult({
        success: false,
        message: "Bitte Shop-URL und Access-Token eingeben",
      });
      return;
    }

    setTestingConnection(true);
    setConnectionResult(null);

    try {
      const result = await testConnection({
        shopUrl,
        accessToken,
        locationId: "",
        locationName: "",
      });
      setConnectionResult(result);
    } catch (err) {
      setConnectionResult({
        success: false,
        message: err instanceof Error ? err.message : "Unbekannter Fehler",
      });
    } finally {
      setTestingConnection(false);
    }
  };

  const handleSave = async () => {
    if (!shopUrl || !accessToken || !locationId || !locationName) {
      setConnectionResult({
        success: false,
        message: "Bitte alle Felder ausfüllen",
      });
      return;
    }

    setSaving(true);
    try {
      // Normalisiere Shop-URL (ergänze https:// falls fehlt)
      let normalizedShopUrl = shopUrl.trim();
      if (!normalizedShopUrl.startsWith("http://") && !normalizedShopUrl.startsWith("https://")) {
        normalizedShopUrl = `https://${normalizedShopUrl}`;
      }

      await saveShopConfig({
        shopUrl: normalizedShopUrl,
        accessToken,
        locationId,
        locationName,
      });
      setConnectionResult({
        success: true,
        message: "Konfiguration gespeichert",
      });
    } catch (err) {
      setConnectionResult({
        success: false,
        message: err instanceof Error ? err.message : "Fehler beim Speichern",
      });
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Einstellungen</h1>
        <p className="text-muted-foreground">
          Konfiguriere deine Shopify-Verbindung und Standard-Einstellungen
        </p>
      </div>

      {error && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {connectionResult && (
        <div className="space-y-2">
          <Alert variant={connectionResult.success ? "default" : "destructive"}>
            {connectionResult.success ? (
              <CheckCircle2 className="h-4 w-4" />
            ) : (
              <AlertCircle className="h-4 w-4" />
            )}
            <AlertDescription>{connectionResult.message}</AlertDescription>
          </Alert>
          {connectionResult.success && connectionResult.rateLimitInfo && (
            <Alert variant="default">
              <AlertDescription>
                <div className="flex items-center justify-between">
                  <span>Rate-Limit Status:</span>
                  <span className="font-mono">
                    {connectionResult.rateLimitInfo.used} / {connectionResult.rateLimitInfo.limit} (
                    {connectionResult.rateLimitInfo.remaining} verbleibend)
                  </span>
                </div>
                <div className="mt-2 h-2 w-full overflow-hidden rounded-full bg-gray-200">
                  <div
                    className={`h-full transition-all ${
                      connectionResult.rateLimitInfo.percentage > 80
                        ? "bg-red-500"
                        : connectionResult.rateLimitInfo.percentage > 60
                        ? "bg-yellow-500"
                        : "bg-green-500"
                    }`}
                    style={{ width: `${connectionResult.rateLimitInfo.percentage}%` }}
                  />
                </div>
              </AlertDescription>
            </Alert>
          )}
        </div>
      )}

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
              value={shopUrl}
              onChange={(e) => setShopUrl(e.target.value)}
            />
            <p className="text-xs text-muted-foreground">
              Die URL deines Shopify-Shops (muss auf .myshopify.com enden)
            </p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="access-token">Access-Token</Label>
            <div className="flex gap-2">
              <Input
                id="access-token"
                placeholder="shpat_..."
                type="password"
                value={accessToken}
                onChange={(e) => setAccessToken(e.target.value)}
                className="flex-1"
              />
              {accessToken && (
                <div className="flex items-center text-sm text-muted-foreground">
                  {accessToken.substring(0, 8)}***
                </div>
              )}
            </div>
            <p className="text-xs text-muted-foreground">
              Dein Shopify Admin API Access-Token (beginnt mit shpat_ oder shpca_)
            </p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="location">Location</Label>
            <Select
              value={locationId}
              onValueChange={(value) => {
                setLocationId(value);
                const location = locations.find((loc) => loc.id === value);
                if (location) {
                  setLocationName(location.name);
                }
              }}
              disabled={loadingLocations || locations.length === 0}
            >
              <SelectTrigger id="location">
                <SelectValue placeholder="Location auswählen" />
              </SelectTrigger>
              <SelectContent>
                {loadingLocations ? (
                  <SelectItem value="loading" disabled>
                    Lade Locations...
                  </SelectItem>
                ) : locations.length === 0 ? (
                  <SelectItem value="none" disabled>
                    Keine Location verfügbar (URL und Token eingeben)
                  </SelectItem>
                ) : (
                  locations.map((loc) => (
                    <SelectItem key={loc.id} value={loc.id}>
                      {loc.name}
                    </SelectItem>
                  ))
                )}
              </SelectContent>
            </Select>
            <p className="text-xs text-muted-foreground">
              Die Location für Bestands-Updates (wird automatisch geladen)
            </p>
          </div>

          <div className="flex gap-2">
            <Button
              onClick={handleTestConnection}
              disabled={testingConnection || !shopUrl || !accessToken}
            >
              {testingConnection ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <TestTube className="mr-2 h-4 w-4" />
              )}
              Verbindung testen
            </Button>
            <Button
              onClick={handleSave}
              disabled={saving || !shopUrl || !accessToken || !locationId}
              variant="outline"
            >
              {saving ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <Save className="mr-2 h-4 w-4" />
              )}
              Speichern
            </Button>
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
        <CardContent className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="mapping-sku">SKU-Spalte</Label>
              <Input
                id="mapping-sku"
                placeholder="A"
                value={columnMapping?.sku || ""}
                onChange={(e) => {
                  const newMapping = {
                    ...(columnMapping || { sku: "", name: "", price: "", stock: "" }),
                    sku: e.target.value.toUpperCase(),
                  };
                  saveColumnMapping(newMapping);
                }}
                maxLength={3}
                className="font-mono"
              />
              <p className="text-xs text-muted-foreground">
                Spaltenbuchstabe für SKU (z.B. A, B, AB)
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="mapping-name">Name-Spalte</Label>
              <Input
                id="mapping-name"
                placeholder="B"
                value={columnMapping?.name || ""}
                onChange={(e) => {
                  const newMapping = {
                    ...(columnMapping || { sku: "", name: "", price: "", stock: "" }),
                    name: e.target.value.toUpperCase(),
                  };
                  saveColumnMapping(newMapping);
                }}
                maxLength={3}
                className="font-mono"
              />
              <p className="text-xs text-muted-foreground">
                Spaltenbuchstabe für Produktname
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="mapping-price">Preis-Spalte</Label>
              <Input
                id="mapping-price"
                placeholder="C"
                value={columnMapping?.price || ""}
                onChange={(e) => {
                  const newMapping = {
                    ...(columnMapping || { sku: "", name: "", price: "", stock: "" }),
                    price: e.target.value.toUpperCase(),
                  };
                  saveColumnMapping(newMapping);
                }}
                maxLength={3}
                className="font-mono"
              />
              <p className="text-xs text-muted-foreground">
                Spaltenbuchstabe für Preis
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="mapping-stock">Bestand-Spalte</Label>
              <Input
                id="mapping-stock"
                placeholder="D"
                value={columnMapping?.stock || ""}
                onChange={(e) => {
                  const newMapping = {
                    ...(columnMapping || { sku: "", name: "", price: "", stock: "" }),
                    stock: e.target.value.toUpperCase(),
                  };
                  saveColumnMapping(newMapping);
                }}
                maxLength={3}
                className="font-mono"
              />
              <p className="text-xs text-muted-foreground">
                Spaltenbuchstabe für Bestand
              </p>
            </div>
          </div>

          {columnMapping && (
            <div className="rounded-lg bg-muted p-3">
              <p className="text-sm font-medium">Aktuelles Mapping:</p>
              <p className="text-xs text-muted-foreground font-mono">
                SKU: {columnMapping.sku || "—"} | Name: {columnMapping.name || "—"} | Preis:{" "}
                {columnMapping.price || "—"} | Bestand: {columnMapping.stock || "—"}
              </p>
            </div>
          )}
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

      {/* API-Informationen */}
      <Card>
        <CardHeader>
          <CardTitle>API-Informationen</CardTitle>
          <CardDescription>
            Informationen zur verwendeten Shopify API-Version
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium">Shopify API Version:</span>
              <span className="font-mono text-sm">2025-10</span>
            </div>
            <p className="text-xs text-muted-foreground">
              Die API-Version wird alle 3 Monate aktualisiert. Diese App nutzt die neueste stabile Version.
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
