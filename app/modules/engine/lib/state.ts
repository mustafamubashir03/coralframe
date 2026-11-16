import { Annotation } from "@langchain/langgraph";

export type NodeRunResult = {
    status: "success" | "error";
    output?: unknown;
};

export const WorkflowState = Annotation.Root({
    // A node that returns nothing for a channel keeps the incoming value.
    item: Annotation<Record<string, unknown>>({
        reducer: (_prev, next) => next ?? _prev,
        default: () => ({}),
    }),
    branch: Annotation<string>({
        reducer: (_prev, next) => next ?? _prev,
        default: () => "",
    }),
    nodeResults: Annotation<Record<string, NodeRunResult>>({
        reducer: (prev, next) => ({ ...prev, ...next }),
        default: () => ({}),
    }),
});

export type WorkflowStateType = typeof WorkflowState.State;
