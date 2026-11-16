import { interpolate } from "@/app/modules/engine/lib/template";
import { resolveConfigSecret } from "@/lib/credentials";
import type { ExecutorArgs, ExecutorResult } from "./index";

const TIMEOUT_MS = 15_000;

/**
 * Telegram Send — sends a message via a bot token.
 * https://core.telegram.org/bots/api#sendmessage
 */
export async function telegramSend({ node, item, userId }: ExecutorArgs): Promise<ExecutorResult> {
    const config = node.data.config ?? {};
    const botToken = await resolveConfigSecret(userId, config, "botToken");
    if (!botToken) {
        throw new Error("Telegram Send: bot token is required — configure a credential or an inline token on the node.");
    }
    const chatId = interpolate(String(config.chatId ?? ""), item).trim();
    if (!chatId) {
        throw new Error("Telegram Send: chat ID is required — set it on the node (e.g. {{chat_id}}).");
    }
    const text = interpolate(String(config.text ?? ""), item).trim();
    if (!text) {
        throw new Error("Telegram Send: message text is empty — set the message on the node (e.g. {{message}}).");
    }

    let response: Response;
    try {
        response = await fetch(`https://api.telegram.org/bot${botToken}/sendMessage`, {
            method: "POST",
            headers: { "content-type": "application/json" },
            body: JSON.stringify({ chat_id: chatId, text }),
            signal: AbortSignal.timeout(TIMEOUT_MS),
        });
    } catch (error) {
        const detail = error instanceof Error ? error.message : String(error);
        throw new Error(`Telegram Send: request failed — ${detail}`);
    }

    const body = (await response.json().catch(() => null)) as { ok?: boolean; result?: { message_id?: number }; description?: string } | null;
    if (!response.ok || body?.ok === false) {
        throw new Error(`Telegram Send: ${response.status} — ${body?.description ?? "request rejected by Telegram"}`);
    }

    const output = {
        ok: true as const,
        message_id: body?.result?.message_id,
        chat_id: chatId,
        text,
    };
    return { item: { ...item, ...output }, output };
}
