"use client";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { RefreshCw, Package, TrendingUp, AlertCircle, Clock, Play, Square, Loader2 } from "lucide-react";
import Link from "next/link";
import { IpcTest } from "@/app/components/ipc-test";
import { useConfig } from "@/app/hooks/use-config";
import { useDashboard } from "@/app/hooks/use-dashboard";
import { Badge } from "@/components/ui/badge";

/**
 * Dashboard-Seite mit Übersicht und Statistiken.
 */
export default function Dashboard() {
  const { autoSyncStatus, autoSyncConfig, startAutoSync, stopAutoSync } = useConfig();
  const { stats, history, loading, error, refresh } = useDashboard();

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold">Dashboard</h1>
        <div className="flex gap-2">
          <Button variant="outline" onClick={refresh} disabled={loading}>
            <RefreshCw className={`mr-2 h-4 w-4 ${loading ? "animate-spin" : ""}`} />
            Aktualisieren
          </Button>
          <Link href="/sync">
            <Button>
              <RefreshCw className="mr-2 h-4 w-4" />
              Synchronisation starten
            </Button>
          </Link>
        </div>
      </div>

      {/* Statistik-Karten */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Produkte</CardTitle>
            <Package className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            {loading ? (
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            ) : error ? (
              <div className="text-sm text-red-600">{error}</div>
            ) : (
              <>
                <div className="text-2xl font-bold">{stats?.totalProducts ?? 0}</div>
                <p className="text-xs text-muted-foreground">Gesamt im Cache</p>
              </>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Letzte Sync</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            {loading ? (
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            ) : error ? (
              <div className="text-sm text-red-600">{error}</div>
            ) : (
              <>
                <div className="text-2xl font-bold">
                  {stats?.lastSync
                    ? new Date(stats.lastSync).toLocaleDateString("de-DE")
                    : "Nie"}
                </div>
                <p className="text-xs text-muted-foreground">
                  {stats?.lastSync
                    ? new Date(stats.lastSync).toLocaleTimeString("de-DE")
                    : "Noch keine Synchronisation"}
                </p>
              </>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Erfolgreich</CardTitle>
            <TrendingUp className="h-4 w-4 text-green-600" />
          </CardHeader>
          <CardContent>
            {loading ? (
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            ) : error ? (
              <div className="text-sm text-red-600">{error}</div>
            ) : (
              <>
                <div className="text-2xl font-bold text-green-600">
                  {stats?.syncSuccess ?? 0}
                </div>
                <p className="text-xs text-muted-foreground">Letzte 10 Syncs</p>
              </>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Fehlgeschlagen</CardTitle>
            <AlertCircle className="h-4 w-4 text-red-600" />
          </CardHeader>
          <CardContent>
            {loading ? (
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            ) : error ? (
              <div className="text-sm text-red-600">{error}</div>
            ) : (
              <>
                <div className="text-2xl font-bold text-red-600">
                  {stats?.syncFailed ?? 0}
                </div>
                <p className="text-xs text-muted-foreground">Letzte 10 Syncs</p>
              </>
            )}
          </CardContent>
        </Card>
      </div>

      {/* IPC-Verbindungstest (Phase 1) */}
      <IpcTest />

      {/* Auto-Sync-Status */}
      {autoSyncConfig?.enabled && (
        <Card>
          <CardHeader>
            <CardTitle>Automatische Synchronisation</CardTitle>
            <CardDescription>
              Status der automatischen Synchronisation
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium">Status:</span>
                    {autoSyncStatus?.isRunning ? (
                      <Badge variant="default" className="bg-green-600">
                        <Clock className="mr-1 h-3 w-3" />
                        Läuft
                      </Badge>
                    ) : (
                      <Badge variant="secondary">Gestoppt</Badge>
                    )}
                  </div>
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
                        <span className="ml-1 text-green-600">✓ Erfolgreich</span>
                      )}
                      {autoSyncStatus.lastRunResult === "failed" && (
                        <span className="ml-1 text-red-600">✗ Fehlgeschlagen</span>
                      )}
                    </p>
                  )}
                  {autoSyncConfig.interval && (
                    <p className="text-xs text-muted-foreground">
                      Intervall: Alle {autoSyncConfig.interval} Minuten
                    </p>
                  )}
                </div>
                <div className="flex gap-2">
                  {autoSyncStatus?.isRunning ? (
                    <Button
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
                      variant="outline"
                      size="sm"
                      onClick={async () => {
                        try {
                          await startAutoSync();
                        } catch (err) {
                          console.error("Fehler beim Starten des Auto-Sync:", err);
                        }
                      }}
                    >
                      <Play className="mr-2 h-4 w-4" />
                      Starten
                    </Button>
                  )}
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Letzte Synchronisationen */}
      <Card>
        <CardHeader>
          <CardTitle>Letzte Synchronisationen</CardTitle>
          <CardDescription>
            Übersicht der letzten 10 Synchronisationen
          </CardDescription>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="py-8 text-center">
              <Loader2 className="mx-auto h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          ) : error ? (
            <div className="py-8 text-center text-red-600">{error}</div>
          ) : history.length === 0 ? (
            <div className="py-8 text-center text-muted-foreground">
              Noch keine Synchronisationen durchgeführt.
              <br />
              <Link href="/sync" className="text-primary hover:underline">
                Starte deine erste Synchronisation
              </Link>
            </div>
          ) : (
            <div className="space-y-2">
              {history.map((entry) => {
                const isSuccess = entry.result.totalFailed === 0 && entry.result.totalSuccess > 0;
                const isFailed = entry.result.totalFailed > 0;
                const date = new Date(entry.timestamp);

                return (
                  <div
                    key={entry.id}
                    className="flex items-center justify-between rounded-lg border p-4"
                  >
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <span className="font-medium">{entry.csvFileName}</span>
                        {isSuccess && (
                          <Badge variant="default" className="bg-green-600">
                            Erfolgreich
                          </Badge>
                        )}
                        {isFailed && (
                          <Badge variant="destructive">Fehlgeschlagen</Badge>
                        )}
                      </div>
                      <div className="mt-1 text-sm text-muted-foreground">
                        {date.toLocaleString("de-DE")} • {entry.config.shopUrl} • {entry.config.locationName}
                      </div>
                      <div className="mt-1 text-xs text-muted-foreground">
                        {entry.result.totalSuccess} erfolgreich, {entry.result.totalFailed} fehlgeschlagen
                        {entry.result.duration && ` • ${Math.round(entry.result.duration / 1000)}s`}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
