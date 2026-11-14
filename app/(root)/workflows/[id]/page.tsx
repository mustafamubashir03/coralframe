import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getWorkflow } from "@/app/modules/workflows/actions";
import { WorkflowEditor } from "@/app/modules/workflows/components/workflow-editor";
import { WorkflowBuilder } from "@/app/modules/canvas/components/workflow-builder";

export const metadata: Metadata = {
  title: "Edit workflow",
};

// Reads the session via headers(); never prerender this route.
export const instant = false;

export default async function WorkflowEditorPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const workflow = await getWorkflow(id);

  if (!workflow) {
    notFound();
  }

  return (
    <WorkflowEditor
      workflow={{
        id: workflow.id,
        name: workflow.name,
        active: workflow.active,
      }}
    >
      <WorkflowBuilder
        workflowId={workflow.id}
        initialNodes={workflow.nodes}
        initialEdges={workflow.edges}
      />
    </WorkflowEditor>
  );
}

