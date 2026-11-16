import { describe, expect, it } from "vitest";
import { redactValue, redactJson } from "./redact";

describe("redactValue", () => {
    it("redacts common secret keys recursively", () => {
        const input = {
            name: "workflow",
            config: {
                botToken: "12345:abcdef",
                apiKey: "sk-live-9876",
                nested: [{ authorization: "Bearer abc" }],
                harmless: "keep me",
            },
        };
        const out = redactValue(input) as typeof input;
        expect(out.config.botToken).toBe("••••••••");
        expect(out.config.apiKey).toBe("••••••••");
        expect((out.config.nested as Record<string, unknown>[])[0].authorization).toBe("••••••••");
        expect(out.config.harmless).toBe("keep me");
        expect(out.name).toBe("workflow");
    });

    it("redacts secret-shaped string values anywhere", () => {
        expect(redactValue("sk-abcdefghij")).toBe("••••••••");
        expect(redactValue("Bearer abc123456789")).toBe("••••••••");
        expect(redactValue("ghp_abcdefghijkl")).toBe("••••••••");
        expect(redactValue("sk-or-abc123def456")).toBe("••••••••");
        expect(redactValue("normal value")).toBe("normal value");
    });

    it("redacts case-insensitively and with separators", () => {
        expect(redactValue({ API_KEY: "x" })).toEqual({ API_KEY: "••••••••" });
        expect(redactValue({ access_token: "x" })).toEqual({ access_token: "••••••••" });
        expect(redactValue({ ClientSecret: "x" })).toEqual({ ClientSecret: "••••••••" });
        expect(redactValue({ refreshToken: "x" })).toEqual({ refreshToken: "••••••••" });
        expect(redactValue({ webhookSecret: "x" })).toEqual({ webhookSecret: "••••••••" });
    });

    it("preserves arrays and primitives", () => {
        expect(redactValue([1, "two", true, null])).toEqual([1, "two", true, null]);
        expect(redactValue(7)).toBe(7);
        expect(redactValue(false)).toBe(false);
    });

    it("does not leak nested secrets inside arrays of objects", () => {
        const input = [{ password: "p1" }, { nested: { apiKey: "p2" } }];
        const out = redactValue(input) as Record<string, unknown>[];
        expect(out[0].password).toBe("••••••••");
        expect(out[1].nested).toEqual({ apiKey: "••••••••" });
    });
});

describe("redactJson", () => {
    it("redacts a full step output object", () => {
        const output = { status: 200, body: { token: "tok-secret-123", ok: true } };
        const out = redactJson(output) as typeof output;
        expect(out.body.token).toBe("••••••••");
        expect(out.body.ok).toBe(true);
        expect(out.status).toBe(200);
    });
});
