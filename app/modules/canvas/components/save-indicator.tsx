"use client";

import { Check, Loader2, AlertCircle } from "lucide-react";
import { useSaveStatus, type SaveStatus } from "./save-status-context";
import { cn } from "@/lib/utils";

const statusConfig: Record<SaveStatus, { label: string; icon: typeof Check; className: string }> = {
    idle: { label: "All changes saved", icon: Check, className: "text-muted-foreground" },
    saving: { label: "Saving…", icon: Loader2, className: "text-muted-foreground" },
    saved: { label: "All changes saved", icon: Check, className: "text-emerald-600 dark:text-emerald-400" },
    error: { label: "Couldn't save", icon: AlertCircle, className: "text-destructive" },
};

export function SaveIndicator() {
    const { status } = useSaveStatus();
    const { label, icon: Icon, className } = statusConfig[status];
    const isSpinning = status === "saving";

    return (
        <div
            role="status"
            aria-live="polite"
            title={label}
            className={cn(
                "flex h-7 items-center gap-1.5 rounded-full border border-border/60 bg-muted/40 px-2.5 text-[11px] font-medium transition-colors duration-200",
                className
            )}
        >
            <Icon
                className={cn("size-3.5", isSpinning && "animate-spin")}
                aria-hidden="true"
            />
            <span className="hidden sm:inline">{label}</span>
        </div>
    );
}
