import { interpolate } from "@/app/modules/engine/lib/template";
import { resolveConfigSecret } from "@/lib/credentials";
import type { ExecutorArgs, ExecutorResult } from "./index";

const TIMEOUT_MS = 15_000;

/**
 * Notion Create Page — POST https://api.notion.com/v1/pages
 * Creates a page inside the given database with a single title property.
 * Requires an integration token with access to the database.
 */
export async function notionCreatePage({ node, item, userId }: ExecutorArgs): Promise<ExecutorResult> {
    const config = node.data.config ?? {};
    const token = await resolveConfigSecret(userId, config, "token");
    if (!token) {
        throw new Error("Notion Create Page: integration token is required — configure a credential or an inline token on the node.");
    }
    const databaseId = interpolate(String(config.databaseId ?? ""), item).trim();
    if (!databaseId) {
        throw new Error("Notion Create Page: database ID is required — configure it on the node.");
    }
    const title = interpolate(String(config.title ?? ""), item).trim();
    if (!title) {
        throw new Error("Notion Create Page: title is empty — set it on the node (e.g. {{title}}).");
    }

    let response: Response;
    try {
        response = await fetch("https://api.notion.com/v1/pages", {
            method: "POST",
            headers: {
                authorization: `Bearer ${token}`,
                "notion-version": "2022-06-28",
                "content-type": "application/json",
            },
            body: JSON.stringify({
                parent: { database_id: databaseId },
                properties: {
                    Name: { title: [{ text: { content: title } }] },
                },
            }),
            signal: AbortSignal.timeout(TIMEOUT_MS),
        });
    } catch (error) {
        const detail = error instanceof Error ? error.message : String(error);
        throw new Error(`Notion Create Page: request failed — ${detail}`);
    }

    const payload = (await response.json().catch(() => null)) as { id?: string; url?: string; message?: string } | null;
    if (!response.ok) {
        throw new Error(`Notion Create Page: ${response.status} — ${payload?.message ?? "request rejected by Notion"}`);
    }

    const output = { id: payload?.id, url: payload?.url };
    return { item: { ...item, ...output }, output };
}
