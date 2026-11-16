import { prisma } from "@/lib/prisma";
import { dispatchExecution } from "@/app/modules/workflows/lib/dispatch-execution";
import { checkRateLimit, findTriggerNode, readJsonBody, safeEqual, sign256 } from "@/app/modules/workflows/lib/webhook";
import { resolveConfigSecret } from "@/lib/credentials";

/**
 * GitHub webhook receiver for workflows with a `github-trigger` node.
 * Verifies `X-Hub-Signature-256` when a secret is configured, ignores events
 * the node isn't subscribed to (204), and passes the payload downstream.
 *
 * Docs: https://docs.github.com/en/webhooks/using-webhooks/validating-webhook-deliveries
 */
export async function POST(
    request: Request,
    { params }: { params: Promise<{ workflowId: string }> },
): Promise<Response> {
    const { workflowId } = await params;
    const rate = checkRateLimit(`github:${workflowId}`);
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

    const triggerNode = findTriggerNode(workflow.nodes, "github-trigger");
    if (!triggerNode) {
        return Response.json(
            { error: "This workflow has no GitHub Trigger node." },
            { status: 400 },
        );
    }
    const config = (triggerNode.data.config ?? {}) as Record<string, unknown>;

    const event = request.headers.get("x-github-event") ?? "";
    if (!event) {
        return Response.json({ error: "Missing x-github-event header." }, { status: 400 });
    }

    const configured = String(config.events ?? "")
        .split(",")
        .map((entry) => entry.trim())
        .filter(Boolean);
    if (configured.length > 0 && !configured.includes(event)) {
        // Acknowledge but don't run — GitHub retries on non-2xx responses.
        return new Response(null, { status: 204 });
    }

    let parsed: unknown;
    let raw = "";
    try {
        ({ parsed, raw } = await readJsonBody(request));
    } catch (error) {
        if (error instanceof Error && /too large/i.test(error.message)) {
            return Response.json({ error: "Webhook body too large" }, { status: 413 });
        }
        throw error;
    }

    const secret = await resolveConfigSecret(workflow.userId, config, "secret");
    if (secret) {
        const signature = request.headers.get("x-hub-signature-256") ?? "";
        if (!safeEqual(sign256(secret, raw), signature)) {
            return Response.json({ error: "Invalid signature." }, { status: 401 });
        }
    }

    const payload = parsed && typeof parsed === "object" && !Array.isArray(parsed)
        ? (parsed as Record<string, unknown>)
        : { payload: parsed };

    const item: Record<string, unknown> = {
        ...payload,
        event,
        delivery: request.headers.get("x-github-delivery") ?? undefined,
    };

    const result = await dispatchExecution(workflowId, "GITHUB", item);
    if ("error" in result) {
        return Response.json({ error: result.error }, { status: 502 });
    }
    return Response.json({ ok: true, executionId: result.executionId });
}
