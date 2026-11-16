import { serve } from "inngest/next";
import { inngest } from "@/app/modules/inngest/client";
import { executeWorkflow } from "@/app/modules/inngest/functions";


export const maxDuration = 300;

export const { GET, POST, PUT } = serve({
    client: inngest,
    functions: [executeWorkflow]
})
