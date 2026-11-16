import { interpolate } from "@/app/modules/engine/lib/template";
import type { ExecutorArgs, ExecutorResult } from "./index";

function setByPath(target: Record<string, unknown>, path: string, value: unknown): void {
    const segments = path.split(".").map((segment) => segment.trim()).filter(Boolean);
    if (segments.length === 0) {
        throw new Error("Set Fields: field name is missing in an assignment.");
    }
    let cursor: Record<string, unknown> = target;
    for (let i = 0; i < segments.length; i += 1) {
        const key = segments[i];
        if (i === segments.length - 1) {
            cursor[key] = value;
            return;
        }
        let next = cursor[key];
        if (next === null || typeof next !== "object" || Array.isArray(next)) {
            next = {};
            cursor[key] = next;
        }
        cursor = next as Record<string, unknown>;
    }
}

/**
 * Set Fields — applies `field: value` assignments (one per line, `#` comments
 * allowed, `{{field}}` interpolated) by writing them into the running payload.
 * Values are stored as interpolated strings; nested targets via dot paths
 * (`customer.address.city`) are created on demand.
 */
export async function setField({ node, item }: ExecutorArgs): Promise<ExecutorResult> {
    const raw = String(node.data.config?.assignments ?? "");
    const lines = raw.split("\n");
    const hasWork = lines.some((line) => line.trim() && !line.trim().startsWith("#"));
    if (!hasWork) {
        throw new Error('Set Fields: add at least one assignment, e.g. "status: {{message}}".');
    }

    const next: Record<string, unknown> = { ...item };
    for (const rawLine of lines) {
        const line = rawLine.trim();
        if (!line || line.startsWith("#")) continue;
        const match = line.match(/^([^=:]+)\s*:\s*(.*)$/);
        if (!match) {
            throw new Error(`Set Fields: couldn't parse "${line}" — expected "field: value" (e.g. status: ok).`);
        }
        const [, fieldPath, rawValue] = match;
        setByPath(next, fieldPath, interpolate(rawValue.trim(), item));
    }

    return { item: next, output: next };
}
