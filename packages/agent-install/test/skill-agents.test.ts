import { describe, expect, it } from "@voidzero-dev/vite-plus-test";

import {
  getNonUniversalSkillAgents,
  getSkillAgentConfig,
  getSkillAgentDir,
  getSkillAgentTypes,
  getUniversalSkillAgents,
  isSkillAgentType,
  isUniversalSkillAgent,
  skillAgents,
} from "../src/skill/agents.ts";
import type { SkillAgentType } from "../src/skill/types.ts";

const ALL_AGENT_TYPES: readonly SkillAgentType[] = [
  "claude-code",
  "codex",
  "cursor",
  "droid",
  "gemini-cli",
  "github-copilot",
  "goose",
  "opencode",
  "pi",
  "windsurf",
  "roo",
  "cline",
  "kilo",
  "universal",
];

describe("skillAgents registry", () => {
  it("exposes every documented agent (including droid + pi)", () => {
    expect(getSkillAgentTypes().sort()).toEqual([...ALL_AGENT_TYPES].sort());
  });

  it("isSkillAgentType is true for every registered agent and false otherwise", () => {
    for (const agent of ALL_AGENT_TYPES) {
      expect(isSkillAgentType(agent)).toBe(true);
    }
    expect(isSkillAgentType("not-a-real-agent")).toBe(false);
    expect(isSkillAgentType("")).toBe(false);
  });

  it("droid is non-universal and writes to .factory/skills", () => {
    const config = getSkillAgentConfig("droid");
    expect(config.name).toBe("droid");
    expect(config.displayName).toBe("Factory Droid");
    expect(config.skillsDir).toBe(".factory/skills");
    expect(isUniversalSkillAgent("droid")).toBe(false);
    expect(getNonUniversalSkillAgents()).toContain("droid");
    expect(getUniversalSkillAgents()).not.toContain("droid");
  });

  it("pi is universal and shares the canonical .agents/skills location", () => {
    const config = getSkillAgentConfig("pi");
    expect(config.name).toBe("pi");
    expect(config.displayName).toBe("Pi");
    expect(config.skillsDir).toBe(".agents/skills");
    expect(isUniversalSkillAgent("pi")).toBe(true);
    expect(getUniversalSkillAgents()).toContain("pi");
    expect(getNonUniversalSkillAgents()).not.toContain("pi");
  });

  it("project-relative skill dir uses cwd for both droid and pi", () => {
    expect(getSkillAgentDir("droid", { cwd: "/tmp/proj" })).toBe("/tmp/proj/.factory/skills");
    expect(getSkillAgentDir("pi", { cwd: "/tmp/proj" })).toBe("/tmp/proj/.agents/skills");
  });

  it("global skill dir is set for both droid and pi", () => {
    expect(skillAgents.droid.globalSkillsDir).toMatch(/\.factory\/skills$/);
    expect(skillAgents.pi.globalSkillsDir).toMatch(/\.pi\/agent\/skills$/);
  });
});
