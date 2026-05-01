import { describe, expect, it } from "@voidzero-dev/vite-plus-test";

import { formatAgentList } from "../src/cli/utils/format-agent-list.ts";
import { parseMcpAgentList } from "../src/cli/utils/parse-mcp-agent-list.ts";
import { parseSkillAgentList } from "../src/cli/utils/parse-skill-agent-list.ts";

describe("formatAgentList", () => {
  it("joins entries with ', '", () => {
    expect(formatAgentList(["a", "b", "c"])).toBe("a, b, c");
  });

  it("returns the default label when empty", () => {
    expect(formatAgentList([])).toBe("(none)");
  });

  it("honors a custom empty label", () => {
    expect(formatAgentList([], "(none detected)")).toBe("(none detected)");
  });
});

describe("parseMcpAgentList", () => {
  it("returns undefined for missing or empty input", () => {
    expect(parseMcpAgentList(undefined)).toBeUndefined();
    expect(parseMcpAgentList([])).toBeUndefined();
  });

  it("expands '*' to every known agent", () => {
    const all = parseMcpAgentList(["*"]);
    expect(all).toBeDefined();
    expect(all!.length).toBeGreaterThan(10);
    expect(all).toContain("cursor");
    expect(all).toContain("claude-desktop");
  });

  it("resolves aliases", () => {
    expect(parseMcpAgentList(["gemini"])).toEqual(["gemini-cli"]);
    expect(parseMcpAgentList(["cline-vscode"])).toEqual(["cline"]);
    expect(parseMcpAgentList(["github-copilot"])).toEqual(["vscode"]);
  });

  it("accepts canonical agent names unchanged", () => {
    expect(parseMcpAgentList(["cursor", "claude-code"])).toEqual(["cursor", "claude-code"]);
  });

  it("rejects unknown agents", () => {
    expect(() => parseMcpAgentList(["madeup"])).toThrow(/Unknown MCP agent/);
  });
});

describe("parseSkillAgentList", () => {
  it("returns undefined for missing or empty input", () => {
    expect(parseSkillAgentList(undefined)).toBeUndefined();
    expect(parseSkillAgentList([])).toBeUndefined();
  });

  it("expands '*' to every skill agent", () => {
    const all = parseSkillAgentList(["*"]);
    expect(all).toBeDefined();
    expect(all).toContain("claude-code");
    expect(all).toContain("cursor");
    expect(all).toContain("universal");
  });

  it("accepts canonical names", () => {
    expect(parseSkillAgentList(["claude-code", "cursor"])).toEqual(["claude-code", "cursor"]);
  });

  it("rejects unknown agents", () => {
    expect(() => parseSkillAgentList(["fake-agent"])).toThrow(/Unknown agent/);
  });
});
