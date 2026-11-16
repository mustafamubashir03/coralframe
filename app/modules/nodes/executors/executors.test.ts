import { describe, expect, it } from "vitest";
import { ifExecutor } from "./if";
import { switchExecutor } from "./switch";
import { setField } from "./set-field";
import { triggerExecutor } from "./trigger";
import { manualTrigger } from "./manual-trigger";
import type { WorkflowNode } from "@modules/canvas/lib/types";

const mkNode = (nodeType: string, config: Record<string, string>): WorkflowNode => ({
    id: "n1",
    type: "workflow",
    position: { x: 0, y: 0 },
    data: { label: nodeType, nodeType, config, status: "idle" },
});

const args = { item: { status: 200, body: { ok: true }, message: "hello webhook" }, userId: "user1", executionId: "exec1" };

describe("ifExecutor", () => {
    it("routes true when condition holds", async () => {
        const res = await ifExecutor({ node: mkNode("if", { condition: "{{status}} == 200" }), ...args });
        expect(res.branch).toBe("true");
    });
    it("routes false otherwise", async () => {
        const res = await ifExecutor({ node: mkNode("if", { condition: "{{status}} == 404" }), ...args });
        expect(res.branch).toBe("false");
    });
    it("supports contains / !contains", async () => {
        expect((await ifExecutor({ node: mkNode("if", { condition: "{{message}} contains 'webhook'" }), ...args })).branch).toBe("true");
        expect((await ifExecutor({ node: mkNode("if", { condition: "{{message}} !contains 'webhook'" }), ...args })).branch).toBe("false");
    });
    it("throws on empty condition", async () => {
        await expect(ifExecutor({ node: mkNode("if", { condition: "" }), ...args })).rejects.toThrow(/condition/i);
    });
    it("throws on unknown operator", async () => {
        await expect(ifExecutor({ node: mkNode("if", { condition: "{{status}} ~ 200" }), ...args })).rejects.toThrow();
    });
});

describe("switchExecutor", () => {
    it("matches an exact case", async () => {
        const res = await switchExecutor({ node: mkNode("switch", { expression: "{{status}}", cases: "200\n404" }), ...args });
        expect(res.branch).toBe("200");
    });
    it("falls back to default for unknown values", async () => {
        const res = await switchExecutor({ node: mkNode("switch", { expression: "{{message}}", cases: "200\n404" }), ...args });
        expect(res.branch).toBe("default");
    });
    it("routes blank expression to error", async () => {
        await expect(switchExecutor({ node: mkNode("switch", { expression: "", cases: "a" }), ...args })).rejects.toThrow(/expression/i);
    });
});

describe("setField", () => {
    it("assigns fields and preserves upstream payload", async () => {
        const res = await setField({ node: mkNode("set-field", { assignments: "received: yes\ncode: {{status}}" }), ...args });
        expect(res.item).toMatchObject({ received: "yes", code: "200", message: "hello webhook" });
    });
    it("creates nested paths on demand", async () => {
        const res = await setField({ node: mkNode("set-field", { assignments: "a.b.c: deep" }), ...args });
        expect(res.item).toMatchObject({ a: { b: { c: "deep" } } });
    });
    it("rejects empty assignments with a clear error", async () => {
        await expect(setField({ node: mkNode("set-field", { assignments: "" }), ...args })).rejects.toThrow(/assignment/i);
    });
    it("rejects lines without separators", async () => {
        await expect(setField({ node: mkNode("set-field", { assignments: "nope" }), ...args })).rejects.toThrow(/field/i);
    });
});

describe("triggerExecutor", () => {
    it("passes the payload through unchanged", async () => {
        const res = await triggerExecutor({ node: mkNode("webhook-trigger", {}), ...args });
        expect(res.item).toBe(args.item);
    });
});

describe("manualTrigger", () => {
    it("returns parsed test JSON", async () => {
        const res = await manualTrigger({ node: mkNode("manual-trigger", { testJson: '{"hello":"world"}' }), ...args });
        expect(res.item).toEqual({ hello: "world" });
    });
    it("returns empty object for blank input", async () => {
        const res = await manualTrigger({ node: mkNode("manual-trigger", { testJson: "" }), ...args });
        expect(res.item).toEqual({});
    });
    it("rejects invalid JSON with an actionable message", async () => {
        await expect(manualTrigger({ node: mkNode("manual-trigger", { testJson: "{nope" }), ...args })).rejects.toThrow(/Test JSON/);
    });
});
