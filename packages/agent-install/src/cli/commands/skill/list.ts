import { readdir } from "node:fs/promises";
import { join } from "node:path";

import { Command } from "commander";
import pc from "picocolors";

import {
  CANONICAL_SKILLS_DIR,
  discoverSkills,
  getSkillAgentDir,
  getSkillAgentTypes,
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

const collectEntries = async (
  agentType: SkillAgentType,
  isGlobal: boolean,
  cwd: string,
): Promise<ListEntry[]> => {
  const baseDir = getSkillAgentDir(agentType, { global: isGlobal, cwd });
  const entries = await readdir(baseDir, { withFileTypes: true }).catch(() => []);

  const results: ListEntry[] = [];
  for (const entry of entries) {
    if (!entry.isDirectory() && !entry.isSymbolicLink()) continue;
    const skillDir = join(baseDir, entry.name);
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

const collectCanonicalEntries = async (cwd: string): Promise<ListEntry[]> => {
  const canonicalBase = join(cwd, CANONICAL_SKILLS_DIR);
  const entries = await readdir(canonicalBase, { withFileTypes: true }).catch(() => []);

  const results: ListEntry[] = [];
  for (const entry of entries) {
    if (!entry.isDirectory() && !entry.isSymbolicLink()) continue;
    const skillDir = join(canonicalBase, entry.name);
    const skills = await discoverSkills(skillDir);
    for (const skill of skills) {
      results.push({
        skill: skill.name,
        agent: "universal",
        description: skill.description,
        path: skill.path,
      });
    }
  }
  return results;
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

      const allEntries: ListEntry[] = [];
      if (!isGlobal && !filter) {
        allEntries.push(...(await collectCanonicalEntries(cwd)));
      }

      const targetAgents = filter ?? getSkillAgentTypes();
      for (const agentType of targetAgents) {
        if (agentType === "universal") continue;
        allEntries.push(...(await collectEntries(agentType, isGlobal, cwd)));
      }

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

      for (const [skillName, entries] of bySkill) {
        const first = entries[0];
        if (!first) continue;
        const agentLabels = entries.map((entry) => entry.agent).join(", ");
        console.log(
          `  ${pc.bold(skillName)} ${pc.dim(`[${agentLabels}]`)}\n    ${pc.dim(first.description)}`,
        );
      }
    } catch (error) {
      logger.error(toErrorMessage(error));
      process.exitCode = 1;
    }
  });
