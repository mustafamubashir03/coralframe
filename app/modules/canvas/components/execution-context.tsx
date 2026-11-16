"use client";

import * as React from "react";
import { triggerWorkflow } from "@/app/modules/workflows/actions";
import {
    useExecutionRealtime,
    type NodeExecutionOverlay,
} from "@/app/modules/canvas/hooks/use-execution";
import {
    useExecutionPoll,
    type PollStatus,
} from "@/app/modules/canvas/hooks/use-execution-poll";
import type { UseRealtimeConnectionStatus } from "inngest/react";

export type { NodeExecutionOverlay, NodeExecutionState } from "@/app/modules/canvas/hooks/use-execution";

export type ExecutionRunState = "idle" | "running" | "success" | "error";

type ExecutionOverlayContextValue = {
    workflowId: string;
    executionId: string | null;
    overlay: NodeExecutionOverlay;
    realtimeStatus: UseRealtimeConnectionStatus;
    pollStatus: PollStatus;
    runState: ExecutionRunState;
    startRun: (workflowId: string) => Promise<string>;
};

const ExecutionOverlayContext = React.createContext<ExecutionOverlayContextValue | null>(null);

/**
 * Owns the state of the currently viewed run and projects it onto the canvas.
 * Realtime comes from Inngest when reachable; otherwise a DB polling fallback
 * feeds the same overlay. The overlay is ephemeral context — it never reaches
 * the persisted graph, so autosave stays quiet while a run is live.
 */
export function ExecutionOverlayProvider({
    workflowId,
    children,
}: {
    workflowId: string;
    children: React.ReactNode;
}) {
    const [executionId, setExecutionId] = React.useState<string | null>(null);
    const [overlay, setOverlay] = React.useState<NodeExecutionOverlay>({});

    const realtimeStatus = useExecutionRealtime(executionId, setOverlay);
    const pollStatus = useExecutionPoll({
        executionId,
        workflowId,
        enabled: !!executionId && realtimeStatus.connectionStatus !== "open",
        setOverlay,
    });

    // Realtime run-level events cover the socket path; the poller covers everything else.
    const runState: ExecutionRunState =
        pollStatus !== "idle"
            ? pollStatus
            : realtimeStatus.runStatus === "running"
                ? "running"
                : realtimeStatus.runStatus === "completed"
                    ? "success"
                    : realtimeStatus.runStatus === "failed" || realtimeStatus.runStatus === "cancelled"
                        ? "error"
                        : "idle";

    // Adopt the latest known run on mount (mid-run refresh, or the last outcome —
    // "where did the flow go" survives a reload).
    React.useEffect(() => {
        const controller = new AbortController();
        (async () => {
            try {
                const res = await fetch(`/api/workflow/${workflowId}/execution-snapshot`, {
                    signal: controller.signal,
                });
                if (!res.ok) return;
                const snap = (await res.json()) as {
                    executionId: string | null;
                    status: string | null;
                    steps?: { nodeId: string; status: string; error?: string }[];
                };
                if (!snap.executionId) return;
                const next: NodeExecutionOverlay = {};
                for (const step of snap.steps ?? []) {
                    const status = step.status?.toLowerCase();
                    if (status === "running" || status === "success" || status === "error") {
                        next[step.nodeId] = { status, errorMessage: step.error };
                    }
                }
                setOverlay(next);
                if (snap.status === "RUNNING") setExecutionId(snap.executionId);
            } catch {
                // Best effort — a live run shows up as soon as realtime or the poll sees it.
            }
        })();
        return () => controller.abort();
    }, [workflowId]);

    const startRun = React.useCallback(async (id: string) => {
        const created = await triggerWorkflow(id);
        setOverlay({});
        setExecutionId(created);
        return created;
    }, []);

    const value = React.useMemo<ExecutionOverlayContextValue>(
        () => ({ workflowId, executionId, overlay, realtimeStatus: realtimeStatus.connectionStatus, pollStatus, runState, startRun }),
        [workflowId, executionId, overlay, realtimeStatus, pollStatus, runState, startRun],
    );

    return (
        <ExecutionOverlayContext.Provider value={value}>
            {children}
        </ExecutionOverlayContext.Provider>
    );
}

export function useExecutionOverlay() {
    const ctx = React.useContext(ExecutionOverlayContext);
    // Outside a provider, return an inert overlay so nodes render their data.status.
    return (
        ctx ?? {
            workflowId: "",
            executionId: null,
            overlay: {},
            realtimeStatus: "idle" as const,
            pollStatus: "idle" as const,
            runState: "idle" as const,
            startRun: async () => {
                throw new Error("ExecutionOverlayProvider is missing");
            },
        }
    );
}
