import { existsSync } from "node:fs";
import { homedir } from "node:os";
import { join } from "node:path";

import { CANONICAL_SKILLS_DIR } from "./constants.ts";
import type { SkillAgentConfig, SkillAgentType } from "./types.ts";

const home = homedir();
const configHome = process.env.XDG_CONFIG_HOME?.trim() || join(home, ".config");
const codexHome = process.env.CODEX_HOME?.trim() || join(home, ".codex");
const claudeHome = process.env.CLAUDE_CONFIG_DIR?.trim() || join(home, ".claude");

export const skillAgents: Record<SkillAgentType, SkillAgentConfig> = {
  "claude-code": {
    name: "claude-code",
    displayName: "Claude Code",
    skillsDir: ".claude/skills",
    globalSkillsDir: join(claudeHome, "skills"),
    detectInstalled: async () => existsSync(claudeHome),
  },
  codex: {
    name: "codex",
    displayName: "Codex",
    skillsDir: CANONICAL_SKILLS_DIR,
    globalSkillsDir: join(codexHome, "skills"),
    detectInstalled: async () => existsSync(codexHome),
    isUniversal: true,
  },
  cursor: {
    name: "cursor",
    displayName: "Cursor",
    skillsDir: CANONICAL_SKILLS_DIR,
    globalSkillsDir: join(home, ".cursor/skills"),
    detectInstalled: async () => existsSync(join(home, ".cursor")),
    isUniversal: true,
  },
  droid: {
    name: "droid",
    displayName: "Factory Droid",
    skillsDir: ".factory/skills",
    globalSkillsDir: join(home, ".factory/skills"),
    detectInstalled: async () => existsSync(join(home, ".factory")),
  },
  "gemini-cli": {
    name: "gemini-cli",
    displayName: "Gemini CLI",
    skillsDir: CANONICAL_SKILLS_DIR,
    globalSkillsDir: join(home, ".gemini/skills"),
    detectInstalled: async () => existsSync(join(home, ".gemini")),
    isUniversal: true,
  },
  "github-copilot": {
    name: "github-copilot",
    displayName: "GitHub Copilot",
    skillsDir: CANONICAL_SKILLS_DIR,
    globalSkillsDir: join(home, ".copilot/skills"),
    detectInstalled: async () => existsSync(join(home, ".copilot")),
    isUniversal: true,
  },
  goose: {
    name: "goose",
    displayName: "Goose",
    skillsDir: ".goose/skills",
    globalSkillsDir: join(configHome, "goose/skills"),
    detectInstalled: async () => existsSync(join(configHome, "goose")),
  },
  opencode: {
    name: "opencode",
    displayName: "OpenCode",
    skillsDir: CANONICAL_SKILLS_DIR,
    globalSkillsDir: join(configHome, "opencode/skills"),
    detectInstalled: async () => existsSync(join(configHome, "opencode")),
    isUniversal: true,
  },
  pi: {
    name: "pi",
    displayName: "Pi",
    skillsDir: CANONICAL_SKILLS_DIR,
    globalSkillsDir: join(home, ".pi/agent/skills"),
    detectInstalled: async () => existsSync(join(home, ".pi")),
    isUniversal: true,
  },
  windsurf: {
    name: "windsurf",
    displayName: "Windsurf",
    skillsDir: ".windsurf/skills",
    globalSkillsDir: join(home, ".codeium/windsurf/skills"),
    detectInstalled: async () => existsSync(join(home, ".codeium/windsurf")),
  },
  roo: {
    name: "roo",
    displayName: "Roo Code",
    skillsDir: ".roo/skills",
    globalSkillsDir: join(home, ".roo/skills"),
    detectInstalled: async () => existsSync(join(home, ".roo")),
  },
  cline: {
    name: "cline",
    displayName: "Cline",
    skillsDir: CANONICAL_SKILLS_DIR,
    globalSkillsDir: join(home, ".agents/skills"),
    detectInstalled: async () => existsSync(join(home, ".cline")),
    isUniversal: true,
  },
  kilo: {
    name: "kilo",
    displayName: "Kilo Code",
    skillsDir: ".kilocode/skills",
    globalSkillsDir: join(home, ".kilocode/skills"),
    detectInstalled: async () => existsSync(join(home, ".kilocode")),
  },
  universal: {
    name: "universal",
    displayName: "Universal",
    skillsDir: CANONICAL_SKILLS_DIR,
    globalSkillsDir: join(home, ".agents/skills"),
    detectInstalled: async () => false,
    isUniversal: true,
  },
};

export const getSkillAgentConfig = (agentType: SkillAgentType): SkillAgentConfig =>
  skillAgents[agentType];

export const isUniversalSkillAgent = (agentType: SkillAgentType): boolean =>
  Boolean(skillAgents[agentType].isUniversal);

export const getSkillAgentDir = (
  agentType: SkillAgentType,
  options: { global?: boolean; cwd?: string } = {},
): string => {
  const agent = skillAgents[agentType];
  const isGlobal = options.global ?? false;
  if (isGlobal) return agent.globalSkillsDir ?? join(home, agent.skillsDir);
  return join(options.cwd ?? process.cwd(), agent.skillsDir);
};

const agentConfigEntries = (): Array<[SkillAgentType, SkillAgentConfig]> =>
  Object.values(skillAgents).map((config) => [config.name, config]);

export const getSkillAgentTypes = (): SkillAgentType[] =>
  agentConfigEntries().map(([name]) => name);

export const isSkillAgentType = (value: string): value is SkillAgentType => value in skillAgents;

export const getUniversalSkillAgents = (): SkillAgentType[] =>
  agentConfigEntries()
    .filter(([name, config]) => config.isUniversal && name !== "universal")
    .map(([name]) => name);

export const getNonUniversalSkillAgents = (): SkillAgentType[] =>
  agentConfigEntries()
    .filter(([, config]) => !config.isUniversal)
    .map(([name]) => name);

export const detectInstalledSkillAgents = async (): Promise<SkillAgentType[]> => {
  const entries = await Promise.all(
    Object.values(skillAgents).map(async (config) => ({
      name: config.name,
      installed: await config.detectInstalled(),
    })),
  );
  return entries.filter((entry) => entry.installed).map((entry) => entry.name);
};
