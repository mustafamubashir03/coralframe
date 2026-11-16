"use client";

import * as React from "react";
import { ReactFlowProvider, useNodesState, useEdgesState, applyNodeChanges, applyEdgeChanges, type NodeChange, type EdgeChange } from "@xyflow/react";
import { Canvas } from "./canvas";
import { CanvasEmptyState } from "./canvas-empty-state";
import { NodePalette } from "./node-palette";
import { NodeConfigPanel } from "./node-config-panel";
import { CheckCircle2, Loader2, XCircle } from "lucide-react";
import { useSaveStatus } from "./save-status-context";
import { useExecutionOverlay } from "./execution-context";
import { parseNodes, parseEdges } from "../../canvas/lib/parse-graph";
import { createWorkflowNode } from "../../canvas/lib/create-node";
import { useAutosave } from "../../canvas/hooks/use-autosave";
import { useCallback, useEffect, useRef, useState, useSyncExternalStore } from "react";
import { useReactFlow } from "@xyflow/react";
import type { WorkflowEdge, WorkflowNode } from "../../canvas/lib/types";

const PALETTE_COLLAPSED_KEY = "coralframe:palette-collapsed";
const PALETTE_COLLAPSED_EVENT = "coralframe:palette-collapsed-change";

function subscribePaletteCollapsed(callback: () => void) {
    window.addEventListener(PALETTE_COLLAPSED_EVENT, callback);
    window.addEventListener("storage", callback);
    return () => {
        window.removeEventListener(PALETTE_COLLAPSED_EVENT, callback);
        window.removeEventListener("storage", callback);
    };
}

function getPaletteCollapsedSnapshot() {
    try {
        return window.localStorage.getItem(PALETTE_COLLAPSED_KEY) === "1";
    } catch {
        return false;
    }
}

const getPaletteCollapsedServerSnapshot = () => false;

function WorkflowBuilderInner({
    workflowId,
    initialNodes,
    initialEdges,
}: {
    workflowId: string;
    initialNodes: unknown;
    initialEdges: unknown;
}) {
    const [nodes, setNodes] = useNodesState<WorkflowNode>(parseNodes(initialNodes));
    const [edges, setEdges] = useEdgesState<WorkflowEdge>(parseEdges(initialEdges));
    const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null);
    const [panelOpen, setPanelOpen] = useState(true);
    const paletteCollapsed = useSyncExternalStore(
        subscribePaletteCollapsed,
        getPaletteCollapsedSnapshot,
        getPaletteCollapsedServerSnapshot
    );
    const { setStatus } = useSaveStatus();
    const { overlay, executionId, runState } = useExecutionOverlay();
    const doneCount = Object.values(overlay).filter((s) => s.status === "success").length;
    // Terminal chips dismiss themselves after 5s; a fresh run re-arms them — without
    // setState-in-effect (render-time adjustment instead).
    const [terminalDismissed, setTerminalDismissed] = useState(false);
    const [prevExecutionId, setPrevExecutionId] = useState(executionId);
    if (prevExecutionId !== executionId) {
        setPrevExecutionId(executionId);
        setTerminalDismissed(false);
    }
    useEffect(() => {
        if (runState !== "success" && runState !== "error") return;
        const t = window.setTimeout(() => setTerminalDismissed(true), 5000);
        return () => window.clearTimeout(t);
    }, [runState]);

    const { fitView, screenToFlowPosition } = useReactFlow<WorkflowNode>();

    useAutosave({
        nodes,
        edges,
        workflowId,
        enabled: nodes.length > 0 || edges.length > 0,
        onStatusChange: setStatus,
    });

    const onNodesChange = useCallback(
        (changes: NodeChange<WorkflowNode>[]) => setNodes((current) => applyNodeChanges(changes, current)),
        [setNodes]
    );
    const onEdgesChange = useCallback(
        (changes: EdgeChange<WorkflowEdge>[]) => setEdges((current) => applyEdgeChanges(changes, current)),
        [setEdges]
    );

    const selectedNode = nodes.find((n) => n.id === selectedNodeId) ?? null;
    const inspectorVisible = Boolean(selectedNode && panelOpen);
    const addCountRef = useRef(nodes.length);

    const addNodeAtCenter = useCallback(
        (nodeType: string) => {
            // Center of the visible canvas, not the window — accounts for rails.
            const leftRail = paletteCollapsed ? 64 : 288;
            const rightRail = inspectorVisible ? 320 : 0;
            const centerX = leftRail + (window.innerWidth - leftRail - rightRail) / 2;
            // Cascade successive drops so nodes never stack invisibly.
            const cascade = (addCountRef.current % 5) * 28;
            addCountRef.current += 1;
            const center = screenToFlowPosition({ x: centerX, y: window.innerHeight / 2 });
            setNodes((current) => [
                ...current,
                createWorkflowNode(nodeType, { x: center.x + cascade, y: center.y + cascade }),
            ]);
        },
        [screenToFlowPosition, setNodes, paletteCollapsed, inspectorVisible]
    );

    const addTrigger = useCallback(() => {
        addNodeAtCenter("manual-trigger");
    }, [addNodeAtCenter]);

    const updateNode = useCallback(
        (id: string, patch: Partial<WorkflowNode["data"]>) => {
            setNodes((current) =>
                current.map((node) =>
                    node.id === id ? { ...node, data: { ...node.data, ...patch } } : node
                )
            );
        },
        [setNodes]
    );

    const removeNode = useCallback(
        (id: string) => {
            setNodes((current) => current.filter((node) => node.id !== id));
            setEdges((current) => current.filter((edge) => edge.source !== id && edge.target !== id));
            setSelectedNodeId(null);
        },
        [setNodes, setEdges]
    );

    // Reconcile selection when nodes disappear, and (re)open the inspector
    // whenever a different node is selected — without setState inside an effect.
    const [prevSelectedId, setPrevSelectedId] = useState<string | null>(selectedNodeId);
    if (prevSelectedId !== selectedNodeId) {
        setPrevSelectedId(selectedNodeId);
        if (selectedNodeId) setPanelOpen(true);
    }

    const [prevNodesLength, setPrevNodesLength] = useState(nodes.length);
    if (prevNodesLength !== nodes.length) {
        setPrevNodesLength(nodes.length);
        if (selectedNodeId && !nodes.some((n) => n.id === selectedNodeId)) {
            setSelectedNodeId(null);
        }
    }

    const togglePaletteCollapsed = useCallback(() => {
        const next = !getPaletteCollapsedSnapshot();
        try {
            window.localStorage.setItem(PALETTE_COLLAPSED_KEY, next ? "1" : "0");
        } catch {
            /* private mode — ignore */
        }
        window.dispatchEvent(new Event(PALETTE_COLLAPSED_EVENT));
    }, []);

    useEffect(() => {
        if (nodes.length > 0) {
            const timeout = window.setTimeout(() => fitView({ padding: 0.4, maxZoom: 1, duration: 200 }), 50);
            return () => window.clearTimeout(timeout);
        }
    }, [nodes.length, fitView]);

    return (
        <div className="flex h-full w-full overflow-hidden">
            <NodePalette onAdd={addNodeAtCenter} collapsed={paletteCollapsed} onToggleCollapsed={togglePaletteCollapsed} />

            <div className="relative min-w-0 flex-1">
                <Canvas
                    nodes={nodes}
                    edges={edges}
                    onNodesChange={onNodesChange}
                    onEdgesChange={onEdgesChange}
                    setNodes={setNodes}
                    setEdges={setEdges}
                    onSelectionChange={setSelectedNodeId}
                />

                {runState === "running" && (
                    <div
                        role="status"
                        aria-live="polite"
                        className="absolute right-3 top-3 z-10 flex items-center gap-2 rounded-full border border-amber-500/30 bg-card/90 py-1.5 pl-2.5 pr-3 text-[11px] font-medium text-amber-700 shadow-sm backdrop-blur-sm dark:text-amber-400"
                    >
                        <Loader2 className="size-3.5 animate-spin" aria-hidden="true" />
                        Executing…
                        <span className="tabular-nums text-amber-600/80 dark:text-amber-500/80">{doneCount} done</span>
                    </div>
                )}
                {runState === "success" && !terminalDismissed && (
                    <div
                        role="status"
                        aria-live="polite"
                        className="absolute right-3 top-3 z-10 flex items-center gap-2 rounded-full border border-emerald-500/30 bg-card/90 py-1.5 pl-2.5 pr-3 text-[11px] font-medium text-emerald-700 shadow-sm backdrop-blur-sm dark:text-emerald-400"
                    >
                        <CheckCircle2 className="size-3.5" aria-hidden="true" />
                        Run completed
                    </div>
                )}
                {runState === "error" && !terminalDismissed && (
                    <div
                        role="alert"
                        className="absolute right-3 top-3 z-10 flex items-center gap-2 rounded-full border border-destructive/30 bg-card/90 py-1.5 pl-2.5 pr-3 text-[11px] font-medium text-destructive shadow-sm backdrop-blur-sm"
                    >
                        <XCircle className="size-3.5" aria-hidden="true" />
                        Run failed — see the red step
                    </div>
                )}

                {nodes.length === 0 && <CanvasEmptyState onAddTrigger={addTrigger} />}
            </div>

            {selectedNode && panelOpen && (
                <NodeConfigPanel
                    node={selectedNode}
                    nodes={nodes}
                    edges={edges}
                    onNodeChange={updateNode}
                    onClose={() => setPanelOpen(false)}
                    onDelete={removeNode}
                />
            )}
        </div>
    );
}

export function WorkflowBuilder(props: {
    workflowId: string;
    initialNodes: unknown;
    initialEdges: unknown;
}) {
    return (
        <ReactFlowProvider>
            <WorkflowBuilderInner {...props} />
        </ReactFlowProvider>
    );
}
