"use client";

import {
    BaseEdge,
    EdgeLabelRenderer,
    getSmoothStepPath,
    type EdgeProps,
} from "@xyflow/react";
import { cn } from "@/lib/utils";

export function WorkflowEdgeComponent({
    id,
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

    const label = (data as { label?: string } | undefined)?.label;

    return (
        <>
            <BaseEdge
                id={id}
                path={path}
                className={cn(
                    "stroke-[1.5px] fill-none transition-colors duration-150",
                    selected
                        ? "stroke-primary"
                        : "stroke-border hover:stroke-primary/50"
                )}
            />
            {label && (
                <EdgeLabelRenderer>
                    <div
                        className="nodrag nopan pointer-events-auto absolute -translate-x-1/2 -translate-y-1/2 rounded-md border border-border bg-popover px-1.5 py-0.5 text-[11px] font-medium text-muted-foreground shadow-sm"
                        style={{ left: labelX, top: labelY }}
                    >
                        {label}
                    </div>
                </EdgeLabelRenderer>
            )}
        </>
    );
}
