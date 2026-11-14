export function interpolate(template: string, item: Record<string, unknown>): string {
    return template.replace(/\{\{([^}]+)\}\}/g, (_match: string, path: string) => {
        let value: unknown = item;

        for (const key of path.trim().split(".")) {
            if (value !== null && typeof value === "object") {
                value = (value as Record<string, unknown>)[key];

            } else {
                return ""
            }
        }
        return value != null ? String(value) : "";
    })
}