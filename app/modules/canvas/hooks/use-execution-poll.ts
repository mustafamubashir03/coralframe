"use client";

import { useEffect, useState } from "react";
import type { NodeExecutionOverlay } from "./use-execution";

export type PollStatus = "idle" | "running" | "success" | "error";

type SnapshotResponse = {
    executionId: string | null;
    status: "RUNNING" | "SUCCESS" | "ERROR" | "WAITING" | null;
    steps?: { nodeId: string; status: string; error?: string }[];
};

const TERMINAL = new Set(["SUCCESS", "ERROR"]);

/**
 * Fallback for when Inngest realtime is unreachable (dev without the socket,
 * missing keys, proxy-blocked websockets). While enabled, polls the execution
 * snapshot and merges it into the same overlay the realtime path writes.
 * Stops on terminal status; pauses automatically while realtime is open.
 */
export function useExecutionPoll({
    executionId,
    workflowId,
    enabled,
    setOverlay,
}: {
    executionId: string | null;
    workflowId: string;
    enabled: boolean;
    setOverlay: React.Dispatch<React.SetStateAction<NodeExecutionOverlay>>;
}): PollStatus {
    const [status, setStatus] = useState<PollStatus>("idle");

    useEffect(() => {
        if (!enabled || !executionId) return;

        let cancelled = false;
        let timer: number | undefined;

        const tick = async () => {
            if (cancelled) return;
            try {
                const res = await fetch(
                    `/api/workflow/${workflowId}/execution-snapshot?executionId=${encodeURIComponent(executionId)}`,
                );
                if (!res.ok) {
                    timer = window.setTimeout(tick, 2500);
                    return;
                }
                const snap = (await res.json()) as SnapshotResponse;
                const next: NodeExecutionOverlay = {};
                for (const step of snap.steps ?? []) {
                    const normalized = step.status?.toLowerCase();
                    if (normalized === "running" || normalized === "success" || normalized === "error") {
                        next[step.nodeId] = { status: normalized, errorMessage: step.error };
                    }
                }
                setOverlay((current) => ({ ...current, ...next }));
                if (snap.status && TERMINAL.has(snap.status)) {
                    setStatus(snap.status === "SUCCESS" ? "success" : "error");
                    return; // done — stop polling
                }
                setStatus("running");
                timer = window.setTimeout(tick, 1200);
            } catch {
                // Network hiccup — keep trying quietly.
                timer = window.setTimeout(tick, 2500);
            }
        };

        tick();
        return () => {
            cancelled = true;
            if (timer) window.clearTimeout(timer);
        };
    }, [enabled, executionId, workflowId, setOverlay]);

    return status;
}
