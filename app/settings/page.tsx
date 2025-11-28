"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { TestTube, Save, CheckCircle2, AlertCircle, Loader2, RefreshCw, Clock, Play, Square } from "lucide-react";
import { useConfig } from "@/app/hooks/use-config";
import { useElectron } from "@/app/hooks/use-electron";
import { Checkbox } from "@/components/ui/checkbox";
import { UpdateSection } from "@/app/components/update-section";

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
    autoSyncConfig,
    autoSyncStatus,
    saveAutoSyncConfig,
    startAutoSync,
    stopAutoSync,
    testAutoSync,
    updateConfig,
    updateConfigLoading,
    loadUpdateConfig,
    saveUpdateConfig,
  } = useConfig();
  
  const { csv } = useElectron();

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
  
  // Auto-Sync State
  const [autoSyncEnabled, setAutoSyncEnabled] = useState(false);
  const [autoSyncInterval, setAutoSyncInterval] = useState<number>(30);
  const [autoSyncCsvPath, setAutoSyncCsvPath] = useState("");
  const [autoSyncDbfPath, setAutoSyncDbfPath] = useState("");
  const [defaultCsvPath, setDefaultCsvPath] = useState("");
  const [defaultDbfPath, setDefaultDbfPath] = useState("");
  const [savingAutoSync, setSavingAutoSync] = useState(false);
  const [testingAutoSync, setTestingAutoSync] = useState(false);

  // Lade vorhandene Konfiguration
  useEffect(() => {
    if (shopConfig) {
      setShopUrl(shopConfig.shopUrl);
      setAccessToken(shopConfig.accessToken);
      setLocationId(shopConfig.locationId);
      setLocationName(shopConfig.locationName);
    }
  }, [shopConfig]);

  // Lade Auto-Sync-Config und Standard-Pfade
  useEffect(() => {
    if (autoSyncConfig) {
      setAutoSyncEnabled(autoSyncConfig.enabled || false);
      setAutoSyncInterval(autoSyncConfig.interval || 30);
      setAutoSyncCsvPath(autoSyncConfig.csvPath || "");
      setAutoSyncDbfPath(autoSyncConfig.dbfPath || "");
    }
  }, [autoSyncConfig]);

  // Lade Standard-Pfade aus Config
  useEffect(() => {
    const loadDefaultPaths = async () => {
      try {
        const config = await window.electron.config.get();
        setDefaultCsvPath(config.defaultCsvPath || "");
        setDefaultDbfPath(config.defaultDbfPath || "");
      } catch (err) {
        console.error("Fehler beim Laden der Standard-Pfade:", err);
      }
    };
    loadDefaultPaths();
  }, []);

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
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [shopUrl, accessToken]); // handleLoadLocations wird nur intern verwendet

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
            Konfiguriere automatische Syncs in konfigurierbaren Intervallen
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center space-x-2">
            <Checkbox
              id="auto-sync-enabled"
              checked={autoSyncEnabled}
              onCheckedChange={(checked) => {
                setAutoSyncEnabled(checked === true);
              }}
            />
            <Label htmlFor="auto-sync-enabled" className="cursor-pointer">
              Automatische Synchronisation aktivieren
            </Label>
          </div>

          {autoSyncEnabled && (
            <>
              <div className="space-y-2">
                <Label htmlFor="auto-sync-dbf">DBF-Datei (bevorzugt)</Label>
                <div className="flex gap-2">
                  <Input
                    id="auto-sync-dbf"
                    placeholder="Pfad zur DBF-Datei"
                    value={autoSyncDbfPath}
                    readOnly
                    className="flex-1"
                  />
                  <Button
                    type="button"
                    variant="outline"
                    onClick={async () => {
                      try {
                        const result = await csv.selectFile();
                        if (result.success && result.filePath) {
                          setAutoSyncDbfPath(result.filePath);
                          // Wenn DBF ausgewählt, CSV leeren
                          if (result.filePath.toLowerCase().endsWith(".dbf")) {
                            setAutoSyncCsvPath("");
                          }
                        }
                      } catch (err) {
                        console.error("Fehler beim Auswählen der DBF-Datei:", err);
                      }
                    }}
                  >
                    Datei auswählen
                  </Button>
                </div>
                <p className="text-xs text-muted-foreground">
                  Die DBF-Datei, die automatisch synchronisiert werden soll (wird bevorzugt)
                </p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="auto-sync-csv">CSV-Datei (Alternative)</Label>
                <div className="flex gap-2">
                  <Input
                    id="auto-sync-csv"
                    placeholder="Pfad zur CSV-Datei"
                    value={autoSyncCsvPath}
                    readOnly
                    className="flex-1"
                  />
                  <Button
                    type="button"
                    variant="outline"
                    onClick={async () => {
                      try {
                        const result = await csv.selectFile();
                        if (result.success && result.filePath) {
                          setAutoSyncCsvPath(result.filePath);
                          // Wenn CSV ausgewählt, DBF leeren
                          if (result.filePath.toLowerCase().endsWith(".csv")) {
                            setAutoSyncDbfPath("");
                          }
                        }
                      } catch (err) {
                        console.error("Fehler beim Auswählen der CSV-Datei:", err);
                      }
                    }}
                  >
                    Datei auswählen
                  </Button>
                </div>
                <p className="text-xs text-muted-foreground">
                  Die CSV-Datei, die automatisch synchronisiert werden soll (nur wenn keine DBF-Datei gesetzt)
                </p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="auto-sync-interval">Intervall</Label>
                <Select
                  value={autoSyncInterval.toString()}
                  onValueChange={(value) => setAutoSyncInterval(parseInt(value, 10))}
                >
                  <SelectTrigger id="auto-sync-interval">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="15">Alle 15 Minuten</SelectItem>
                    <SelectItem value="30">Alle 30 Minuten</SelectItem>
                    <SelectItem value="60">Alle 60 Minuten</SelectItem>
                    <SelectItem value="120">Alle 120 Minuten</SelectItem>
                  </SelectContent>
                </Select>
                <p className="text-xs text-muted-foreground">
                  Wie oft die Synchronisation automatisch ausgeführt werden soll
                </p>
              </div>

              <div className="rounded-lg bg-muted p-3">
                <div className="flex items-center justify-between">
                  <div className="space-y-1">
                    <p className="text-sm font-medium">Status:</p>
                    <p className="text-xs text-muted-foreground">
                      {autoSyncStatus?.isRunning ? (
                        <span className="flex items-center gap-1 text-green-600">
                          <Clock className="h-3 w-3" />
                          Läuft
                        </span>
                      ) : (
                        <span className="text-muted-foreground">Gestoppt</span>
                      )}
                    </p>
                    {autoSyncStatus?.nextRunTime && (
                      <p className="text-xs text-muted-foreground">
                        Nächste Ausführung:{" "}
                        {new Date(autoSyncStatus.nextRunTime).toLocaleString("de-DE")}
                      </p>
                    )}
                    {autoSyncStatus?.lastRunTime && (
                      <p className="text-xs text-muted-foreground">
                        Letzte Ausführung:{" "}
                        {new Date(autoSyncStatus.lastRunTime).toLocaleString("de-DE")}
                        {autoSyncStatus.lastRunResult === "success" && (
                          <span className="ml-1 text-green-600">✓</span>
                        )}
                        {autoSyncStatus.lastRunResult === "failed" && (
                          <span className="ml-1 text-red-600">✗</span>
                        )}
                      </p>
                    )}
                  </div>
                  <div className="flex gap-2">
                    {autoSyncStatus?.isRunning ? (
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={async () => {
                          try {
                            await stopAutoSync();
                          } catch (err) {
                            console.error("Fehler beim Stoppen des Auto-Sync:", err);
                          }
                        }}
                      >
                        <Square className="mr-2 h-4 w-4" />
                        Stoppen
                      </Button>
                    ) : (
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={async () => {
                          try {
                            await startAutoSync();
                          } catch (err) {
                            console.error("Fehler beim Starten des Auto-Sync:", err);
                          }
                        }}
                        disabled={!autoSyncCsvPath || !shopConfig}
                      >
                        <Play className="mr-2 h-4 w-4" />
                        Starten
                      </Button>
                    )}
                  </div>
                </div>
              </div>

              <Alert>
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>
                  Auto-Sync läuft nur, solange die App geöffnet ist. Die App muss im Hintergrund
                  laufen, damit automatische Syncs ausgeführt werden.
                </AlertDescription>
              </Alert>

              <div className="flex gap-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={async () => {
                    const testFilePath = autoSyncDbfPath || autoSyncCsvPath;
                    if (!testFilePath) {
                      setConnectionResult({
                        success: false,
                        message: "Bitte CSV- oder DBF-Datei auswählen",
                      });
                      return;
                    }

                    setTestingAutoSync(true);
                    try {
                      await testAutoSync(testFilePath);
                      setConnectionResult({
                        success: true,
                        message: "Test-Sync erfolgreich gestartet",
                      });
                    } catch (err) {
                      setConnectionResult({
                        success: false,
                        message: err instanceof Error ? err.message : "Fehler beim Test-Sync",
                      });
                    } finally {
                      setTestingAutoSync(false);
                    }
                  }}
                  disabled={testingAutoSync || (!autoSyncCsvPath && !autoSyncDbfPath) || !shopConfig}
                >
                  {testingAutoSync ? (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  ) : (
                    <RefreshCw className="mr-2 h-4 w-4" />
                  )}
                  Jetzt synchronisieren (Test)
                </Button>
                <Button
                  type="button"
                  onClick={async () => {
                    const saveFilePath = autoSyncDbfPath || autoSyncCsvPath;
                    if (!saveFilePath) {
                      setConnectionResult({
                        success: false,
                        message: "Bitte CSV- oder DBF-Datei auswählen",
                      });
                      return;
                    }

                    setSavingAutoSync(true);
                    try {
                      await saveAutoSyncConfig({
                        enabled: autoSyncEnabled,
                        interval: autoSyncInterval,
                        csvPath: autoSyncCsvPath || undefined,
                        dbfPath: autoSyncDbfPath || undefined,
                      });
                      setConnectionResult({
                        success: true,
                        message: "Auto-Sync-Konfiguration gespeichert",
                      });
                    } catch (err) {
                      setConnectionResult({
                        success: false,
                        message: err instanceof Error ? err.message : "Fehler beim Speichern",
                      });
                    } finally {
                      setSavingAutoSync(false);
                    }
                  }}
                  disabled={savingAutoSync || (!autoSyncCsvPath && !autoSyncDbfPath) || !shopConfig}
                >
                  {savingAutoSync ? (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  ) : (
                    <Save className="mr-2 h-4 w-4" />
                  )}
                  Speichern
                </Button>
              </div>
            </>
          )}
        </CardContent>
      </Card>

      {/* Standard-Pfade für manuelle Sync */}
      <Card>
        <CardHeader>
          <CardTitle>Standard-Pfade für manuelle Synchronisation</CardTitle>
          <CardDescription>
            Diese Pfade werden automatisch verwendet, wenn eine manuelle Synchronisation gestartet wird
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="default-dbf">DBF-Datei (bevorzugt)</Label>
            <div className="flex gap-2">
              <Input
                id="default-dbf"
                placeholder="Pfad zur DBF-Datei"
                value={defaultDbfPath}
                readOnly
                className="flex-1"
              />
              <Button
                type="button"
                variant="outline"
                onClick={async () => {
                  try {
                    const result = await csv.selectFile();
                    if (result.success && result.filePath) {
                      setDefaultDbfPath(result.filePath);
                      // Speichere in Config
                      await window.electron.config.set({
                        ...(await window.electron.config.get()),
                        defaultDbfPath: result.filePath,
                      });
                    }
                  } catch (err) {
                    console.error("Fehler beim Auswählen der DBF-Datei:", err);
                  }
                }}
              >
                Datei auswählen
              </Button>
              {defaultDbfPath && (
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={async () => {
                    setDefaultDbfPath("");
                    const config = await window.electron.config.get();
                    await window.electron.config.set({
                      ...config,
                      defaultDbfPath: undefined,
                    });
                  }}
                >
                  Entfernen
                </Button>
              )}
            </div>
            <p className="text-xs text-muted-foreground">
              Standard-DBF-Datei für manuelle Synchronisation (wird bevorzugt, wenn gesetzt)
            </p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="default-csv">CSV-Datei (Alternative)</Label>
            <div className="flex gap-2">
              <Input
                id="default-csv"
                placeholder="Pfad zur CSV-Datei"
                value={defaultCsvPath}
                readOnly
                className="flex-1"
              />
              <Button
                type="button"
                variant="outline"
                onClick={async () => {
                  try {
                    const result = await csv.selectFile();
                    if (result.success && result.filePath) {
                      setDefaultCsvPath(result.filePath);
                      // Speichere in Config
                      await window.electron.config.set({
                        ...(await window.electron.config.get()),
                        defaultCsvPath: result.filePath,
                      });
                    }
                  } catch (err) {
                    console.error("Fehler beim Auswählen der CSV-Datei:", err);
                  }
                }}
              >
                Datei auswählen
              </Button>
              {defaultCsvPath && (
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={async () => {
                    setDefaultCsvPath("");
                    const config = await window.electron.config.get();
                    await window.electron.config.set({
                      ...config,
                      defaultCsvPath: undefined,
                    });
                  }}
                >
                  Entfernen
                </Button>
              )}
            </div>
            <p className="text-xs text-muted-foreground">
              Standard-CSV-Datei für manuelle Synchronisation (nur wenn keine DBF-Datei gesetzt)
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Updates */}
      <Card>
        <CardHeader>
          <CardTitle>Updates</CardTitle>
          <CardDescription>
            Automatische Update-Prüfung und Installation konfigurieren
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center space-x-2">
            <Checkbox
              id="update-auto-check-enabled"
              checked={updateConfig?.autoCheckEnabled ?? true}
              onCheckedChange={async (checked) => {
                if (updateConfig) {
                  try {
                    await saveUpdateConfig({
                      ...updateConfig,
                      autoCheckEnabled: checked === true,
                    });
                  } catch (err) {
                    console.error("Fehler beim Speichern der Update-Config:", err);
                  }
                }
              }}
            />
            <Label htmlFor="update-auto-check-enabled" className="cursor-pointer">
              Automatische Update-Prüfung aktivieren
            </Label>
          </div>

          {updateConfig?.autoCheckEnabled && (
            <div className="space-y-2">
              <Label htmlFor="update-check-interval">Prüfungs-Intervall</Label>
              <Select
                value={updateConfig.autoCheckInterval.toString()}
                onValueChange={async (value) => {
                  if (updateConfig) {
                    try {
                      await saveUpdateConfig({
                        ...updateConfig,
                        autoCheckInterval: parseInt(value, 10),
                      });
                    } catch (err) {
                      console.error("Fehler beim Speichern der Update-Config:", err);
                    }
                  }
                }}
              >
                <SelectTrigger id="update-check-interval">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="1">Alle 1 Stunde</SelectItem>
                  <SelectItem value="6">Alle 6 Stunden</SelectItem>
                  <SelectItem value="12">Alle 12 Stunden</SelectItem>
                  <SelectItem value="24">Täglich (24 Stunden)</SelectItem>
                  <SelectItem value="168">Wöchentlich (7 Tage)</SelectItem>
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground">
                Wie oft die App automatisch auf Updates prüfen soll
              </p>
            </div>
          )}

          <div className="pt-4 border-t">
            <Label className="mb-2 block">Manuelle Update-Prüfung</Label>
            <UpdateSection />
          </div>
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
