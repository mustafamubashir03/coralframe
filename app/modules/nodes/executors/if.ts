import { interpolate } from "@/app/modules/engine/lib/template";
import type { ExecutorArgs, ExecutorResult } from "./index";

const OPERATORS = ["!contains", "contains", "==", "!=", ">=", "<=", ">", "<"] as const;

function stripQuotes(value: string): string {
    const trimmed = value.trim();
    if (trimmed.length >= 2) {
        const first = trimmed[0];
        const last = trimmed[trimmed.length - 1];
        if ((first === "'" && last === "'") || (first === '"' && last === '"')) {
            return trimmed.slice(1, -1);
        }
    }
    return trimmed;
}

/**
 * IF — routes to the `true` or `false` branch based on a comparison expression.
 * Expressions look like `{{field}} == 'value'` — placeholders are interpolated
 * first, then a single comparison is evaluated. No dynamic code is executed.
 */
export async function ifExecutor({ node, item }: ExecutorArgs): Promise<ExecutorResult> {
    const raw = String(node.data.config?.condition ?? "").trim();
    if (!raw) {
        throw new Error("IF: condition is empty — set one in the node config, e.g. {{status}} == 'ok'.");
    }

    const expr = interpolate(raw, item);
    const operator = OPERATORS.find((op) => expr.includes(op));
    if (!operator) {
        throw new Error(
            `IF: no supported operator in "${expr}" — use one of: ${OPERATORS.join(", ")}.`
        );
    }

    const [rawLeft, rawRight] = expr.split(operator);
    if (rawRight === undefined || !rawLeft.trim()) {
        throw new Error(`IF: could not parse "${expr}" — expected "{{field}} ${operator} value".`);
    }

    const left = stripQuotes(rawLeft);
    const right = stripQuotes(rawRight);
    const numLeft = Number(left);
    const numRight = Number(right);
    const bothNumeric =
        left !== "" && right !== "" && !Number.isNaN(numLeft) && !Number.isNaN(numRight);

    let result: boolean;
    switch (operator) {
        case "==":
            result = bothNumeric ? numLeft === numRight : left === right;
            break;
        case "!=":
            result = bothNumeric ? numLeft !== numRight : left !== right;
            break;
        case ">=":
            result = bothNumeric && numLeft >= numRight;
            break;
        case "<=":
            result = bothNumeric && numLeft <= numRight;
            break;
        case ">":
            result = bothNumeric && numLeft > numRight;
            break;
        case "<":
            result = bothNumeric && numLeft < numRight;
            break;
        case "contains":
            result = left.toLowerCase().includes(right.toLowerCase());
            break;
        case "!contains":
            result = !left.toLowerCase().includes(right.toLowerCase());
            break;
    }

    return {
        item,
        branch: result ? "true" : "false",
        output: { condition: expr, result },
    };
}
