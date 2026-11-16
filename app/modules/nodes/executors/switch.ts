import { interpolate } from "@/app/modules/engine/lib/template";
import type { ExecutorArgs, ExecutorResult } from "./index";

/**
 * Switch — evaluates `expression` (interpolated) and routes to the matching
 * case branch, falling back to `default`. Cases are configured one per line;
 * matching is exact after trimming spaces.
 */
export async function switchExecutor({ node, item }: ExecutorArgs): Promise<ExecutorResult> {
    const rawExpression = String(node.data.config?.expression ?? "").trim();
    if (!rawExpression) {
        throw new Error("Switch: expression is empty — set one in the node config, e.g. {{source}}.");
    }
    const expression = interpolate(rawExpression, item).trim();

    const cases = String(node.data.config?.cases ?? "")
        .split("\n")
        .map((line) => line.trim())
        .filter(Boolean);
    const match = cases.find((entry) => entry === expression);
    const branch = match ?? "default";

    return { item, branch, output: { expression, branch } };
}
