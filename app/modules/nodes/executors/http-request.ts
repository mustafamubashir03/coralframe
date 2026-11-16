import { interpolate } from "@/app/modules/engine/lib/template";
import { safeFetch } from "@/lib/ssrf";
import type { ExecutorArgs, ExecutorResult } from "./index";

function parseHeaders(raw: string | undefined): Record<string, string> {
    const trimmed = String(raw ?? "").trim();
    if (!trimmed) return {};
    try {
        const parsed = JSON.parse(trimmed) as unknown;
        if (parsed === null || typeof parsed !== "object" || Array.isArray(parsed)) {
            throw new Error("expected a JSON object of header names to values");
        }
        return Object.fromEntries(
            Object.entries(parsed as Record<string, unknown>).map(([key, value]) => [key, String(value)])
        );
    } catch (error) {
        const detail = error instanceof Error ? error.message : String(error);
        throw new Error(`HTTP Request: Headers JSON is not valid — ${detail}`);
    }
}

/**
 * HTTP Request — calls a public HTTP(S) endpoint. Private/link-local/metadata
 * destinations and unsupported protocols are rejected (SSRF protection); DNS
 * results are validated and redirects are re-checked hop-by-hop.
 *
 * The response replaces the running payload with `{ status, body, headers }`.
 */
export async function httpRequest({ node, item }: ExecutorArgs): Promise<ExecutorResult> {
    const config = node.data.config ?? {};
    const method = String(config.method ?? "GET").toUpperCase();
    if (!/^(GET|POST|PUT|PATCH|DELETE|HEAD)$/.test(method)) {
        throw new Error(`HTTP Request: unsupported method "${config.method}"`);
    }

    const url = interpolate(String(config.url ?? ""), item).trim();
    if (!url) {
        throw new Error("HTTP Request: URL is empty — set it in the node config (e.g. {{endpoint}} or a literal URL).");
    }

    const headers = parseHeaders(config.headersJson);
    const isBodyless = method === "GET" || method === "HEAD";
    const bodyTemplate = String(config.body ?? "");
    const body = isBodyless || !bodyTemplate.trim() ? undefined : interpolate(bodyTemplate, item);

    let response: Response;
    try {
        response = await safeFetch(url, {
            method,
            headers: body ? { "content-type": "application/json", ...headers } : headers,
            body,
        });
    } catch (error) {
        const detail = error instanceof Error ? error.message : String(error);
        throw new Error(`HTTP Request: ${detail}`);
    }

    const rawText = await response.text();
    let parsedBody: unknown = rawText;
    try {
        parsedBody = rawText ? (JSON.parse(rawText) as unknown) : null;
    } catch {
        // Not JSON (HTML page, plain text) — keep the raw string.
    }

    const responseHeaders = Object.fromEntries(response.headers.entries());
    const envelope = { status: response.status, body: parsedBody, headers: responseHeaders };

    if (!response.ok) {
        const excerpt = rawText.replace(/\s+/g, " ").slice(0, 200);
        throw new Error(`HTTP Request: ${response.status} ${response.statusText} from ${url} — ${excerpt}`);
    }

    return { item: envelope, output: envelope };
}
