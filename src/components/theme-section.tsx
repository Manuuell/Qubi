"use client";

import { useTheme } from "next-themes";
import { Moon, Sun, MonitorSmartphone } from "lucide-react";
import { cn } from "@/lib/utils";

const OPTIONS = [
  { key: "light", label: "Claro", icon: Sun },
  { key: "dark", label: "Oscuro", icon: Moon },
  { key: "system", label: "Sistema", icon: MonitorSmartphone },
] as const;

export function ThemeSection() {
  const { theme, setTheme } = useTheme();

  return (
    <div className="bg-muted inline-flex items-center gap-0.5 rounded-full p-1">
      {OPTIONS.map((o) => {
        const active = theme === o.key;
        return (
          <button
            key={o.key}
            type="button"
            suppressHydrationWarning
            onClick={() => setTheme(o.key)}
            className={cn(
              "transition-ios flex items-center gap-1.5 rounded-full px-3.5 py-1.5 text-sm",
              active
                ? "bg-card text-foreground font-medium shadow-sm"
                : "text-muted-foreground hover:text-foreground",
            )}
          >
            <o.icon className="size-4" />
            {o.label}
          </button>
        );
      })}
    </div>
  );
}
