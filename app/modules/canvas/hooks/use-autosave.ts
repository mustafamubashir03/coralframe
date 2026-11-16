"use client";

import { useEffect, useRef } from "react";
import { saveWorkflowGraph } from "@/app/modules/workflows/actions";
import {
    serializeEdges,
    serializeNodes,
} from "@/app/modules/canvas/lib/parse-graph";
import type { WorkflowEdge, WorkflowNode } from "@/app/modules/canvas/lib/types";
import type { SaveStatus } from "@modules/canvas/components/save-status-context";

/**
 * Autosaves only when the *persisted* graph changes. XYFlow toggles `selected`,
 * `dragging`, `measured`, `zIndex` on node/edge objects during plain interaction —
 * none of those are part of the stored graph, so clicking around never writes.
 */
export function useAutosave({
    nodes,
    edges,
    workflowId,
    enabled,
    delay = 1500,
    onStatusChange,
}: {
    nodes: WorkflowNode[];
    edges: WorkflowEdge[];
    workflowId: string;
    enabled: boolean;
    delay?: number;
    onStatusChange: (status: SaveStatus) => void;
}) {
    const serialized = useRef("");
    const serializedEdges = useRef("");
    const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

    useEffect(() => {
        if (!enabled) return;
        // Canonical comparison target = exactly what gets persisted.
        const canonicalNodes = serializeNodes(nodes);
        const canonicalEdges = serializeEdges(edges);
        const next = JSON.stringify(canonicalNodes);
        const nextEdges = JSON.stringify(canonicalEdges);
        // First run establishes the baseline — the server already has this graph.
        if (serialized.current === "") {
            serialized.current = next;
            serializedEdges.current = nextEdges;
            return;
        }
        if (next === serialized.current && nextEdges === serializedEdges.current) return;

        if (timeoutRef.current) clearTimeout(timeoutRef.current);
        serialized.current = next;
        serializedEdges.current = nextEdges;

        onStatusChange("saving");
        timeoutRef.current = setTimeout(async () => {
            const result = await saveWorkflowGraph(workflowId, {
                nodes: canonicalNodes,
                edges: canonicalEdges,
            });
            onStatusChange(result.ok ? "saved" : "error");
        }, delay);

        return () => {
            if (timeoutRef.current) clearTimeout(timeoutRef.current);
        };
    }, [nodes, edges, enabled, workflowId, delay, onStatusChange]);
}
