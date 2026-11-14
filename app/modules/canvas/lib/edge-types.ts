import type { Connection } from "@xyflow/react";
import type { WorkflowEdge } from "./types";

export function createWorkflowEdge(connection: Connection): WorkflowEdge {
    return {
        id: connection.source && connection.target
            ? `edge-${connection.source}-${connection.target}-${connection.sourceHandle ?? "out"}-${connection.targetHandle ?? "in"}`
            : `edge-${crypto.randomUUID()}`,
        source: connection.source,
        target: connection.target,
        sourceHandle: connection.sourceHandle ?? undefined,
        targetHandle: connection.targetHandle ?? undefined,
        type: "workflow",
        animated: false,
        data: {},
    };
}
