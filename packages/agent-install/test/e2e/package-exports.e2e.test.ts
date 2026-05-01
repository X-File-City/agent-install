import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

import { DIST_PATH, PACKAGE_ROOT, ensureBuildExists } from "./helpers.ts";

interface PackageJson {
  name: string;
  bin: Record<string, string>;
  main: string;
  exports: Record<string, { types: string; import: string; require: string } | undefined>;
  files: string[];
}

const packageJson = JSON.parse(
  readFileSync(join(PACKAGE_ROOT, "package.json"), "utf-8"),
) as PackageJson;

describe("package exports", () => {
  it("has the expected name, bin, and subpath exports", () => {
    ensureBuildExists();
    expect(packageJson.name).toBe("agent-install");
    expect(packageJson.bin).toEqual({
      "agent-install": "./bin/agent-install.mjs",
    });
    expect(Object.keys(packageJson.exports)).toEqual(
      expect.arrayContaining([".", "./skill", "./mcp", "./agents-md"]),
    );
  });

  it("every subpath export resolves to a real built file", () => {
    ensureBuildExists();
    for (const [subpath, entry] of Object.entries(packageJson.exports)) {
      if (!entry) continue;
      for (const candidate of [entry.import, entry.require, entry.types]) {
        const absolute = join(PACKAGE_ROOT, candidate);
        expect(existsSync(absolute), `${subpath} -> ${candidate}`).toBe(true);
      }
    }
  });

  it("the built CLI file is present and executable-ready", () => {
    ensureBuildExists();
    const cliPath = join(DIST_PATH, "cli.js");
    expect(existsSync(cliPath)).toBe(true);
    expect(readFileSync(cliPath, "utf-8").length).toBeGreaterThan(0);
  });

  it("exposes the skill Node API via the root import", async () => {
    const mod = await import(join(DIST_PATH, "index.js"));
    expect(typeof mod.installSkillsFromSource).toBe("function");
    expect(typeof mod.parseSkillSource).toBe("function");
    expect(typeof mod.discoverSkills).toBe("function");
    expect(typeof mod.isSkillAgentType).toBe("function");
    expect(typeof mod.getSkillAgentTypes).toBe("function");
    expect(mod.skillAgents).toBeTypeOf("object");
  });

  it("exposes the MCP Node API at agent-install/mcp", async () => {
    const mod = await import(join(DIST_PATH, "mcp.js"));
    expect(typeof mod.parseMcpSource).toBe("function");
    expect(typeof mod.buildMcpServerConfig).toBe("function");
    expect(typeof mod.installMcpServer).toBe("function");
    expect(typeof mod.listInstalledMcpServers).toBe("function");
    expect(typeof mod.removeMcpServer).toBe("function");
    expect(typeof mod.getMcpAgentTypes).toBe("function");
    expect(typeof mod.resolveMcpAgentAlias).toBe("function");
    expect(mod.mcpAgents).toBeTypeOf("object");
  });

  it("exposes the AGENTS.md Node API at agent-install/agents-md", async () => {
    const mod = await import(join(DIST_PATH, "agents-md.js"));
    expect(typeof mod.readAgentsMd).toBe("function");
    expect(typeof mod.writeAgentsMd).toBe("function");
    expect(typeof mod.upsertAgentsMdSection).toBe("function");
    expect(typeof mod.removeAgentsMdSection).toBe("function");
    expect(typeof mod.symlinkClaudeToAgents).toBe("function");
    expect(typeof mod.parseSections).toBe("function");
    expect(mod.agentsMdFiles).toBeTypeOf("object");
  });

  it("`./skill` is an alias for the root export", async () => {
    const root = await import(join(DIST_PATH, "index.js"));
    const alias = await import(join(DIST_PATH, "skill.js"));
    expect(Object.keys(alias).sort()).toEqual(Object.keys(root).sort());
  });
});
