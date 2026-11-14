"use client"

import { useCallback, useMemo } from "react"
import { useTheme } from "next-themes";

import { Background, Controls, MiniMap, ReactFlow, useReactFlow, type Connection, type EdgeTypes, type NodeTypes, type OnEdgesChange, type OnNodesChange, type OnSelectionChangeParams } from "@xyflow/react"

import "@xyflow/react/dist/style.css"
import { BaseNode } from "@modules/canvas/components/nodes/base-node"
import { WorkflowEdgeComponent } from "@modules/canvas/components/edges/workflow-edge"
import { createWorkflowNode } from "@modules/canvas/lib/create-node"
import { createWorkflowEdge } from "@modules/canvas/lib/edge-types"

import { WORKFLOW_NODE_TYPE, type WorkflowEdge, type WorkflowNode } from "@modules/canvas/lib/types"


type CanvasProps = {
    nodes: WorkflowNode[];
    edges: WorkflowEdge[];
    onNodesChange: OnNodesChange<WorkflowNode>;
    onEdgesChange: OnEdgesChange;
    setNodes: React.Dispatch<React.SetStateAction<WorkflowNode[]>>;
    setEdges: React.Dispatch<React.SetStateAction<WorkflowEdge[]>>;
    onSelectionChange: (nodeId: string | null) => void;
};


export function Canvas({ nodes, edges, onNodesChange, onEdgesChange, setNodes, setEdges, onSelectionChange }: CanvasProps) {
    const { screenToFlowPosition } = useReactFlow();
    const { resolvedTheme } = useTheme();
    const nodeTypes = useMemo<NodeTypes>(
        () => ({ [WORKFLOW_NODE_TYPE]: BaseNode }),
        [],
    )
    const edgeTypes = useMemo<EdgeTypes>(
        () => ({ workflow: WorkflowEdgeComponent }),
        []
    )
    const onConnect = useCallback((connection: Connection) => {
        setEdges((current) => [...current, createWorkflowEdge(connection)])
    }, [setEdges])
    const onDragOver = useCallback((event: React.DragEvent) => {
        event.preventDefault();
        event.dataTransfer.dropEffect = "move"
    }, [])
    const onDrop = useCallback(
        (event: React.DragEvent) => {
            event.preventDefault();
            const nodeType = event.dataTransfer.getData("application/x-coralframe-node");
            if (!nodeType) return;
            const position = screenToFlowPosition({ x: event.clientX, y: event.clientY });
            setNodes((current) => [...current, createWorkflowNode(nodeType, position)]);
        },
        [screenToFlowPosition, setNodes]
    );
    const handleSelectionChange = useCallback(
        (params: OnSelectionChangeParams) => {
            onSelectionChange(params.nodes.length === 1 ? params.nodes[0].id : null);
        },
        [onSelectionChange]
    );

    return (
        <ReactFlow nodes={nodes} edges={edges} nodeTypes={nodeTypes} edgeTypes={edgeTypes} onNodesChange={onNodesChange} onEdgesChange={onEdgesChange} onConnect={onConnect} onDrop={onDrop} onDragOver={onDragOver} onSelectionChange={handleSelectionChange} fitView fitViewOptions={{ padding: 0.45, maxZoom: 1 }} minZoom={0.3} maxZoom={1.75} deleteKeyCode="Backspace" colorMode={resolvedTheme === "dark" ? "dark" : "light"} className="h-full w-full bg-muted/20">
            <Background gap={20} size={1} />
            <Controls showInteractive={false} className="rounded-xl! border! shadow-sm!" />
            <MiniMap
                pannable
                zoomable
                nodeColor="rgba(224,35,78,0.45)"
                nodeStrokeColor="rgba(224,35,78,0.75)"
                maskColor="rgba(12,14,20,0.32)"
                style={{ width: 150, height: 104 }}
                className="hidden! sm:block! rounded-xl! border! border-border! bg-background/80!"
            />
        </ReactFlow>
    )
}