"use client";

import { Handle, Position, useReactFlow, type NodeProps } from "@xyflow/react";
import { CheckCircle2, Loader2, Trash2, XCircle } from "lucide-react";
import { NodeTile } from "@modules/nodes/components/node-tile";
import { getNode } from "@modules/nodes/lib";
import { useExecutionOverlay } from "@modules/canvas/components/execution-context";
import { cn } from "@/lib/utils";
import type { WorkflowNode } from "../../lib/types";

function NodeStatus({ status }: { status: string }) {
    switch (status) {
        case "running":
            return (
                <Loader2
                    className="size-4 shrink-0 animate-spin text-amber-500"
                    strokeWidth={2}
                    aria-label="Step running"
                    role="status"
                />
            );
        case "success":
            return (
                <CheckCircle2
                    className="cf-node-pop size-4 shrink-0 text-emerald-500"
                    strokeWidth={2}
                    aria-label="Step succeeded"
                />
            );
        case "error":
            return (
                <XCircle
                    className="cf-node-pop size-4 shrink-0 text-destructive"
                    strokeWidth={2}
                    aria-label="Step failed"
                />
            );
        default:
            return <span aria-hidden="true" className="size-1.5 shrink-0 rounded-full bg-muted-foreground/40" />;
    }
}

/** Resolve the right-side handles for a node: IF = true/false, Switch = each case + default, otherwise the registry outputs. */
function resolveSourceHandles(data: WorkflowNode["data"]): { id: string; label?: string }[] {
    const definition = getNode(data.nodeType);
    if (data.nodeType === "if") {
        return [
            { id: "true", label: "True" },
            { id: "false", label: "False" },
        ];
    }
    if (data.nodeType === "switch") {
        const cases = String(data.config?.cases ?? "")
            .split("\n")
            .map((line) => line.trim())
            .filter(Boolean);
        return [
            ...cases.map((caseId) => ({ id: caseId, label: caseId })),
            { id: "default", label: "Default" },
        ];
    }
    return definition?.outputs ?? [{ id: "out", label: undefined }];
}

export function BaseNode({ id, data, selected }: NodeProps<WorkflowNode>) {
    const definition = getNode(data.nodeType);
    const isTrigger = definition?.isTrigger === true;
    const isBranch = data.nodeType === "if" || data.nodeType === "switch";
    const handles = resolveSourceHandles(data);
    const nodeHeight = isBranch
        ? Math.max(56, 28 + handles.length * 26)
        : 56;
    const { overlay } = useExecutionOverlay();
    const liveRun = overlay[id];
    const status = liveRun?.status ?? data.status ?? "idle";
    const runError = liveRun?.errorMessage;
    const { setNodes, setEdges } = useReactFlow<WorkflowNode>();

    const removeNode = () => {
        setNodes((nodes) => nodes.filter((node) => node.id !== id));
        setEdges((edges) => edges.filter((edge) => edge.source !== id && edge.target !== id));
    };

    return (
        <div
            data-testid="canvas-node"
            data-status={status}
            style={{ height: `${nodeHeight}px` }}
            className={cn(
                "group relative flex w-64 items-center gap-2 rounded-xl border bg-card pl-2 text-left shadow-sm transition-[border-color,box-shadow] duration-150 ease-emphasized",
                isBranch ? "pr-16" : "pr-4",
                selected
                    ? "border-primary ring-2 ring-primary/30"
                    : "border-border/80 hover:border-primary/40 hover:shadow-md",
                status === "running" && "cf-node-live border-amber-500/50",
                status === "error" && "border-destructive/50"
            )}
        >
            <NodeTile type={data.nodeType} size="md" />

            <span className="flex min-w-0 flex-1 items-center gap-2">
                <span className="truncate text-[13px] font-semibold leading-5 text-foreground">
                    {data.label}
                </span>
                <NodeStatus status={status} />
            </span>
            {runError && (
                <span
                    className="pointer-events-none absolute bottom-full left-1/2 mb-1.5 max-w-56 -translate-x-1/2 rounded-md border border-destructive/30 bg-destructive px-2 py-1 text-[10px] font-medium leading-4 text-destructive-foreground opacity-0 shadow-lg transition-opacity duration-150 group-hover:opacity-100"
                    role="tooltip"
                >
                    {runError}
                </span>
            )}

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
            <div className="absolute right-0 top-0 flex h-full flex-col items-end justify-center gap-1 pr-1">
                {handles.map((handle) => (
                    <div key={handle.id} className="flex items-center gap-1.5">
                        {handle.label && (
                            <span className="text-[9px] font-medium uppercase leading-none tracking-wide text-muted-foreground/80">
                                {handle.label}
                            </span>
                        )}
                        <Handle
                            type="source"
                            position={Position.Right}
                            id={handle.id}
                            title={handle.label ?? handle.id}
                            className="!relative !top-auto !right-auto !translate-x-0 !translate-y-0 !size-2.5 !border-[1.5px] !border-border !bg-popover transition-colors hover:!border-primary"
                        />
                    </div>
                ))}
            </div>
        </div>
    );
}
