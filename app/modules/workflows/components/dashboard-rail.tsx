"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Workflow, LayoutGrid, History, KeyRound } from "lucide-react";
import { cn } from "@/lib/utils";

const NAV = [
  { href: "/", label: "Workflows", icon: Workflow },
  { href: "/templates", label: "Templates", icon: LayoutGrid },
  { href: "/executions", label: "Executions", icon: History },
  { href: "/credentials", label: "Credentials", icon: KeyRound },
] as const;

export function DashboardRail() {
  const pathname = usePathname();

  return (
    <aside
      aria-label="App navigation"
      className="hidden h-full w-16 shrink-0 flex-col items-center gap-1 border-r border-border/70 bg-background py-3 md:flex"
    >
      {NAV.map(({ href, label, icon: Icon }) => {
        const active = href === "/" ? pathname === "/" : pathname.startsWith(href);
        return (
          <Link
            key={href}
            href={href}
            aria-label={label}
            aria-current={active ? "page" : undefined}
            title={label}
            className={cn(
              "group flex size-11 items-center justify-center rounded-xl outline-none transition-colors duration-150 focus-visible:bg-muted focus-visible:ring-2 focus-visible:ring-ring",
              active ? "bg-primary/[0.12] text-primary" : "text-muted-foreground hover:bg-muted hover:text-foreground"
            )}
          >
            <Icon className="size-5" strokeWidth={active ? 2 : 1.75} aria-hidden="true" />
          </Link>
        );
      })}
    </aside>
  );
}
