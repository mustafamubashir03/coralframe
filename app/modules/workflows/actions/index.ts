"use server"

import { revalidatePath } from "next/cache"
import { redirect } from "next/navigation"
import { prisma } from "@/lib/prisma"
import { requireAuth } from "../../auth/actions"
import { dispatchExecution } from "../lib/dispatch-execution"

import { redactValue } from "@/lib/redact";

export async function getWorkflows() {
    const user = await requireAuth()
    const workflows = await prisma.workflow.findMany({
        where: { userId: user.id },
        orderBy: { updatedAt: 'desc' },
        include: {
            executions: {
                orderBy: { startedAt: 'desc' },
                take: 1,
                select: { status: true, startedAt: true }
            }
        }
    })
    return workflows.map((workflow) => ({
        ...workflow,
        nodes: redactValue(workflow.nodes),
        edges: redactValue(workflow.edges),
    }))
}


export async function getWorkflow(id: string) {
    const user = await requireAuth()
    const workflow = await prisma.workflow.findFirst({
        where: { id, userId: user.id },
        include: {
            executions: {
                orderBy: { startedAt: 'desc' },
                take: 1,
                select: { status: true, startedAt: true }
            }
        }
    })
    if (!workflow) return null
    return {
        ...workflow,
        nodes: redactValue(workflow.nodes),
        edges: redactValue(workflow.edges),
    }
}

export async function createWorkflow(name = "Untitled workflow") {
    const user = await requireAuth()
    const workflow = await prisma.workflow.create({
        data: { name, userId: user.id }
    });
    revalidatePath("/")
    redirect(`/workflows/${workflow.id}`)
}

export async function renameWorkflow(id: string, name: string) {
    try {
        const user = await requireAuth()
        await prisma.workflow.updateMany({
            where: { id, userId: user.id },
            data: { name: name.trim() || "untitled workflow" }
        })
        revalidatePath('/')
        revalidatePath(`/workflows/${id}`)
        return { ok: true } as const
    } catch {
        return { ok: false, error: "Couldn't rename workflow. Please try again." } as const
    }
}

export async function deleteWorkflow(id: string) {
    const user = await requireAuth()
    await prisma.workflow.deleteMany({
        where: { id, userId: user.id }
    })
    // No revalidatePath needed: redirect('/') renders the list fresh.
    redirect('/')
}


export async function getWorkflowStats() {
    const user = await requireAuth()
    const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)
    const scope = { workflow: { userId: user.id } } as const
    const [workflowGroups, runGroups] = await Promise.all([
        prisma.workflow.groupBy({
            by: ['active'],
            where: { userId: user.id },
            _count: { _all: true },
        }),
        prisma.execution.groupBy({
            by: ['status'],
            where: { ...scope, startedAt: { gte: sevenDaysAgo } },
            _count: { _all: true },
        }),
    ])
    const total = workflowGroups.reduce((sum, row) => sum + row._count._all, 0)
    const active = workflowGroups.find((row) => row.active)?._count._all ?? 0
    const runs7d = runGroups.reduce((sum, row) => sum + row._count._all, 0)
    const failed7d = runGroups.find((row) => row.status === 'ERROR')?._count._all ?? 0
    return { total, active, runs7d, failed7d }
}

export async function saveWorkflowGraph(
    id: string,
    graph: { nodes: unknown[]; edges: unknown[] },
) {
    const user = await requireAuth()
    try {
        await prisma.workflow.updateMany({
            where: { id, userId: user.id },
            data: {
                nodes: graph.nodes as never,
                edges: graph.edges as never,
            },
        })
        return { ok: true } as const
    } catch (error) {
        console.error("Failed to save workflow graph", error)
        return { ok: false, error: "Couldn't save the workflow. Please try again." } as const
    }
}

export async function toggleActive(id: string, active: boolean) {
    try {
        const user = await requireAuth();
        await prisma.workflow.updateMany({
            where: { id, userId: user.id },
            data: { active }
        })
        revalidatePath('/')
        revalidatePath(`/workflows/${id}`)
        return { ok: true } as const
    } catch {
        return { ok: false, error: "Couldn't update workflow. Please try again." } as const
    }
}


export async function triggerWorkflow(workflowId: string) {
    const user = await requireAuth()
    const workflow = await prisma.workflow.findFirst({
        where: { id: workflowId, userId: user.id }
    })
    if (!workflow) throw new Error("Workflow not found");

    const result = await dispatchExecution(workflowId, "MANUAL")
    revalidatePath('/')
    if ("error" in result) {
        throw new Error(result.error);
    }
    return result.executionId;
}

/** List the most recent executions, with workflow names, redacted. */
export async function getExecutions(limit = 25) {
    const user = await requireAuth()
    const executions = await prisma.execution.findMany({
        where: { workflow: { userId: user.id } },
        orderBy: { startedAt: 'desc' },
        take: limit,
        select: {
            id: true,
            status: true,
            trigger: true,
            startedAt: true,
            finishedAt: true,
            retryOfId: true,
            workflow: { select: { id: true, name: true } },
        },
    })
    return executions
}

/** Load a single execution with per-step IO — redacted for display. */
export async function getExecution(id: string) {
    const user = await requireAuth()
    const execution = await prisma.execution.findFirst({
        where: { id, workflow: { userId: user.id } },
        include: {
            workflow: { select: { id: true, name: true } },
            steps: { orderBy: { startedAt: 'asc' } },
            retries: { orderBy: { startedAt: 'desc' }, select: { id: true, status: true, startedAt: true } },
        },
    })
    if (!execution) return null
    return {
        ...execution,
        data: redactValue(execution.data),
        steps: execution.steps.map((step) => ({
            ...step,
            input: redactValue(step.input ?? {}),
            output: redactValue(step.output ?? {}),
            error: redactValue(step.error ?? ""),
        })),
        retryOfId: execution.retryOfId,
        retries: execution.retries,
    }
}

/**
 * Re-run the original execution — a fresh attempt under Inngest, linked to
 * the original row. Whole-graph replay: all steps re-execute.
 */
export async function retryExecution(id: string) {
    const user = await requireAuth()
    const execution = await prisma.execution.findFirst({
        where: { id, workflow: { userId: user.id } },
    })
    if (!execution) throw new Error("Execution not found")
    const result = await dispatchExecution(
        execution.workflowId,
        execution.trigger,
        (execution.data as Record<string, unknown> | null) ?? undefined,
        execution.id,
    )
    revalidatePath('/')
    if ("error" in result) throw new Error(result.error);
    redirect(`/executions/${result.executionId}`)
}
