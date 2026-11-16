"use client";

import {
    BaseEdge,
    EdgeLabelRenderer,
    getSmoothStepPath,
    type EdgeProps,
} from "@xyflow/react";
import { useExecutionOverlay } from "@modules/canvas/components/execution-context";
import { cn } from "@/lib/utils";

type FlowState = "idle" | "active" | "done" | "error";

/**
 * Read where the run actually went from the overlay:
 *  idle   — upstream hasn't run yet (or never will — untraversed branches stay quiet)
 *  active — upstream is executing right now (amber dot stream)
 *  done   — upstream finished, data flowed through (solid emerald)
 *  error  — upstream failed; the run stopped here (destructive)
 */
function useFlowState(source: string | undefined): FlowState {
    const { overlay } = useExecutionOverlay();
    if (!source) return "idle";
    const upstream = overlay[source]?.status;
    if (upstream === "running") return "active";
    if (upstream === "success") return "done";
    if (upstream === "error") return "error";
    return "idle";
}

export function WorkflowEdgeComponent({
    id,
    source,
    sourceX,
    sourceY,
    sourcePosition,
    targetX,
    targetY,
    targetPosition,
    data,
    selected,
}: EdgeProps) {
    const [path, labelX, labelY] = getSmoothStepPath({
        sourceX,
        sourceY,
        sourcePosition,
        targetX,
        targetY,
        targetPosition,
        borderRadius: 12,
    });

    const flow = useFlowState(source);
    const label = (data as { label?: string } | undefined)?.label;

    return (
        <>
            <BaseEdge
                id={id}
                path={path}
                className={cn(
                    "fill-none stroke-[1.5px] transition-colors duration-200",
                    selected
                        ? "stroke-primary"
                        : flow === "active"
                            ? "stroke-amber-500/90"
                            : flow === "done"
                                ? "stroke-emerald-500/70"
                                : flow === "error"
                                    ? "stroke-destructive/80"
                                    : "stroke-border hover:stroke-primary/50"
                )}
            />
            {flow === "active" && (
                <path
                    d={path}
                    aria-hidden="true"
                    pointerEvents="none"
                    className="cf-edge-flow fill-none stroke-amber-400/80 stroke-[2.5px]"
                    style={{ strokeDasharray: "0.5 11.5", strokeLinecap: "round" }}
                />
            )}
            {label && (
                <EdgeLabelRenderer>
                    <div
                        className={cn(
                            "nodrag nopan pointer-events-auto absolute -translate-x-1/2 -translate-y-1/2 rounded-md border px-1.5 py-0.5 text-[11px] font-medium shadow-sm transition-colors duration-200",
                            flow === "done" && "border-emerald-500/30 bg-emerald-500/[0.08] text-emerald-700 dark:text-emerald-400",
                            flow === "active" && "border-amber-500/30 bg-amber-500/[0.08] text-amber-700 dark:text-amber-400",
                            flow === "error" && "border-destructive/30 bg-destructive/[0.08] text-destructive",
                            flow === "idle" && "border-border bg-popover text-muted-foreground"
                        )}
                        style={{ left: labelX, top: labelY }}
                    >
                        {label}
                    </div>
                </EdgeLabelRenderer>
            )}
        </>
    );
}
