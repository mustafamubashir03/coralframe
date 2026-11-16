import { prisma } from "@/lib/prisma";
import { compileWorkflow } from "./compile-workflow";
import { parseWorkflowGraph } from "@/app/modules/canvas/lib/parse-graph";

// Postgres `json` rejects U+0000 and lone surrogate escapes.
const LONE_SURROGATE = /[\uD800-\uDBFF](?![\uDC00-\uDFFF])|(?<![\uD800-\uDBFF])[\uDC00-\uDFFF]/g;

function sanitizeForJson(value: unknown): unknown {
    if (value == null) return value;
    const strip = (s: string) => s.split("\u0000").join("").replace(LONE_SURROGATE, "");
    return JSON.parse(JSON.stringify(value, (_key, v) => (typeof v === "string" ? strip(v) : v)));
}

export async function runWorkflow(executionId: string) {
    const execution = await prisma.execution.findUniqueOrThrow({
        where: { id: executionId },
        include: { workflow: true },
    });

    const { nodes, edges } = parseWorkflowGraph(
        execution.workflow.nodes,
        execution.workflow.edges,
    );

    const app = compileWorkflow(nodes, edges, executionId, execution.workflow.userId);

    try {
        const result = await app.invoke({
            item: (sanitizeForJson(execution.data) as Record<string, unknown> | null) ?? {},
            branch: "",
            nodeResults: {},
        });
        await prisma.execution.update({
            where: { id: executionId },
            data: {
                status: "SUCCESS",
                finishedAt: new Date(),
                data: (sanitizeForJson(result.item ?? {})) as never,
            },
        });
        return result.item;
    } catch (err) {
        await prisma.execution.update({
            where: { id: executionId },
            data: { status: "ERROR", finishedAt: new Date() },
        });
        throw err;
    }
}
