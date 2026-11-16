import { prisma } from "@/lib/prisma";
import { publishNodeStatus } from "@/app/modules/inngest/realtime/publish-node-status";
import type { WorkflowStateType } from "@/app/modules/engine/lib/state";
import type { WorkflowNode } from "../../canvas/lib/types";
import { runNode } from "@/app/modules/nodes/executors";

// Postgres `json` rejects U+0000 and lone surrogate escapes — a binary HTTP
// body decoded as UTF-8 can carry them, so scrub before every JSON write.
const LONE_SURROGATE = /[\uD800-\uDBFF](?![\uDC00-\uDFFF])|(?<![\uD800-\uDBFF])[\uDC00-\uDFFF]/g;

function sanitizeForJson(value: unknown): unknown {
    const strip = (s: string) => s.split("\u0000").join("").replace(LONE_SURROGATE, "");
    return JSON.parse(JSON.stringify(value, (_key, v) => (typeof v === "string" ? strip(v) : v)));
}

/**
 * Executes a single canvas node inside the compiled LangGraph:
 *  1. open an ExecutionStep row (RUNNING) and announce it,
 *  2. run the node's executor,
 *  3. close the step (SUCCESS | ERROR) with output or error,
 *  4. return the slice of graph state the next node consumes.
 * A throwing step fails the whole run and marks it ERROR via runWorkflow.
 */
export async function executeCanvasNode(
    state: WorkflowStateType,
    node: WorkflowNode,
    executionId: string,
    userId: string,
): Promise<Partial<WorkflowStateType>> {
    const startedAt = new Date();
    const input = (state.item ?? {}) as Record<string, unknown>;

    const step = await prisma.executionStep.create({
        data: {
            executionId,
            nodeId: node.id,
            nodeName: node.data.label,
            nodeType: node.data.nodeType,
            status: "RUNNING",
            input: sanitizeForJson(input) as never,
            error: "",
            startedAt,
        },
    });
    await publishNodeStatus(executionId, { nodeId: node.id, status: "running" });

    try {
        const result = await runNode({ node, item: input, executionId, userId });
        const finishedAt = new Date();
        const output = result.output ?? result.item ?? {};
        const nextItem = (result.item ?? input) as Record<string, unknown>;

        await prisma.executionStep.update({
            where: { id: step.id },
            data: { status: "SUCCESS", output: sanitizeForJson(output) as never, finishedAt },
        });
        await publishNodeStatus(executionId, { nodeId: node.id, status: "success", output });

        return {
            item: nextItem,
            branch: result.branch ?? state.branch,
            nodeResults: { ...state.nodeResults, [node.id]: { status: "success", output } },
        };
    } catch (error) {
        const finishedAt = new Date();
        const message = error instanceof Error ? error.message : String(error);

        await prisma.executionStep.update({
            where: { id: step.id },
            data: { status: "ERROR", error: message.slice(0, 1000), finishedAt },
        });
        await publishNodeStatus(executionId, { nodeId: node.id, status: "error", error: message });
        throw error;
    }
}
