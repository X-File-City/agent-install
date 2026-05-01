import { Command } from "commander";
import pc from "picocolors";
import prompts from "prompts";

import {
  cleanupTempDir,
  cloneRepo,
  detectInstalledSkillAgents,
  discoverSkills,
  fetchSkillManifestFromUrl,
  filterSkillsByName,
  getUniversalSkillAgents,
  installSkillsFromSource,
  isSkillAgentType,
  parseSkillSource,
  skillAgents,
  type InstallMode,
  type SkillAgentType,
} from "../../../skill/index.ts";
import { toErrorMessage } from "../../../utils/to-error-message.ts";
import { formatAgentList } from "../../utils/format-agent-list.ts";
import { logger } from "../../utils/logger.ts";
import { parseSkillAgentList } from "../../utils/parse-skill-agent-list.ts";

interface AddOptions {
  agent?: string[];
  skill?: string[];
  global?: boolean;
  copy?: boolean;
  yes?: boolean;
  list?: boolean;
}

const resolveSkillFilter = (input: string[] | undefined): string[] | undefined => {
  if (!input || input.length === 0) return undefined;
  if (input.includes("*")) return undefined;
  return input;
};

const resolveTargetAgentsForPrompt = async (
  requested: SkillAgentType[] | undefined,
  yes: boolean,
): Promise<SkillAgentType[]> => {
  if (requested) return requested;
  const installed = await detectInstalledSkillAgents();
  const fallback = installed.length > 0 ? installed : getUniversalSkillAgents();

  if (yes || !process.stdin.isTTY) return fallback;

  const response = await prompts({
    type: "multiselect",
    name: "agents",
    message: "Install to which agents?",
    choices: Object.values(skillAgents).map((agent) => ({
      title: agent.displayName,
      value: agent.name,
      selected: fallback.includes(agent.name),
    })),
    min: 1,
  });

  const rawSelected = response.agents;
  if (!Array.isArray(rawSelected) || rawSelected.length === 0) {
    logger.warn("No agents selected, using detected defaults");
    return fallback;
  }
  const selected = rawSelected.filter(
    (value): value is SkillAgentType => typeof value === "string" && isSkillAgentType(value),
  );
  return selected.length > 0 ? selected : fallback;
};

const listSkillsInSource = async (source: string): Promise<void> => {
  const parsed = parseSkillSource(source);

  let basePath = "";
  let subpath: string | undefined;
  let cleanup: (() => Promise<void>) | undefined;

  try {
    if (parsed.type === "local") {
      basePath = parsed.localPath ?? parsed.url;
    } else if (parsed.type === "url") {
      basePath = await fetchSkillManifestFromUrl(parsed.url);
      cleanup = () => cleanupTempDir(basePath);
    } else {
      basePath = await cloneRepo(parsed.url, parsed.ref);
      subpath = parsed.subpath;
      cleanup = () => cleanupTempDir(basePath);
    }

    const skills = await discoverSkills(basePath, subpath);
    const visible = parsed.skillFilter ? filterSkillsByName(skills, [parsed.skillFilter]) : skills;

    if (visible.length === 0) {
      logger.warn("No SKILL.md files found in source");
      return;
    }

    logger.info(`Found ${visible.length} skill${visible.length === 1 ? "" : "s"}`);
    for (const skill of visible) {
      console.log(`  ${pc.bold(skill.name)} ${pc.dim("-")} ${skill.description}`);
    }
  } finally {
    await cleanup?.().catch(() => {});
  }
};

export const skillAddCommand = new Command("add")
  .description("Install skills from a source (local path, GitHub, or URL)")
  .argument("<source>", "Source to install skills from")
  .option("-a, --agent <agents...>", "Target specific agents (use '*' for all)")
  .option("-s, --skill <skills...>", "Install specific skills by name")
  .option("-g, --global", "Install to ~/.agents/skills instead of the project")
  .option("--copy", "Copy files instead of symlinking")
  .option("-y, --yes", "Skip all prompts")
  .option("-l, --list", "List available skills in the source without installing")
  .action(async (source: string, options: AddOptions) => {
    try {
      if (options.list) {
        await listSkillsInSource(source);
        return;
      }

      const requestedAgents = parseSkillAgentList(options.agent);
      const targetAgents = await resolveTargetAgentsForPrompt(
        requestedAgents,
        Boolean(options.yes),
      );
      const skillFilter = resolveSkillFilter(options.skill);
      const mode: InstallMode = options.copy ? "copy" : "symlink";

      logger.info(
        `Installing from ${pc.cyan(source)} to ${pc.cyan(formatAgentList(targetAgents))}`,
      );

      const result = await installSkillsFromSource({
        source,
        agents: targetAgents,
        skills: skillFilter,
        global: options.global,
        mode,
        cwd: process.cwd(),
      });

      if (result.skills.length === 0) {
        logger.warn("No SKILL.md files found in source");
        return;
      }

      for (const record of result.installed) {
        const fallbackSuffix = record.symlinkFailed ? pc.dim(" (copied: symlink fallback)") : "";
        logger.success(
          `${pc.bold(record.skill)} → ${pc.cyan(record.agent)}${fallbackSuffix} ${pc.dim(record.path)}`,
        );
      }

      for (const record of result.failed) {
        logger.error(`${pc.bold(record.skill)} → ${pc.cyan(record.agent)}: ${record.error}`);
      }

      if (result.failed.length > 0) process.exitCode = 1;
    } catch (error) {
      logger.error(toErrorMessage(error));
      process.exitCode = 1;
    }
  });
