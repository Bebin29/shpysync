"use client";

import { AlertCircle, CheckCircle2, Clock } from "lucide-react";
import { cn } from "@/lib/utils";

/**
 * Header-Komponente mit Status-Indikator.
 */
export function Header() {
  // TODO: Status aus Electron/State holen
  const connectionStatus: "connected" | "disconnected" | "checking" = "checking";

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

