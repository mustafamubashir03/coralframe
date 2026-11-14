"use client";

import { Zap } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export function CanvasEmptyState({
    onAddTrigger,
    className,
}: {
    onAddTrigger: () => void;
    className?: string;
}) {
    return (
        <div
            className={cn(
                "pointer-events-none absolute inset-0 z-10 flex flex-col items-center justify-center gap-4 text-center",
                className
            )}
        >
            <div
                aria-hidden="true"
                className="tile-raised flex size-16 items-center justify-center rounded-2xl"
            >
                <Zap className="size-7 text-primary" strokeWidth={1.5} />
            </div>
            <div className="pointer-events-auto flex max-w-xs flex-col items-center gap-1.5">
                <h2 className="font-heading text-base font-semibold tracking-tight text-foreground">
                    Every workflow starts with a trigger
                </h2>
                <p className="text-[13px] leading-5 text-muted-foreground">
                    Pick a step from the library on the left — or drop one onto the canvas.
                </p>
            </div>
            <div className="pointer-events-auto">
                <Button onClick={onAddTrigger} className="h-9 text-[13px] font-semibold">
                    <Zap className="size-4" aria-hidden="true" />
                    Add a trigger
                </Button>
            </div>
        </div>
    );
}
