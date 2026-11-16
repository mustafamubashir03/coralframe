import crypto from "node:crypto";

/** Timing-safe comparison tolerant of different-length inputs. */
export function safeEqual(a: string, b: string): boolean {
    const aBuf = Buffer.from(a, "utf8");
    const bBuf = Buffer.from(b, "utf8");
    if (aBuf.length !== bBuf.length) return false;
    return crypto.timingSafeEqual(aBuf, bBuf);
}

export function sign256(secret: string, rawBody: string): string {
    const digest = crypto.createHmac("sha256", secret).update(rawBody, "utf8").digest("hex");
    return `sha256=${digest}`;
}

/** Hard cap for webhook bodies — anything larger is rejected with 413. */
export const WEBHOOK_MAX_BYTES = 256 * 1024; // 256 KB

/**
 * Read a request body as text + best-effort JSON parse, with a size cap.
 * Rejects with `"Webhook body too large"` when the payload exceeds the limit.
 */
export async function readJsonBody(request: Request): Promise<{ parsed: unknown; raw: string }> {
    const contentLength = Number(request.headers.get("content-length") ?? 0);
    if (Number.isFinite(contentLength) && contentLength > WEBHOOK_MAX_BYTES) {
        throw new Error("Webhook body too large");
    }
    const raw = await request.text();
    if (Buffer.byteLength(raw, "utf8") > WEBHOOK_MAX_BYTES) {
        throw new Error("Webhook body too large");
    }
    if (!raw.trim()) return { parsed: {}, raw };
    try {
        return { parsed: JSON.parse(raw), raw };
    } catch {
        return { parsed: raw, raw };
    }
}

/** In-memory fixed-window rate limiter — per workflow, 120 req/min by default. */
const rateBuckets = new Map<string, number[]>();
const RATE_WINDOW_MS = 60_000;
const RATE_LIMIT = 120;

export function checkRateLimit(key: string, limit = RATE_LIMIT): { allowed: boolean; retryAfter: number } {
    const now = Date.now();
    const windowStart = now - RATE_WINDOW_MS;
    const bucket = (rateBuckets.get(key) ?? []).filter((t) => t > windowStart);
    if (bucket.length >= limit) {
        const retryAfter = Math.ceil((bucket[0] + RATE_WINDOW_MS - now) / 1000);
        rateBuckets.set(key, bucket);
        return { allowed: false, retryAfter };
    }
    bucket.push(now);
    rateBuckets.set(key, bucket);
    return { allowed: true, retryAfter: 0 };
}

/** Headers that must never reach stored execution data — they carry secrets. */
const SENSITIVE_HEADERS = /^(x-webhook-secret|x-hub-signature-256|x-telegram-bot-api-secret-token|authorization|proxy-authorization|x-api-key|x-github-token|cookie|set-cookie)$/i;

/** Flat, string-only header map suitable for JSON storage. Secrets are stripped. */
export function headerMap(headers: Headers): Record<string, string> {
    const map: Record<string, string> = {};
    headers.forEach((value, key) => {
        if (SENSITIVE_HEADERS.test(key)) return;
        map[key] = value;
    });
    return map;
}

export function queryMap(url: string): Record<string, string> {
    const map: Record<string, string> = {};
    new URL(url).searchParams.forEach((value, key) => {
        map[key] = value;
    });
    return map;
}

/**
 * The canonical payload a trigger node receives — usable downstream as
 * {{body}}, {{headers}}, {{query}} and, when fields are flattened by the caller,
 * as {{field}} directly.
 */
export function webhookItem(request: Request, parsed: unknown): Record<string, unknown> {
    return {
        body: parsed,
        headers: headerMap(request.headers),
        query: queryMap(request.url),
    };
}

/** Locate the trigger node of a given type in a stored graph, or null. */
export function findTriggerNode(
    nodes: unknown,
    nodeType: string,
): { id: string; data: Record<string, unknown> } | null {
    if (!Array.isArray(nodes)) return null;
    for (const node of nodes as Array<Record<string, unknown>>) {
        const data = node?.data as Record<string, unknown> | undefined;
        if (data && (data as { nodeType?: unknown }).nodeType === nodeType) {
            return { id: String((node as { id: unknown }).id), data: data as Record<string, unknown> };
        }
    }
    return null;
}
