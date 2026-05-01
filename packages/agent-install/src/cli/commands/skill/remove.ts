import { rm } from "node:fs/promises";
import { homedir } from "node:os";
import { join } from "node:path";

import { Command } from "commander";
import pc from "picocolors";
import prompts from "prompts";

import {
  CANONICAL_SKILLS_DIR,
  getSkillAgentDir,
  getSkillAgentTypes,
  sanitizeName,
} from "../../../skill/index.ts";
import { toErrorMessage } from "../../../utils/to-error-message.ts";
import { logger } from "../../utils/logger.ts";
import { parseSkillAgentList } from "../../utils/parse-skill-agent-list.ts";

interface RemoveOptions {
  global?: boolean;
  agent?: string[];
  yes?: boolean;
}

export const skillRemoveCommand = new Command("remove")
  .alias("rm")
  .description("Remove installed skills")
  .argument("[skills...]", "Skills to remove (omit for interactive selection)")
  .option("-g, --global", "Remove from global scope")
  .option("-a, --agent <agents...>", "Remove from specific agents (use '*' for all)")
  .option("-y, --yes", "Skip confirmation prompts")
  .action(async (skillArgs: string[], options: RemoveOptions) => {
    try {
      const cwd = process.cwd();
      const isGlobal = Boolean(options.global);
      const agentFilter = parseSkillAgentList(options.agent) ?? getSkillAgentTypes();

      let skillNames = skillArgs;
      if (skillNames.length === 0) {
        if (options.yes || !process.stdin.isTTY) {
          logger.warn("No skill names provided");
          return;
        }
        const response = await prompts({
          type: "text",
          name: "skill",
          message: "Skill name to remove",
        });
        if (!response.skill) return;
        skillNames = [response.skill];
      }

      const canonicalBase = isGlobal
        ? join(homedir(), CANONICAL_SKILLS_DIR)
        : join(cwd, CANONICAL_SKILLS_DIR);

      for (const rawName of skillNames) {
        const sanitized = sanitizeName(rawName);
        await rm(join(canonicalBase, sanitized), { recursive: true, force: true }).catch(() => {});

        for (const agentType of agentFilter) {
          if (agentType === "universal") continue;
          const base = getSkillAgentDir(agentType, { global: isGlobal, cwd });
          await rm(join(base, sanitized), { recursive: true, force: true }).catch(() => {});
        }

        logger.success(`Removed ${pc.bold(rawName)}`);
      }
    } catch (error) {
      logger.error(toErrorMessage(error));
      process.exitCode = 1;
    }
  });
