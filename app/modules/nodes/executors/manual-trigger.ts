import type { ExecutorArgs, ExecutorResult } from "./index";

/**
 * Manual Trigger — the payload source for a hand-run workflow.
 * `testJson` config: valid JSON becomes the trigger output; blank passes `{}`;
 * anything else fails the step with a clear message.
 */
export async function manualTrigger({ node }: ExecutorArgs): Promise<ExecutorResult> {
    const raw = String(node.data.config?.testJson ?? "").trim();

    if (!raw) {
        return { item: {}, output: {} };
    }

    try {
        const parsed = JSON.parse(raw) as unknown;
        if (parsed === null || typeof parsed !== "object" || Array.isArray(parsed)) {
            throw new Error("expected a JSON object");
        }
        const item = parsed as Record<string, unknown>;
        return { item, output: item };
    } catch (error) {
        const detail = error instanceof Error ? error.message : String(error);
        throw new Error(
            `Manual Trigger: Test JSON is not valid — ${detail}. Fix the node config and run again.`
        );
    }
}
