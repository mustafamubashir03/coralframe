import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/app/modules/auth/actions";
import { inngest } from "@/app/modules/inngest/client";
import { getClientSubscriptionToken } from "inngest/react";
import { executionChannel } from "@/app/modules/inngest/realtime/channels";

/**
 * Mints a subscribe-only, channel-scoped realtime token for the current user.
 * Only works while the execution's workflow belongs to the caller.
 */
export async function GET(request: Request) {
    const user = await getCurrentUser();
    if (!user) {
        return Response.json({ error: "Not authenticated" }, { status: 401 });
    }

    const executionId = new URL(request.url).searchParams.get("executionId");
    if (!executionId) {
        return Response.json({ error: "executionId is required" }, { status: 400 });
    }

    const execution = await prisma.execution.findFirst({
        where: { id: executionId, workflow: { userId: user.id } },
        select: { id: true },
    });
    if (!execution) {
        return Response.json({ error: "Not found" }, { status: 404 });
    }

    try {
        const token = await getClientSubscriptionToken(inngest, {
            channel: executionChannel({ executionId }),
            topics: ["node-status"],
        });
        return Response.json(token);
    } catch (error) {
        console.error("Failed to mint realtime token for", executionId, error);
        return Response.json({ error: "Realtime unavailable" }, { status: 503 });
    }
}
