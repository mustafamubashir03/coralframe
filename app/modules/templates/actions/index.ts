"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { requireAuth } from "@/app/modules/auth/actions";
import { getTemplate } from "../lib/templates";

/**
 * Instantiate a built-in template as a new workflow for the current user and
 * redirect into the editor. Template content comes from this codebase, never
 * from the request — the id is the only user input.
 */
export async function createWorkflowFromTemplate(templateId: string) {
    const user = await requireAuth();
    const template = getTemplate(templateId);
    if (!template) {
        throw new Error("Template not found.");
    }

    const workflow = await prisma.workflow.create({
        data: {
            name: template.name,
            userId: user.id,
            nodes: template.nodes as never,
            edges: template.edges as never,
        },
    });

    revalidatePath("/");
    redirect(`/workflows/${workflow.id}`);
}
