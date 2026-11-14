"use client";

import { useEffect, useRef } from "react";
import { saveWorkflowGraph } from "@/app/modules/workflows/actions";
import type { SaveStatus } from "@modules/canvas/components/save-status-context";

export function useAutosave({
    nodes,
    edges,
    workflowId,
    enabled,
    delay = 1500,
    onStatusChange,
}: {
    nodes: unknown[];
    edges: unknown[];
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
        const next = JSON.stringify(nodes);
        const nextEdges = JSON.stringify(edges);
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
            const result = await saveWorkflowGraph(workflowId, { nodes, edges });
            onStatusChange(result.ok ? "saved" : "error");
        }, delay);

        return () => {
            if (timeoutRef.current) clearTimeout(timeoutRef.current);
        };
    }, [nodes, edges, enabled, workflowId, delay, onStatusChange]);
}
