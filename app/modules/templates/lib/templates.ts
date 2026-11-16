import type { WorkflowNode, WorkflowEdge } from "@modules/canvas/lib/types";
import { WORKFLOW_NODE_TYPE } from "@modules/canvas/lib/types";
import { getNode } from "@modules/nodes/lib";

export type TemplateCategory = "github" | "ai" | "webhook" | "productivity";

export type Template = {
  id: string;
  name: string;
  summary: string;
  category: TemplateCategory;
  /** Node type used for the card icon tile. */
  iconType: string;
  /** Step keywords for card chips. */
  tags: string[];
  nodes: WorkflowNode[];
  edges: WorkflowEdge[];
};

const node = (
  id: string,
  nodeType: string,
  x: number,
  y: number,
  label: string,
  config: Record<string, string> = {},
): WorkflowNode => {
  const def = getNode(nodeType);
  return {
    id,
    type: WORKFLOW_NODE_TYPE,
    position: { x, y },
    data: {
      label: label ?? def?.label ?? nodeType,
      nodeType,
      config,
      status: "idle",
    },
  };
};

const edge = (id: string, source: string, target: string, sourceHandle?: string): WorkflowEdge => ({
  id,
  source,
  target,
  sourceHandle,
  targetHandle: "in",
  type: "workflow",
  data: sourceHandle ? { branch: sourceHandle } : {},
});

export const TEMPLATES: Template[] = [
  {
    id: "github-push-ai-telegram",
    name: "GitHub push → AI summary → Telegram",
    summary: "When code lands on a branch, an LLM reads the commit and drops a short summary into your Telegram chat.",
    category: "github",
    iconType: "github-trigger",
    tags: ["github", "llm", "telegram", "notify"],
    nodes: [
      node("t1", "github-trigger", 0, 0, "On push", { events: "push" }),
      node("t2", "ai", 300, 0, "Summarize commit", {
        provider: "openrouter",
        model: "openai/gpt-4o-mini",
        systemPrompt: "You are a concise engineering assistant. Summarize code pushes for a general audience in one or two sentences. No jargon.",
        prompt: "A push just landed on {{repository.full_name}}. Commits:\n{{commits}}\n\nWrite a short summary of what changed.",
      }),
      node("t3", "telegram-send", 620, 0, "Notify Telegram", {
        chatId: "{{chat_id}}",
        text: "Push to {{repository.full_name}}: {{response}}",
      }),
    ],
    edges: [edge("e1", "t1", "t2"), edge("e2", "t2", "t3")],
  },

  {
    id: "github-issue-ai-triage",
    name: "GitHub issue → AI triage → GitHub issue",
    summary: "New issues are read by an LLM, which posts a triage comment back on the issue thread.",
    category: "github",
    iconType: "github-trigger",
    tags: ["github", "llm", "triage", "issues"],
    nodes: [
      node("t1", "github-trigger", 0, 0, "On issue", { events: "issues" }),
      node("t2", "ai", 300, 0, "Triage the issue", {
        provider: "openrouter",
        model: "openai/gpt-4o-mini",
        systemPrompt: "You are a senior maintainer. Classify the issue (bug/feature/question), identify likely area of the codebase, and write a short, friendly triage comment.",
        prompt: "Issue in {{repository.full_name}}: {{title}}\n\n{{body}}\n\nWrite a triage comment for the author.",
      }),
      node("t3", "github-create-issue", 620, 0, "Post triage comment", {
        repo: "{{repository.full_name}}",
        title: "Re: {{title}}",
        body: "{{response}}",
      }),
    ],
    edges: [edge("e1", "t1", "t2"), edge("e2", "t2", "t3")],
  },

  {
    id: "webhook-ai-github-issue",
    name: "Webhook → AI → GitHub issue",
    summary: "An inbound webhook (form, tool, alert) is parsed by an LLM and filed as a GitHub issue with a generated title and body.",
    category: "ai",
    iconType: "webhook-trigger",
    tags: ["webhook", "llm", "github", "intake"],
    nodes: [
      node("t1", "webhook-trigger", 0, 0, "Incoming report", { method: "POST" }),
      node("t2", "ai", 300, 0, "Draft the issue", {
        provider: "openrouter",
        model: "openai/gpt-4o-mini",
        systemPrompt: "You are an engineering intake assistant. Turn messy incoming reports into clean, actionable GitHub issues.",
        prompt: "A report arrived:\n{{body}}\n\nReturn: title on first line, then the issue body.",
      }),
      node("t3", "github-create-issue", 620, 0, "Create issue", {
        repo: "octo-org/octo-repo",
        title: "{{title}}",
        body: "{{response}}",
      }),
    ],
    edges: [edge("e1", "t1", "t2"), edge("e2", "t2", "t3")],
  },

  {
    id: "webhook-ai-telegram",
    name: "Webhook → AI → Telegram",
    summary: "Any inbound event is distilled by an LLM into a short message and delivered to your Telegram chat.",
    category: "ai",
    iconType: "ai",
    tags: ["webhook", "llm", "telegram", "alerts"],
    nodes: [
      node("t1", "webhook-trigger", 0, 0, "Incoming event", { method: "POST" }),
      node("t2", "ai", 300, 0, "Write the alert", {
        provider: "openrouter",
        model: "openai/gpt-4o-mini",
        systemPrompt: "You write terse alerts for on-call engineers. One sentence, the key fact, no fluff.",
        prompt: "Event payload:\n{{body}}\n\nWrite one sentence to alert the team.",
      }),
      node("t3", "telegram-send", 620, 0, "Send alert", {
        chatId: "{{chat_id}}",
        text: "{{response}}",
      }),
    ],
    edges: [edge("e1", "t1", "t2"), edge("e2", "t2", "t3")],
  },

  {
    id: "manual-http-ai-digest",
    name: "Manual → Fetch API → AI digest",
    summary: "Run on demand: pull any JSON API, then have an LLM turn it into a short readable summary.",
    category: "ai",
    iconType: "http-request",
    tags: ["http", "llm", "digest", "scheduled"],
    nodes: [
      node("t1", "manual-trigger", 0, 0, "Run now", { testJson: '{"note":"daily digest"}' }),
      node("t2", "http-request", 280, 0, "Fetch data", {
        method: "GET",
        url: "https://jsonplaceholder.typicode.com/posts?_limit=5",
      }),
      node("t3", "ai", 560, 0, "Write the digest", {
        provider: "openrouter",
        model: "openai/gpt-4o-mini",
        systemPrompt: "You write compact digests. Group related items. Skip anything uninteresting.",
        prompt: "API response:\n{{body}}\n\nWrite a 3-5 bullet digest of what matters.",
      }),
    ],
    edges: [edge("e1", "t1", "t2"), edge("e2", "t2", "t3")],
  },

  {
    id: "webhook-notion-capture",
    name: "Webhook → Notion database",
    summary: "Capture structured data from any external form, tool, or service into a Notion database as a new page.",
    category: "productivity",
    iconType: "webhook-trigger",
    tags: ["webhook", "notion", "capture", "inbox"],
    nodes: [
      node("t1", "webhook-trigger", 0, 0, "Incoming entry", { method: "POST" }),
      node("t2", "notion-create-page", 320, 0, "Create page", {
        databaseId: "00000000000000000000000000000000",
        title: "{{title}}",
      }),
    ],
    edges: [edge("e1", "t1", "t2")],
  },

  {
    id: "github-push-notion",
    name: "GitHub push → Notion log",
    summary: "Every push to a repo creates a page in your release log database — zero-effort changelog.",
    category: "productivity",
    iconType: "github-trigger",
    tags: ["github", "notion", "changelog", "log"],
    nodes: [
      node("t1", "github-trigger", 0, 0, "On push", { events: "push" }),
      node("t2", "notion-create-page", 320, 0, "Log the push", {
        databaseId: "00000000000000000000000000000000",
        title: "{{repository.full_name}} — push",
      }),
    ],
    edges: [edge("e1", "t1", "t2")],
  },

  {
    id: "manual-ai-telegram",
    name: "Manual → AI writer → Telegram",
    summary: "One-tap AI copywriting: generate a post, announcement, or update and post it to your Telegram channel.",
    category: "productivity",
    iconType: "ai",
    tags: ["manual", "llm", "telegram", "comms"],
    nodes: [
      node("t1", "manual-trigger", 0, 0, "Write now", { testJson: '{"topic":"launch day"}' }),
      node("t2", "ai", 280, 0, "Draft the copy", {
        provider: "openrouter",
        model: "openai/gpt-4o-mini",
        systemPrompt: "You write punchy copy for broadcast channels. Short lines, plain words, one clear ask.",
        prompt: "Topic: {{topic}}\n\nWrite the copy for a short Telegram announcement.",
      }),
      node("t3", "telegram-send", 560, 0, "Post to Telegram", {
        chatId: "{{chat_id}}",
        text: "{{response}}",
      }),
    ],
    edges: [edge("e1", "t1", "t2"), edge("e2", "t2", "t3")],
  },

  {
    id: "branch-condition",
    name: "Conditional fan-out (true/false)",
    summary: "Route a webhook payload down one of two paths depending on a condition — the IF branch showcase.",
    category: "webhook",
    iconType: "if",
    tags: ["webhook", "condition", "branching", "if"],
    nodes: [
      node("t1", "webhook-trigger", 0, 0, "Payload", { method: "POST" }),
      node("t2", "if", 260, 0, "OK?", { condition: "{{status}} == 200" }),
      node("t3", "set-field", 520, -100, "Mark healthy", { assignments: "health: ok" }),
      node("t4", "set-field", 520, 110, "Mark unhealthy", { assignments: "health: broken" }),
    ],
    edges: [
      edge("e1", "t1", "t2"),
      edge("e2", "t2", "t3", "true"),
      edge("e3", "t2", "t4", "false"),
    ],
  },

  {
    id: "switch-router",
    name: "Multi-case router (Switch)",
    summary: "Fan payloads out to different branches by value — success/warning/error handling without if-else chains.",
    category: "webhook",
    iconType: "switch",
    tags: ["webhook", "switch", "routing", "cases"],
    nodes: [
      node("t1", "webhook-trigger", 0, 0, "Payload", { method: "POST" }),
      node("t2", "switch", 260, 0, "Route by status", {
        expression: "{{status}}",
        cases: "success\nwarning\nerror",
      }),
      node("t3", "set-field", 520, -140, "On success", { assignments: "route: success" }),
      node("t4", "set-field", 520, 0, "On warning", { assignments: "route: warning" }),
      node("t5", "set-field", 520, 140, "On error", { assignments: "route: error" }),
      node("t6", "set-field", 760, 140, "Escalate", { assignments: "escalate: yes" }),
      node("t7", "set-field", 520, 280, "On default", { assignments: "route: default" }),
    ],
    edges: [
      edge("e1", "t1", "t2"),
      edge("e2", "t2", "t3", "success"),
      edge("e3", "t2", "t4", "warning"),
      edge("e4", "t2", "t5", "error"),
      edge("e5", "t5", "t6"),
      edge("e6", "t2", "t7", "default"),
    ],
  },
];

export function getTemplate(id: string): Template | undefined {
    return TEMPLATES.find((template) => template.id === id);
}

/** Providers this template needs a stored credential for (best-effort, from node config). */
export function requiredProviders(template: Template): string[] {
    const nodeTypeToProvider: Record<string, string> = {
        "github-trigger": "github",
        "github-create-issue": "github",
        "telegram-trigger": "telegram",
        "telegram-send": "telegram",
        "notion-create-page": "notion",
        "google-calendar-event": "google-calendar",
    };
    const needed = new Set<string>();
    for (const node of template.nodes) {
        const direct = nodeTypeToProvider[node.data.nodeType];
        if (direct) needed.add(direct);
        if (node.data.nodeType === "ai") {
            // AI provider is taken from config (defaults to openrouter)
            const provider = String(node.data.config?.provider ?? "openrouter");
            needed.add(provider);
        }
    }
    return [...needed];
}

/** Human label for a provider key used in credential storage. */
export function providerLabel(provider: string): string {
    const labels: Record<string, string> = {
        github: "GitHub",
        telegram: "Telegram",
        notion: "Notion",
        "google-calendar": "Google Calendar",
        openrouter: "OpenRouter",
        openai: "OpenAI",
        anthropic: "Anthropic",
        google: "Google Gemini",
    };
    return labels[provider] ?? provider;
}
