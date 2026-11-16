import { inngest } from "../client";
import { executionChannel } from "./channels";

export type NodeStatusPayload = {
    nodeId: string;
    status: "running" | "success" | "error";
    output?: unknown;
    error?: string;
};

export async function publishNodeStatus(
    executionId: string,
    payload: NodeStatusPayload,
): Promise<void> {
    try {
        const channel = executionChannel({ executionId });
        await inngest.realtime.publish(channel["node-status"], payload);
    } catch (error) {
        // Realtime is best-effort telemetry — polling and DB are the source of truth.
        console.warn("Realtime publish failed for", executionId, error);
    }
}
