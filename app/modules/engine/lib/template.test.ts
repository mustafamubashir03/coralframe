import { describe, expect, it } from "vitest";
import { interpolate } from "./template";

describe("interpolate", () => {
    it("resolves top-level fields", () => {
        expect(interpolate("Hello {{name}}", { name: "Ada" })).toBe("Hello Ada");
    });

    it("resolves nested dot paths", () => {
        expect(interpolate("{{body.user.email}}", { body: { user: { email: "a@b.c" } } })).toBe("a@b.c");
    });

    it("resolves array indices", () => {
        expect(interpolate("{{items.0}}", { items: ["first", "second"] })).toBe("first");
        expect(interpolate("{{items.1}}", { items: ["first", "second"] })).toBe("second");
    });

    it("leaves missing paths empty", () => {
        expect(interpolate("[{{missing}}]", {})).toBe("[]");
    });

    it("handles surrounding whitespace in placeholders", () => {
        expect(interpolate("{{  name  }}", { name: "x" })).toBe("x");
    });
});
