export type NodeCategory = "trigger" | "transform" | "ai" | "action";

export type ConfigField = {
    key: string;
    label: string;
    type: "text" | "textarea" | "select";
    placeholder?: string;
    options?: string[];
};

export type NodeBrand = "telegram" | "github" | "notion" | "google-calendar";

export type NodeType = {
    type: string;
    label: string;
    description?: string;
    category: NodeCategory;
    inputs: { id: string; label?: string }[];
    outputs: { id: string; label?: string }[];
    isTrigger?: boolean;
    config: ConfigField[];
    sampleFields: string[];
    /** Accent used for the tinted icon tile and palette scanning. */
    accent: string;
    /** Render the official brand glyph (solid tile, official colours). */
    brand?: NodeBrand;
};

export const CATEGORY_ACCENT: Record<NodeCategory, string> = {
    trigger: "#EA580C",
    transform: "#7C3AED",
    ai: "#E0234E",
    action: "#0284C7",
};

export const NODE_TYPES: NodeType[] = [
    {
        type: "manual-trigger",
        accent: "#EA580C",
        label: "Manual Trigger",
        description: "Run the workflow manually with test data",
        category: "trigger",
        isTrigger: true,
        inputs: [],
        outputs: [{ id: "out", label: "Payload" }],
        config: [
            { key: "testJson", label: "Test JSON", type: "textarea", placeholder: '{"message":"hello"}' },
        ],
        sampleFields: ["message", "text", "payload"],
    },
    {
        type: "webhook-trigger",
        accent: "#0891B2",
        label: "Webhook Trigger",
        description: "Start when an HTTP request hits your webhook URL",
        category: "trigger",
        isTrigger: true,
        inputs: [],
        outputs: [{ id: "out", label: "Payload" }],
        config: [
            { key: "secret", label: "Secret header (optional)", type: "text", placeholder: "x-webhook-secret" },
            { key: "method", label: "Method", type: "select", options: ["POST", "GET", "PUT", "PATCH", "DELETE"] },
        ],
        sampleFields: ["body", "headers", "query"],
    },
    {
        type: "telegram-trigger",
        accent: "#229ED9",
        brand: "telegram",
        label: "Telegram Trigger",
        description: "Start when a Telegram message reaches your bot",
        category: "trigger",
        isTrigger: true,
        inputs: [],
        outputs: [{ id: "out", label: "Message" }],
        config: [
            { key: "botToken", label: "Bot token", type: "text", placeholder: "123456789:AA..." },
        ],
        sampleFields: ["message", "chat_id", "text"],
    },
    {
        type: "github-trigger",
        accent: "#24292F",
        brand: "github",
        label: "Github Trigger",
        description: "Start on push, PR, or issue events from Github",
        category: "trigger",
        isTrigger: true,
        inputs: [],
        outputs: [{ id: "out", label: "Event" }],
        config: [
            { key: "events", label: "Events", type: "select", options: ["push", "pull_request", "issues", "release"] },
        ],
        sampleFields: ["action", "repository", "commits", "pull_request"],
    },
    {
        type: "set-field",
        accent: "#7C3AED",
        label: "Set Fields",
        description: "Create or overwrite fields in the running payload",
        category: "transform",
        inputs: [{ id: "in" }],
        outputs: [{ id: "out" }],
        config: [
            { key: "assignments", label: "Assignments", type: "textarea", placeholder: 'field: {{message}}' },
        ],
        sampleFields: ["message", "text", "payload"],
    },
    {
        type: "if",
        accent: "#D97706",
        label: "IF",
        description: "Route to a true or false branch based on a condition",
        category: "transform",
        inputs: [{ id: "in" }],
        outputs: [
            { id: "true", label: "True" },
            { id: "false", label: "False" },
        ],
        config: [
            { key: "condition", label: "Condition", type: "text", placeholder: "{{status}} == 'ok'" },
        ],
        sampleFields: ["message", "text", "payload"],
    },
    {
        type: "switch",
        accent: "#059669",
        label: "Switch",
        description: "Route to different branches depending on an expression value",
        category: "transform",
        inputs: [{ id: "in" }],
        outputs: [{ id: "default", label: "Default" }],
        config: [
            { key: "expression", label: "Expression", type: "text", placeholder: "{{source}}" },
        ],
        sampleFields: ["message", "text", "payload"],
    },
    {
        type: "http-request",
        accent: "#0284C7",
        label: "HTTP Request",
        description: "Call any HTTP endpoint and capture the response",
        category: "action",
        inputs: [{ id: "in" }],
        outputs: [{ id: "out", label: "Response" }],
        config: [
            { key: "method", label: "Method", type: "select", options: ["GET", "POST", "PUT", "PATCH", "DELETE"] },
            { key: "url", label: "URL", type: "text", placeholder: "https://api.example.com/resource" },
            { key: "headersJson", label: "Headers (JSON)", type: "textarea", placeholder: '{"content-type":"application/json"}' },
            { key: "body", label: "Body", type: "textarea", placeholder: '{{body}}' },
        ],
        sampleFields: ["status", "body", "headers"],
    },
    {
        type: "ai",
        accent: "#E0234E",
        label: "AI",
        description: "Generate text, classifications, or structured output with an LLM",
        category: "ai",
        inputs: [{ id: "in" }],
        outputs: [{ id: "out", label: "Output" }],
        config: [
            { key: "provider", label: "Provider", type: "select", options: ["openai", "anthropic", "google"] },
            { key: "model", label: "Model", type: "text", placeholder: "gpt-4o-mini" },
            { key: "prompt", label: "Prompt", type: "textarea", placeholder: "Summarize: {{text}}" },
        ],
        sampleFields: ["output", "text", "prompt"],
    },
    {
        type: "telegram-send",
        accent: "#229ED9",
        brand: "telegram",
        label: "Telegram Send",
        description: "Send a Telegram message from your bot",
        category: "action",
        inputs: [{ id: "in" }],
        outputs: [{ id: "out" }],
        config: [
            { key: "botToken", label: "Bot token", type: "text", placeholder: "123456789:AA..." },
            { key: "chatId", label: "Chat ID", type: "text", placeholder: "{{chat_id}}" },
            { key: "text", label: "Message text", type: "textarea", placeholder: "{{message}}" },
        ],
        sampleFields: ["message_id", "text", "ok"],
    },
    {
        type: "github-create-issue",
        accent: "#24292F",
        brand: "github",
        label: "Github Create Issue",
        description: "Create an issue in a GitHub repository",
        category: "action",
        inputs: [{ id: "in" }],
        outputs: [{ id: "out", label: "Issue" }],
        config: [
            { key: "repo", label: "Repository (owner/name)", type: "text", placeholder: "octo-org/octo-repo" },
            { key: "title", label: "Title", type: "text", placeholder: "{{title}}" },
            { key: "body", label: "Body", type: "textarea", placeholder: "{{body}}" },
        ],
        sampleFields: ["number", "html_url", "state"],
    },
    {
        type: "notion-create-page",
        accent: "#111111",
        brand: "notion",
        label: "Notion Create Page",
        description: "Create a page in a Notion workspace",
        category: "action",
        inputs: [{ id: "in" }],
        outputs: [{ id: "out", label: "Page" }],
        config: [
            { key: "databaseId", label: "Database ID", type: "text", placeholder: "" },
            { key: "title", label: "Title", type: "text", placeholder: "{{title}}" },
        ],
        sampleFields: ["id", "url"],
    },
    {
        type: "google-calendar-event",
        accent: "#4285F4",
        brand: "google-calendar",
        label: "Google Calendar Event",
        description: "Create an event in Google Calendar",
        category: "action",
        inputs: [{ id: "in" }],
        outputs: [{ id: "out", label: "Event" }],
        config: [
            { key: "calendarId", label: "Calendar ID", type: "text", placeholder: "primary" },
            { key: "summary", label: "Summary", type: "text", placeholder: "{{title}}" },
            { key: "start", label: "Start", type: "text", placeholder: "{{start}}" },
        ],
        sampleFields: ["id", "htmlLink"],
    },
];

export function getNode(type: string): NodeType | undefined {
    return NODE_TYPES.find((node) => node.type === type);
}

export function getConfigField(type: string): ConfigField[] {
    return getNode(type)?.config ?? [];
}

export function getSampleFields(type: string): string[] {
    return getNode(type)?.sampleFields ?? [];
}

export const NODE_REGISTRY = NODE_TYPES;
export type NodeTypeDefinition = NodeType;
export const getNodeDefinition = getNode;
