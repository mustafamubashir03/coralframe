import type { ExecutorArgs, ExecutorResult } from "./index";

/**
 * Trigger executors are transparent: the payload arrives from the webhook
 * receiver (or a manual run), and the trigger simply passes it downstream.
 * Manual runs of an event trigger use whatever the run was started with.
 */
export async function triggerExecutor({ item }: ExecutorArgs): Promise<ExecutorResult> {
    return { item: item ?? {} };
}
