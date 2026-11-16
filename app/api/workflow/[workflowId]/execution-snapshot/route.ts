import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/app/modules/auth/actions";
import { redactValue } from "@/lib/redact";

/**
 * Last-known-good snapshot of a workflow's execution for realtime fallbacks.
 * Pass `?executionId=` for a specific run; otherwise returns the latest one.
 */
export async function GET(
    request: Request,
    { params }: { params: Promise<{ workflowId: string }> }
) {
    const user = await getCurrentUser();
    if (!user) {
        return Response.json({ error: "Not authenticated" }, { status: 401 });
    }

    const { workflowId } = await params;
    const workflow = await prisma.workflow.findFirst({
        where: { id: workflowId, userId: user.id },
        select: { id: true },
    });
    if (!workflow) {
        return Response.json({ error: "Not found" }, { status: 404 });
    }

    const executionId = new URL(request.url).searchParams.get("executionId");
    const execution = await prisma.execution.findFirst({
        where: executionId ? { id: executionId, workflowId } : { workflowId },
        orderBy: { startedAt: "desc" },
        include: {
            steps: { orderBy: { startedAt: "asc" } },
        },
    });

    if (!execution) {
        return Response.json({ executionId: null, status: null, steps: [] });
    }

    return Response.json({
        executionId: execution.id,
        status: execution.status,
        trigger: execution.trigger,
        startedAt: execution.startedAt,
        finishedAt: execution.finishedAt,
        steps: execution.steps.map((step) => ({
            nodeId: step.nodeId,
            nodeName: step.nodeName,
            nodeType: step.nodeType,
            status: step.status.toLowerCase(),
            input: redactValue(step.input ?? {}),
            output: redactValue(step.output ?? {}),
            error: redactValue(step.error ?? "") || undefined,
            startedAt: step.startedAt,
            finishedAt: step.finishedAt,
        })),
    });
}
