import { describe, expect, it } from "@voidzero-dev/vite-plus-test";

import { escapeRegex } from "../src/utils/escape-regex.ts";

describe("escapeRegex", () => {
  it("escapes literal regex metacharacters", () => {
    expect(escapeRegex(".")).toBe("\\.");
    expect(escapeRegex("*")).toBe("\\*");
    expect(escapeRegex("+")).toBe("\\+");
    expect(escapeRegex("?")).toBe("\\?");
    expect(escapeRegex("^")).toBe("\\^");
    expect(escapeRegex("$")).toBe("\\$");
    expect(escapeRegex("(")).toBe("\\(");
    expect(escapeRegex(")")).toBe("\\)");
    expect(escapeRegex("[")).toBe("\\[");
    expect(escapeRegex("]")).toBe("\\]");
    expect(escapeRegex("{")).toBe("\\{");
    expect(escapeRegex("}")).toBe("\\}");
    expect(escapeRegex("|")).toBe("\\|");
    expect(escapeRegex("\\")).toBe("\\\\");
  });

  it("leaves non-meta characters alone", () => {
    expect(escapeRegex("github.com")).toBe("github\\.com");
    expect(escapeRegex("/-/tree/")).toBe("/-/tree/");
    expect(escapeRegex("simple")).toBe("simple");
  });

  it("produces a string that is safe to embed in RegExp", () => {
    const literal = "a.b+c";
    const pattern = new RegExp(`^${escapeRegex(literal)}$`);
    expect(pattern.test("a.b+c")).toBe(true);
    expect(pattern.test("axb+c")).toBe(false);
    expect(pattern.test("a.bbc")).toBe(false);
  });
});
