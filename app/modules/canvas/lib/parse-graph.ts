import type { WorkflowEdge, WorkflowNode } from "./types";

function isPlainObject(value: unknown): value is Record<string, unknown> {
    return typeof value === "object" && value !== null && !Array.isArray(value);
}

function isValidNode(value: unknown): value is WorkflowNode {
    if (!isPlainObject(value)) return false;
    const data = value.data;
    return (
        typeof value.id === "string" &&
        typeof value.type === "string" &&
        isPlainObject(value.position) &&
        typeof value.position.x === "number" &&
        typeof value.position.y === "number" &&
        isPlainObject(data) &&
        typeof data.nodeType === "string"
    );
}

function isValidEdge(value: unknown): value is WorkflowEdge {
    if (!isPlainObject(value)) return false;
    return (
        typeof value.id === "string" &&
        typeof value.source === "string" &&
        typeof value.target === "string"
    );
}

export function parseNodes(input: unknown): WorkflowNode[] {
    if (!Array.isArray(input)) return [];
    return input.filter(isValidNode).map((node) => ({
        ...node,
        data: {
            label: typeof node.data?.label === "string" ? node.data.label : node.data?.nodeType ?? "Untitled",
            nodeType: node.data.nodeType,
            config:
                isPlainObject(node.data?.config)
                    ? Object.fromEntries(
                        Object.entries(node.data.config).filter(([, v]) => typeof v === "string"),
                    )
                    : {},
            status: node.data?.status as WorkflowNode["data"]["status"],
        },
    }));
}

export function parseEdges(input: unknown): WorkflowEdge[] {
    if (!Array.isArray(input)) return [];
    return input.filter(isValidEdge).map((edge) => ({ ...edge, type: edge.type ?? "workflow" }));
}

export function serializeNodes(nodes: WorkflowNode[]) {
    return nodes.map(({ id, type, position, data }) => ({ id, type, position, data }));
}

export function serializeEdges(edges: WorkflowEdge[]) {
    return edges.map(({ id, source, target, sourceHandle, targetHandle, type, data }) => ({
        id,
        source,
        target,
        sourceHandle,
        targetHandle,
        type,
        data,
    }));
}
