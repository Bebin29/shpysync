"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { LayoutDashboard, RefreshCw, Settings, Package } from "lucide-react";
import { cn } from "@/lib/utils";

/**
 * Sidebar-Navigation-Komponente.
 */
export function Sidebar() {
  const pathname = usePathname();

  const navigation = [
    {
      name: "Dashboard",
      href: "/",
      icon: LayoutDashboard,
    },
    {
      name: "Synchronisation",
      href: "/sync",
      icon: RefreshCw,
    },
    {
      name: "Einstellungen",
      href: "/settings",
      icon: Settings,
    },
  ];

  return (
    <div className="flex h-full w-64 flex-col bg-gray-900 text-white">
      <div className="flex h-16 items-center border-b border-gray-800 px-6">
        <Package className="mr-2 h-6 w-6" />
        <h1 className="text-xl font-bold">WAWISync</h1>
      </div>
      <nav className="flex-1 space-y-1 px-3 py-4">
        {navigation.map((item) => {
          const isActive = pathname === item.href;
          return (
            <Link
              key={item.name}
              href={item.href}
              className={cn(
                "flex items-center rounded-lg px-3 py-2 text-sm font-medium transition-colors",
                isActive
                  ? "bg-primary text-white"
                  : "text-gray-300 hover:bg-gray-800 hover:text-white"
              )}
            >
              <item.icon className="mr-3 h-5 w-5" />
              {item.name}
            </Link>
          );
        })}
      </nav>
      <div className="border-t border-gray-800 p-4">
        <div className="text-xs text-gray-400">
          Version 1.0.0
        </div>
      </div>
    </div>
  );
}

