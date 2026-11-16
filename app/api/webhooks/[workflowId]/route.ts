import { prisma } from "@/lib/prisma";
import { dispatchExecution } from "@/app/modules/workflows/lib/dispatch-execution";
import {
    checkRateLimit,
    findTriggerNode,
    readJsonBody,
    safeEqual,
    webhookItem,
} from "@/app/modules/workflows/lib/webhook";
import { resolveConfigSecret } from "@/lib/credentials";

/**
 * Generic webhook trigger — POST/PUT/PATCH/DELETE/GET for any workflow with a
 * `webhook-trigger` node. n8n-compatible shape: body/headers/query are passed
 * through as the trigger payload. Set an optional `secret` on the node to
 * require the `x-webhook-secret` header.
 *
 * Responds with 200 + `{ ok, executionId }` once the run is accepted.
 */
async function handleWebhook(
    request: Request,
    params: Promise<{ workflowId: string }>,
): Promise<Response> {
    const { workflowId } = await params;
    const rate = checkRateLimit(`generic:${workflowId}`);
    if (!rate.allowed) {
        return Response.json({ error: "Rate limit exceeded" }, { status: 429, headers: { "Retry-After": String(rate.retryAfter) } });
    }
    const workflow = await prisma.workflow.findUnique({ where: { id: workflowId } });
    if (!workflow) {
        return Response.json({ error: "Workflow not found" }, { status: 404 });
    }
    if (!workflow.active) {
        return Response.json(
            { error: "Workflow is inactive — activate it to receive webhooks." },
            { status: 403 },
        );
    }

    const triggerNode = findTriggerNode(workflow.nodes, "webhook-trigger");
    if (!triggerNode) {
        return Response.json(
            { error: "This workflow has no Webhook trigger node." },
            { status: 400 },
        );
    }

    const config = (triggerNode.data.config ?? {}) as Record<string, unknown>;
    const secret = await resolveConfigSecret(workflow.userId, config, "secret");
    if (secret && !safeEqual(secret, request.headers.get("x-webhook-secret") ?? "")) {
        return Response.json({ error: "Invalid webhook secret." }, { status: 401 });
    }
    const expectedMethod = typeof config.method === "string" ? config.method.trim().toUpperCase() : "";
    if (expectedMethod && expectedMethod !== request.method) {
        return Response.json({ error: `This webhook expects ${expectedMethod} requests.` }, { status: 405 });
    }

    let parsed: unknown;
    try {
        ({ parsed } = await readJsonBody(request));
    } catch (error) {
        if (error instanceof Error && /too large/i.test(error.message)) {
            return Response.json({ error: "Webhook body too large" }, { status: 413 });
        }
        throw error;
    }
    const item = webhookItem(request, parsed);
    const result = await dispatchExecution(workflowId, "WEBHOOK", item);
    if ("error" in result) {
        return Response.json({ error: result.error }, { status: 502 });
    }
    return Response.json({ ok: true, executionId: result.executionId });
}

export async function GET(request: Request, { params }: { params: Promise<{ workflowId: string }> }) {
    return handleWebhook(request, params);
}
export async function POST(request: Request, { params }: { params: Promise<{ workflowId: string }> }) {
    return handleWebhook(request, params);
}
export async function PUT(request: Request, { params }: { params: Promise<{ workflowId: string }> }) {
    return handleWebhook(request, params);
}
export async function PATCH(request: Request, { params }: { params: Promise<{ workflowId: string }> }) {
    return handleWebhook(request, params);
}
export async function DELETE(request: Request, { params }: { params: Promise<{ workflowId: string }> }) {
    return handleWebhook(request, params);
}
