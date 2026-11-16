import { prisma } from "@/lib/prisma";
import { inngest } from "@/app/modules/inngest/client";
import { workflowTriggered } from "@/app/modules/inngest/events";
import type { TriggerType } from "@/generated/prisma/client";

export type DispatchResult = { executionId: string } | { error: string };

/**
 * Record an execution row and enqueue it on Inngest. If the transport is down,
 * the row is closed as ERROR (never left RUNNING forever) and `{ error }` is
 * returned — callers translate that into an HTTP or UI error response.
 */
export async function dispatchExecution(
    workflowId: string,
    trigger: TriggerType,
    inputPayload?: Record<string, unknown>,
    retryOfId?: string,
): Promise<DispatchResult> {
    const execution = await prisma.execution.create({
        data: {
            workflowId,
            trigger,
            status: "RUNNING",
            data: (inputPayload ?? undefined) as never,
            retryOfId: retryOfId ?? undefined,
        },
    });

    try {
        await inngest.send(
            workflowTriggered.create({
                workflowId,
                executionId: execution.id,
                trigger,
                input: inputPayload,
            })
        );
        return { executionId: execution.id };
    } catch (error) {
        console.error("dispatchExecution: inngest.send failed for", execution.id, error);
        await prisma.execution.update({
            where: { id: execution.id },
            data: {
                status: "ERROR",
                finishedAt: new Date(),
                data: { error: "Execution transport unreachable — is the Inngest dev server running (or dev keys configured)?" } as never,
            },
        });
        return { error: "Couldn't start the run — is the Inngest dev server running?" };
    }
}
