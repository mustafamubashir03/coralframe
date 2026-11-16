import { prisma } from "@/lib/prisma";
import { dispatchExecution } from "@/app/modules/workflows/lib/dispatch-execution";
import { checkRateLimit, findTriggerNode, readJsonBody, safeEqual } from "@/app/modules/workflows/lib/webhook";
import { resolveConfigSecret } from "@/lib/credentials";

/**
 * Telegram webhook receiver for workflows with a `telegram-trigger` node.
 * Telegram sends updates as JSON POST bodies. Optionally verifies the
 * `x-telegram-bot-api-secret-token` header when a secret is configured on the
 * node (set the same value as `secret_token` in Telegram's setWebhook call).
 *
 * Docs: https://core.telegram.org/bots/api#setwebhook
 */
export async function POST(
    request: Request,
    { params }: { params: Promise<{ workflowId: string }> },
): Promise<Response> {
    const { workflowId } = await params;
    const rate = checkRateLimit(`telegram:${workflowId}`);
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

    const triggerNode = findTriggerNode(workflow.nodes, "telegram-trigger");
    if (!triggerNode) {
        return Response.json(
            { error: "This workflow has no Telegram Trigger node." },
            { status: 400 },
        );
    }
    const config = (triggerNode.data.config ?? {}) as Record<string, unknown>;

    const secret = await resolveConfigSecret(workflow.userId, config, "secret");
    if (secret && !safeEqual(secret, request.headers.get("x-telegram-bot-api-secret-token") ?? "")) {
        return Response.json({ error: "Invalid secret token." }, { status: 401 });
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
    const update = parsed && typeof parsed === "object" && !Array.isArray(parsed)
        ? (parsed as Record<string, unknown>)
        : { update: parsed };

    const message =
        (update.message as Record<string, unknown> | undefined) ??
        (update.edited_message as Record<string, unknown> | undefined) ??
        (update.channel_post as Record<string, unknown> | undefined) ??
        (update.edited_channel_post as Record<string, unknown> | undefined);
    const callbackQuery = update.callback_query as Record<string, unknown> | undefined;

    const chatId =
        (message?.chat as { id?: number } | undefined)?.id ??
        ((callbackQuery?.message as Record<string, unknown> | undefined)?.chat as { id?: number } | undefined)?.id;
    const text =
        (message?.text as string | undefined) ??
        (callbackQuery?.data as string | undefined);

    const item: Record<string, unknown> = {
        ...update,
        message,
        chat_id: chatId,
        text,
    };

    const result = await dispatchExecution(workflowId, "TELEGRAM", item);
    if ("error" in result) {
        return Response.json({ error: result.error }, { status: 502 });
    }
    return Response.json({ ok: true, executionId: result.executionId });
}
