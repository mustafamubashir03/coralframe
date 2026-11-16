"use client";

import React, { useEffect, useMemo } from "react";
import { useRealtime, type UseRealtimeConnectionStatus, type UseRealtimeRunStatus } from "inngest/react";
import type { NodeStatusPayload } from "@/app/modules/inngest/realtime/publish-node-status";
import { executionChannel } from "@/app/modules/inngest/realtime/channels";

type RealtimeRunStatus = UseRealtimeRunStatus;

export type NodeExecutionState = {
    status: "running" | "success" | "error";
    errorMessage?: string;
};

export type NodeExecutionOverlay = Record<string, NodeExecutionState>;

/** Map a realtime payload onto the overlay and return the next state. */
export function applyNodeStatus(
    overlay: NodeExecutionOverlay,
    payload: NodeStatusPayload,
): NodeExecutionOverlay {
    return {
        ...overlay,
        [payload.nodeId]: {
            status: payload.status,
            errorMessage: payload.error ?? overlay[payload.nodeId]?.errorMessage,
        },
    };
}

export type ExecutionConnection = {
    connectionStatus: UseRealtimeConnectionStatus;
    runStatus: RealtimeRunStatus;
};

/**
 * Subscribe to live node status for one execution via Inngest realtime.
 * When no realtime route is reachable (no dev server / keys), the merged
 * connectionStatus surfaces it and the polling fallback takes over.
 */
export function useExecutionRealtime(
    executionId: string | null,
    setOverlay: React.Dispatch<React.SetStateAction<NodeExecutionOverlay>>,
): ExecutionConnection {
    const channel = useMemo(
        () => (executionId ? executionChannel({ executionId }) : null),
        [executionId],
    );

    const realtime = useRealtime({
        enabled: !!channel,
        channel: channel ?? executionChannel({ executionId: "idle" }),
        topics: ["node-status"] as const,
        token: async () => {
            if (!executionId) throw new Error("No execution to subscribe to");
            const res = await fetch(`/api/realtime-token?executionId=${encodeURIComponent(executionId)}`);
            if (!res.ok) throw new Error("Could not connect to live run");
            return res.json();
        },
        key: executionId ?? undefined,
    });

    useEffect(() => {
        if (!executionId) return;
        for (const message of realtime.messages.delta) {
            if (message.topic !== "node-status") continue;
            const payload = message.data as NodeStatusPayload;
            setOverlay((current) => applyNodeStatus(current, payload));
        }
    }, [executionId, realtime.messages.delta, setOverlay]);

    return { connectionStatus: realtime.connectionStatus, runStatus: realtime.runStatus };
}
