"use client";

import * as React from "react";
import { Moon, Sun, Monitor, Check } from "lucide-react";
import { useTheme } from "next-themes";
import { buttonVariants } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";

export interface ModeToggleProps {
  className?: string;
  align?: "start" | "center" | "end";
}

// Hydration-safe mounted check without setState-in-effect (SSR renders the
// placeholder; the client snapshot flips it to the real toggle).
const subscribe = () => () => {};
const getClientSnapshot = () => true;
const getServerSnapshot = () => false;

export function ModeToggle({ className, align = "end" }: ModeToggleProps) {
  const { theme, setTheme } = useTheme();
  const mounted = React.useSyncExternalStore(
    subscribe,
    getClientSnapshot,
    getServerSnapshot
  );

  if (!mounted) {
    return (
      <button
        type="button"
        disabled
        aria-label="Toggle theme"
        className={cn(
          buttonVariants({ variant: "outline", size: "icon" }),
          "relative size-9 rounded-lg border-border/80 bg-background/80 shadow-xs backdrop-blur-xs opacity-70",
          className
        )}
      >
        <Sun className="size-4 text-muted-foreground" />
      </button>
    );
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        aria-label="Toggle theme"
        className={cn(
          buttonVariants({ variant: "outline", size: "icon" }),
          "group/toggle relative size-9 rounded-lg border-border/80 bg-background/80 shadow-xs backdrop-blur-xs transition-colors hover:border-primary/40 hover:bg-accent/40 focus-visible:ring-primary",
          className
        )}
      >
        <Sun className="size-4 rotate-0 scale-100 transition-[transform,opacity] duration-200 ease-emphasized motion-reduce:transition-none dark:-rotate-90 dark:scale-0 text-amber-500 group-hover/toggle:text-amber-600" />
        <Moon className="absolute size-4 rotate-90 scale-0 transition-[transform,opacity] duration-200 ease-emphasized motion-reduce:transition-none dark:rotate-0 dark:scale-100 text-primary group-hover/toggle:text-primary/90" />
        <span className="sr-only">Toggle theme</span>
      </DropdownMenuTrigger>

      <DropdownMenuContent
        align={align}
        sideOffset={6}
        className="w-36 rounded-lg border border-border/80 bg-popover/95 p-1 text-popover-foreground shadow-lg backdrop-blur-md"
      >
        <DropdownMenuItem
          onClick={() => setTheme("light")}
          className="flex cursor-pointer items-center justify-between rounded-md px-2.5 py-1.5 text-xs font-medium transition-colors hover:bg-accent hover:text-accent-foreground"
        >
          <div className="flex items-center gap-2">
            <Sun className="size-3.5 text-amber-500" />
            <span>Light</span>
          </div>
          {theme === "light" && (
            <Check className="size-3.5 text-primary stroke-[2.5]" />
          )}
        </DropdownMenuItem>

        <DropdownMenuItem
          onClick={() => setTheme("dark")}
          className="flex cursor-pointer items-center justify-between rounded-md px-2.5 py-1.5 text-xs font-medium transition-colors hover:bg-accent hover:text-accent-foreground"
        >
          <div className="flex items-center gap-2">
            <Moon className="size-3.5 text-primary" />
            <span>Dark</span>
          </div>
          {theme === "dark" && (
            <Check className="size-3.5 text-primary stroke-[2.5]" />
          )}
        </DropdownMenuItem>

        <DropdownMenuItem
          onClick={() => setTheme("system")}
          className="flex cursor-pointer items-center justify-between rounded-md px-2.5 py-1.5 text-xs font-medium transition-colors hover:bg-accent hover:text-accent-foreground"
        >
          <div className="flex items-center gap-2">
            <Monitor className="size-3.5 text-muted-foreground" />
            <span>System</span>
          </div>
          {theme === "system" && (
            <Check className="size-3.5 text-primary stroke-[2.5]" />
          )}
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

export default ModeToggle;
