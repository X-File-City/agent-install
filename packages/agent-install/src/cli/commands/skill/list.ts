import { existsSync } from "node:fs";
import { readdir, stat } from "node:fs/promises";
import { homedir } from "node:os";
import { basename, join } from "node:path";

import { Command } from "commander";
import pc from "picocolors";

import {
  CANONICAL_SKILLS_DIR,
  detectInstalledSkillAgents,
  discoverSkills,
  getSkillAgentDir,
  getSkillAgentTypes,
  isUniversalSkillAgent,
  skillAgents,
  type SkillAgentType,
} from "../../../skill/index.ts";
import { toErrorMessage } from "../../../utils/to-error-message.ts";
import { logger } from "../../utils/logger.ts";
import { parseSkillAgentList } from "../../utils/parse-skill-agent-list.ts";

interface ListOptions {
  global?: boolean;
  agent?: string[];
  json?: boolean;
}

interface ListEntry {
  skill: string;
  agent: SkillAgentType;
  description: string;
  path: string;
}

const isUsableEntry = async (
  entry: { isDirectory(): boolean; isSymbolicLink(): boolean },
  fullPath: string,
): Promise<boolean> => {
  if (entry.isDirectory()) return true;
  if (!entry.isSymbolicLink()) return false;
  // Symlinks need their target verified — broken or file-pointing symlinks should be skipped.
  try {
    return (await stat(fullPath)).isDirectory();
  } catch {
    return false;
  }
};

const scanSkillsInDir = async (
  baseDir: string,
  agentType: SkillAgentType,
): Promise<ListEntry[]> => {
  const entries = await readdir(baseDir, { withFileTypes: true }).catch(() => []);
  const results: ListEntry[] = [];

  for (const entry of entries) {
    const skillDir = join(baseDir, entry.name);
    if (!(await isUsableEntry(entry, skillDir))) continue;

    const skills = await discoverSkills(skillDir);
    for (const skill of skills) {
      results.push({
        skill: skill.name,
        agent: agentType,
        description: skill.description,
        path: skill.path,
      });
    }
  }

  return results;
};

const dirExists = (path: string): boolean => {
  try {
    return existsSync(path);
  } catch {
    return false;
  }
};

const getCanonicalDir = (isGlobal: boolean, cwd: string): string =>
  isGlobal ? join(homedir(), CANONICAL_SKILLS_DIR) : join(cwd, CANONICAL_SKILLS_DIR);

const collectListEntries = async (options: {
  isGlobal: boolean;
  cwd: string;
  filter?: SkillAgentType[];
}): Promise<ListEntry[]> => {
  const { isGlobal, cwd, filter } = options;
  const allEntries: ListEntry[] = [];
  const visitedDirs = new Set<string>();

  const visit = async (dir: string, agent: SkillAgentType): Promise<void> => {
    if (visitedDirs.has(dir)) return;
    visitedDirs.add(dir);
    allEntries.push(...(await scanSkillsInDir(dir, agent)));
  };

  if (filter) {
    for (const agentType of filter) {
      const baseDir = getSkillAgentDir(agentType, { global: isGlobal, cwd });
      await visit(baseDir, agentType);
    }
    return allEntries;
  }

  await visit(getCanonicalDir(isGlobal, cwd), "universal");

  const installedAgents = new Set(await detectInstalledSkillAgents());

  for (const agentType of getSkillAgentTypes()) {
    if (agentType === "universal") continue;
    if (isUniversalSkillAgent(agentType)) continue;

    const baseDir = getSkillAgentDir(agentType, { global: isGlobal, cwd });
    // Only scan a non-universal agent's dir when the agent is actually installed
    // OR has a leftover skills folder on disk (catches ghost installs after uninstall).
    if (!installedAgents.has(agentType) && !dirExists(baseDir)) continue;
    await visit(baseDir, agentType);
  }

  return allEntries;
};

export const skillListCommand = new Command("list")
  .alias("ls")
  .description("List installed skills")
  .option("-g, --global", "List global skills instead of project skills")
  .option("-a, --agent <agents...>", "Filter by specific agents")
  .option("--json", "Output as JSON")
  .action(async (options: ListOptions) => {
    try {
      const cwd = process.cwd();
      const isGlobal = Boolean(options.global);
      const filter = parseSkillAgentList(options.agent);

      const allEntries = await collectListEntries({ isGlobal, cwd, filter });

      if (options.json) {
        console.log(JSON.stringify(allEntries, null, 2));
        return;
      }

      if (allEntries.length === 0) {
        logger.warn("No installed skills found");
        return;
      }

      const bySkill = new Map<string, ListEntry[]>();
      for (const entry of allEntries) {
        const existing = bySkill.get(entry.skill) ?? [];
        existing.push(entry);
        bySkill.set(entry.skill, existing);
      }

      const formatAgent = (agent: SkillAgentType): string =>
        agent === "universal" ? "canonical" : skillAgents[agent].displayName;

      for (const [skillName, entries] of bySkill) {
        const first = entries[0];
        if (!first) continue;
        const agentLabels = Array.from(new Set(entries.map((entry) => formatAgent(entry.agent))));
        const description = first.description || basename(first.path);
        console.log(
          `  ${pc.bold(skillName)} ${pc.dim(`[${agentLabels.join(", ")}]`)}\n    ${pc.dim(description)}`,
        );
      }
    } catch (error) {
      logger.error(toErrorMessage(error));
      process.exitCode = 1;
    }
  });
