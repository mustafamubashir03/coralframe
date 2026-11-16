import { interpolate } from "@/app/modules/engine/lib/template";
import { resolveConfigSecret } from "@/lib/credentials";
import type { ExecutorArgs, ExecutorResult } from "./index";

const TIMEOUT_MS = 15_000;

function parseRepo(raw: string): { owner: string; repo: string } {
    const value = raw.trim().replace(/^https:\/\/github\.com\//, "").replace(/\.git$/, "").replace(/\/$/, "");
    const parts = value.split("/");
    if (parts.length !== 2 || !parts[0] || !parts[1]) {
        throw new Error(`GitHub Create Issue: repository must be "owner/name", got "${raw}".`);
    }
    return { owner: parts[0], repo: parts[1] };
}

/**
 * GitHub Create Issue — POST https://api.github.com/repos/{owner}/{repo}/issues
 * Requires a token with issues:write on the repository.
 */
export async function githubCreateIssue({ node, item, userId }: ExecutorArgs): Promise<ExecutorResult> {
    const config = node.data.config ?? {};
    const token = await resolveConfigSecret(userId, config, "token");
    if (!token) {
        throw new Error("GitHub Create Issue: access token is required — configure a credential or an inline token on the node.");
    }
    const { owner, repo } = parseRepo(interpolate(String(config.repo ?? ""), item));
    const title = interpolate(String(config.title ?? ""), item).trim();
    if (!title) {
        throw new Error("GitHub Create Issue: title is empty — set it on the node (e.g. {{title}}).");
    }
    const body = interpolate(String(config.body ?? ""), item);

    let response: Response;
    try {
        response = await fetch(`https://api.github.com/repos/${owner}/${repo}/issues`, {
            method: "POST",
            headers: {
                authorization: `Bearer ${token}`,
                accept: "application/vnd.github+json",
                "x-github-api-version": "2022-11-28",
                "content-type": "application/json",
            },
            body: JSON.stringify({ title, body: body || undefined }),
            signal: AbortSignal.timeout(TIMEOUT_MS),
        });
    } catch (error) {
        const detail = error instanceof Error ? error.message : String(error);
        throw new Error(`GitHub Create Issue: request failed — ${detail}`);
    }

    const payload = (await response.json().catch(() => null)) as { number?: number; html_url?: string; state?: string; message?: string } | null;
    if (!response.ok) {
        throw new Error(`GitHub Create Issue: ${response.status} — ${payload?.message ?? "request rejected by GitHub"}`);
    }

    const output = {
        number: payload?.number,
        html_url: payload?.html_url,
        state: payload?.state,
        repo: `${owner}/${repo}`,
    };
    return { item: { ...item, ...output }, output };
}
