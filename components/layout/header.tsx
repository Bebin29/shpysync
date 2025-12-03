"use client";

import { useEffect, useState } from "react";
import { AlertCircle, CheckCircle2, Clock } from "lucide-react";
import { cn } from "@/lib/utils";
import { useConfig } from "@/app/hooks/use-config";

/**
 * Header-Komponente mit Status-Indikator.
 */
export function Header() {
  const { shopConfig, loading } = useConfig();
  const [connectionStatus, setConnectionStatus] = useState<
    "connected" | "disconnected" | "checking"
  >("checking");

  // Bestimme Status basierend auf Shop-Config
  useEffect(() => {
    if (loading) {
      setConnectionStatus("checking");
      return;
    }

    if (!shopConfig) {
      setConnectionStatus("disconnected");
      return;
    }

    // Wenn Shop-Config vorhanden ist, prüfe ob alle erforderlichen Felder vorhanden sind
    if (
      shopConfig.shopUrl &&
      shopConfig.accessToken &&
      shopConfig.locationId &&
      shopConfig.locationName
    ) {
      setConnectionStatus("connected");
    } else {
      setConnectionStatus("disconnected");
    }
  }, [shopConfig, loading]);

  const statusConfig = {
    connected: {
      icon: CheckCircle2,
      text: "Verbunden",
      variant: "default" as const,
      className: "text-green-600",
    },
    disconnected: {
      icon: AlertCircle,
      text: "Nicht verbunden",
      variant: "destructive" as const,
      className: "text-red-600",
    },
    checking: {
      icon: Clock,
      text: "Verbindung wird geprüft...",
      variant: "default" as const,
      className: "text-yellow-600",
    },
  };

  // eslint-disable-next-line security/detect-object-injection
  const status = statusConfig[connectionStatus];
  const StatusIcon = status.icon;

  return (
    <header className="flex h-16 items-center justify-between border-b bg-white px-6">
      <div className="flex items-center gap-4">
        <div className="flex items-center gap-2">
          <StatusIcon className={cn("h-5 w-5", status.className)} />
          <span className="text-sm font-medium">{status.text}</span>
        </div>
      </div>
      <div className="flex items-center gap-4">
        {/* Platzhalter für zukünftige Header-Aktionen */}
      </div>
    </header>
  );
}
