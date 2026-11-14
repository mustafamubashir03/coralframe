"use client";

import { Handle, Position, useReactFlow, type NodeProps } from "@xyflow/react";
import { Trash2 } from "lucide-react";
import { NodeTile } from "@modules/nodes/components/node-tile";
import { getNode } from "@modules/nodes/lib";
import { cn } from "@/lib/utils";
import type { WorkflowNode } from "../../lib/types";

const statusDot: Record<string, string> = {
    idle: "bg-muted-foreground/40",
    running: "bg-amber-500 animate-pulse",
    success: "bg-emerald-500",
    error: "bg-destructive",
};

export function BaseNode({ id, data, selected }: NodeProps<WorkflowNode>) {
    const definition = getNode(data.nodeType);
    const isTrigger = definition?.isTrigger === true;
    const status = data.status ?? "idle";
    const { setNodes, setEdges } = useReactFlow<WorkflowNode>();

    const removeNode = () => {
        setNodes((nodes) => nodes.filter((node) => node.id !== id));
        setEdges((edges) => edges.filter((edge) => edge.source !== id && edge.target !== id));
    };

    return (
        <div
            data-testid="canvas-node"
            className={cn(
                "group relative flex h-14 w-52 items-center gap-2.5 rounded-xl border bg-card pl-2 pr-1.5 text-left shadow-sm transition-[border-color,box-shadow] duration-150 ease-emphasized",
                selected
                    ? "border-primary ring-2 ring-primary/30"
                    : "border-border/80 hover:border-primary/40 hover:shadow-md"
            )}
        >
            <NodeTile type={data.nodeType} size="md" />

            <span className="flex min-w-0 flex-1 flex-col gap-0.5">
                <span className="flex items-center gap-1.5">
                    <span className="truncate text-[13px] font-semibold leading-4 text-foreground">
                        {data.label}
                    </span>
                    <span
                        aria-hidden="true"
                        className={cn("size-1.5 shrink-0 rounded-full", statusDot[status] ?? statusDot.idle)}
                    />
                </span>
                <span
                    className="truncate text-[11px] leading-4 text-muted-foreground"
                    title={definition?.description ?? data.nodeType}
                >
                    {definition?.description ?? data.nodeType}
                </span>
            </span>

            <button
                type="button"
                aria-label="Delete node"
                onClick={removeNode}
                onPointerDown={(e) => e.stopPropagation()}
                className="absolute -right-2 -top-2 flex size-6 items-center justify-center rounded-full border border-border bg-popover text-muted-foreground opacity-0 shadow-sm transition-[opacity,transform] duration-150 hover:scale-110 hover:text-destructive focus-visible:opacity-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring group-hover:opacity-100"
            >
                <Trash2 className="size-3" aria-hidden="true" />
            </button>

            {!isTrigger && (
                <Handle
                    type="target"
                    position={Position.Left}
                    id="in"
                    className="!size-2.5 !border-[1.5px] !border-border !bg-popover transition-colors hover:!border-primary"
                />
            )}
            <Handle
                type="source"
                position={Position.Right}
                id="out"
                className="!size-2.5 !border-[1.5px] !border-border !bg-popover transition-colors hover:!border-primary"
            />
        </div>
    );
}
