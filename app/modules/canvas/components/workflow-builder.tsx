"use client";

import * as React from "react";
import { ReactFlowProvider, useNodesState, useEdgesState, applyNodeChanges, applyEdgeChanges, type NodeChange, type EdgeChange } from "@xyflow/react";
import { Canvas } from "./canvas";
import { CanvasEmptyState } from "./canvas-empty-state";
import { NodePalette } from "./node-palette";
import { NodeConfigPanel } from "./node-config-panel";
import { useSaveStatus } from "./save-status-context";
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
