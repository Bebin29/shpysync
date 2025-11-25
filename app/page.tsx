import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { RefreshCw, Package, TrendingUp, AlertCircle } from "lucide-react";
import Link from "next/link";
import { IpcTest } from "@/app/components/ipc-test";

/**
 * Dashboard-Seite mit Übersicht und Statistiken.
 */
export default function Dashboard() {
  // TODO: Echte Daten aus Electron/State holen
  const stats = {
    totalProducts: 0,
    lastSync: null as Date | null,
    syncSuccess: 0,
    syncFailed: 0,
  };

  const recentSyncs = [
    // TODO: Echte Sync-Historie laden
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold">Dashboard</h1>
        <Link href="/sync">
          <Button>
            <RefreshCw className="mr-2 h-4 w-4" />
            Synchronisation starten
          </Button>
        </Link>
      </div>

      {/* Statistik-Karten */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Produkte</CardTitle>
            <Package className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.totalProducts}</div>
            <p className="text-xs text-muted-foreground">Gesamt im Cache</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Letzte Sync</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {stats.lastSync
                ? new Date(stats.lastSync).toLocaleDateString("de-DE")
                : "Nie"}
            </div>
            <p className="text-xs text-muted-foreground">
              {stats.lastSync
                ? new Date(stats.lastSync).toLocaleTimeString("de-DE")
                : "Noch keine Synchronisation"}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Erfolgreich</CardTitle>
            <TrendingUp className="h-4 w-4 text-green-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">
              {stats.syncSuccess}
            </div>
            <p className="text-xs text-muted-foreground">Letzte 10 Syncs</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Fehlgeschlagen</CardTitle>
            <AlertCircle className="h-4 w-4 text-red-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">
              {stats.syncFailed}
            </div>
            <p className="text-xs text-muted-foreground">Letzte 10 Syncs</p>
          </CardContent>
        </Card>
      </div>

      {/* IPC-Verbindungstest (Phase 1) */}
      <IpcTest />

      {/* Letzte Synchronisationen */}
      <Card>
        <CardHeader>
          <CardTitle>Letzte Synchronisationen</CardTitle>
          <CardDescription>
            Übersicht der letzten 10 Synchronisationen
          </CardDescription>
        </CardHeader>
        <CardContent>
          {recentSyncs.length === 0 ? (
            <div className="py-8 text-center text-muted-foreground">
              Noch keine Synchronisationen durchgeführt.
              <br />
              <Link href="/sync" className="text-primary hover:underline">
                Starte deine erste Synchronisation
              </Link>
            </div>
          ) : (
            <div className="space-y-2">
              {/* TODO: Sync-Liste rendern */}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
