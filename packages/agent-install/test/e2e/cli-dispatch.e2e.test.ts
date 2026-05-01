import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "@voidzero-dev/vite-plus-test";

import { PACKAGE_ROOT, runCli } from "./helpers.ts";

describe("CLI dispatch", () => {
  it("prints top-level help listing skill, mcp, agents-md groups", async () => {
    const result = await runCli(["--help"]);
    expect(result.exitCode).toBe(0);
    expect(result.stdout).toContain("agent-install");
    expect(result.stdout).toContain("Manage SKILL.md files");
    expect(result.stdout).toContain("MCP servers");
    expect(result.stdout).toContain("AGENTS.md / CLAUDE.md");
    expect(result.stdout).toMatch(/skill\s/);
    expect(result.stdout).toMatch(/mcp\s/);
    expect(result.stdout).toMatch(/agents-md/);
  });

  it("prints version from package.json", async () => {
    const pkg = JSON.parse(readFileSync(join(PACKAGE_ROOT, "package.json"), "utf-8")) as {
      version: string;
    };
    const result = await runCli(["--version"]);
    expect(result.exitCode).toBe(0);
    expect(result.stdout.trim()).toBe(pkg.version);
  });

  it("exits non-zero on unknown top-level command", async () => {
    const result = await runCli(["nonexistent-command"]);
    expect(result.exitCode).not.toBe(0);
    expect(result.stderr.length + result.stdout.length).toBeGreaterThan(0);
  });

  it("shows per-subcommand help for each of skill/mcp/agents-md", async () => {
    const subcommands = [
      {
        group: "skill",
        mustContain: ["add", "init", "list", "remove"],
      },
      {
        group: "mcp",
        mustContain: ["add", "list", "remove"],
      },
      {
        group: "agents-md",
        mustContain: ["init", "read", "set-section", "remove-section", "symlink-claude"],
      },
    ];

    for (const { group, mustContain } of subcommands) {
      const result = await runCli([group, "--help"]);
      expect(result.exitCode).toBe(0);
      for (const expected of mustContain) {
        expect(result.stdout).toContain(expected);
      }
    }
  });

  it("shows help for nested commands", async () => {
    const result = await runCli(["skill", "add", "--help"]);
    expect(result.exitCode).toBe(0);
    expect(result.stdout).toContain("--agent");
    expect(result.stdout).toContain("--skill");
    expect(result.stdout).toContain("--global");
    expect(result.stdout).toContain("--copy");
  });

  it("accepts the legacy `doc` alias for the agents-md group", async () => {
    const result = await runCli(["doc", "--help"]);
    expect(result.exitCode).toBe(0);
    expect(result.stdout).toContain("init");
    expect(result.stdout).toContain("read");
    expect(result.stdout).toContain("set-section");
  });
});
