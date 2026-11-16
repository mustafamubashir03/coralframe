/**
 * Recursive secret redaction for anything headed to the frontend, logs, or
 * stored execution records. Key-based is the primary defense; a couple of
 * well-known token shapes are caught by value as well.
 */

const REDACTED = "••••••••";
const MAX_DEPTH = 12;

const SENSITIVE_KEY =
    /(secret|token|password|passwd|api[-_]?key|authorization|proxy-authorization|credential|bot[-_]?token|client[-_]?secret|access[-_]?token|refresh[-_]?token|id[-_]?token|private[-_]?key|webhook[-_]?secret|hub[-_]?signature)/i;

const SENSITIVE_VALUE =
    /^(Bearer\s+\S{8,}|sk-[A-Za-z0-9_\-]{8,}|xox[baprs]-[A-Za-z0-9-]{8,}|ghp_[A-Za-z0-9]{8,}|gho_[A-Za-z0-9]{8,}|ghs_[A-Za-z0-9]{8,}|ghu_[A-Za-z0-9]{8,}|github_pat_[A-Za-z0-9_]{8,}|sk-or-[A-Za-z0-9_\-]{8,}|AIza[A-Za-z0-9_\-]{8,})/;

function isPlainObject(value: unknown): value is Record<string, unknown> {
    return typeof value === "object" && value !== null && !Array.isArray(value);
}

export function redactValue<T = unknown>(value: T, depth = 0): T {
    if (depth > MAX_DEPTH) return REDACTED as unknown as T;
    if (typeof value === "string") {
        return (SENSITIVE_VALUE.test(value.trim()) ? REDACTED : value) as unknown as T;
    }
    if (Array.isArray(value)) {
        return value.map((entry) => redactValue(entry, depth + 1)) as unknown as T;
    }
    if (isPlainObject(value)) {
        const next: Record<string, unknown> = {};
        for (const [key, entry] of Object.entries(value)) {
            if (SENSITIVE_KEY.test(key)) {
                next[key] = entry == null ? entry : REDACTED;
            } else {
                next[key] = redactValue(entry, depth + 1);
            }
        }
        return next as T;
    }
    return value;
}

/** Apply redaction to a DB node/edge JSON graph payload (for retrieval). */
export function redactGraph(nodes: unknown, edges: unknown) {
    return { nodes: redactValue(nodes), edges: redactValue(edges) };
}

/** Redact a single step's input/output for display. */
export function redactJson<T = unknown>(value: T): T {
    return redactValue(value);
}
