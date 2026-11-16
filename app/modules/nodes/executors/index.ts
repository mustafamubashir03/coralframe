import type { WorkflowNode } from "@modules/canvas/lib/types";
import { manualTrigger } from "./manual-trigger";
import { triggerExecutor } from "./trigger";
import { httpRequest } from "./http-request";
import { ifExecutor } from "./if";
import { switchExecutor } from "./switch";
import { setField } from "./set-field";
import { telegramSend } from "./telegram-send";
import { githubCreateIssue } from "./github-create-issue";
import { notionCreatePage } from "./notion-create-page";
import { googleCalendarEvent } from "./google-calendar-event";
import { aiExecutor } from "./ai";

/** What every executor receives: the node, the running payload, and the owner scope. */
export type ExecutorArgs = {
    node: WorkflowNode;
    /** Running payload (trigger output → downstream nodes). */
    item: Record<string, unknown>;
    executionId: string;
    /** Owner of the workspace this execution belongs to. */
    userId: string;
};

export type ExecutorResult = {
    /** Payload passed downstream; defaults to the incoming item. */
    item?: Record<string, unknown>;
    /** Edge routing key for conditional nodes ("true" / "false" / case id). */
    branch?: string;
    /** What gets stored on the ExecutionStep and streamed to subscribers. */
    output?: unknown;
};

export type NodeExecutor = (args: ExecutorArgs) => Promise<ExecutorResult>;

const executors: Record<string, NodeExecutor> = {
    "manual-trigger": manualTrigger,
    "webhook-trigger": triggerExecutor,
    "telegram-trigger": triggerExecutor,
    "github-trigger": triggerExecutor,
    "http-request": httpRequest,
    if: ifExecutor,
    switch: switchExecutor,
    "set-field": setField,
    ai: aiExecutor,
    "telegram-send": telegramSend,
    "github-create-issue": githubCreateIssue,
    "notion-create-page": notionCreatePage,
    "google-calendar-event": googleCalendarEvent,
};

/**
 * Resolve the executor for a node type and run it. Unknown node types fail the
 * step with an actionable error — silent passthroughs would hide misconfig.
 */
export async function runNode(args: ExecutorArgs): Promise<ExecutorResult> {
    const executor = executors[args.node.data.nodeType];
    if (!executor) {
        throw new Error(
            `No executor for node type "${args.node.data.nodeType}". Supported: ${Object.keys(executors).join(", ")}.`
        );
    }
    return executor(args);
}
