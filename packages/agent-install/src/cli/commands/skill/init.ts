import { existsSync } from "node:fs";
import { mkdir, writeFile } from "node:fs/promises";
import { basename, join } from "node:path";

import { Command } from "commander";
import pc from "picocolors";

import { toErrorMessage } from "../../../utils/to-error-message.ts";
import { logger } from "../../utils/logger.ts";

const renderTemplate = (skillName: string): string => `---
name: ${skillName}
description: A brief description of what this skill does and when to use it.
---

# ${skillName}

Describe what this skill does, when the agent should use it, and the instructions
the agent should follow when activated.

## When to use

Describe the trigger conditions (e.g. "after finishing a feature", "when the user
asks about X", "before committing React code").

## Instructions

1. First step
2. Second step
3. Additional steps as needed
`;

export const skillInitCommand = new Command("init")
  .description("Create a new SKILL.md in the current directory")
  .argument("[name]", "Skill name (defaults to current directory name)")
  .action(async (nameArg: string | undefined) => {
    try {
      const cwd = process.cwd();
      const skillName = nameArg || basename(cwd);
      const hasExplicitName = nameArg !== undefined;

      const skillDir = hasExplicitName ? join(cwd, skillName) : cwd;
      const skillFile = join(skillDir, "SKILL.md");
      const displayPath = hasExplicitName ? `${skillName}/SKILL.md` : "SKILL.md";

      if (existsSync(skillFile)) {
        logger.warn(`Skill already exists at ${pc.cyan(displayPath)}`);
        return;
      }

      if (hasExplicitName) await mkdir(skillDir, { recursive: true });
      await writeFile(skillFile, renderTemplate(skillName), "utf-8");

      logger.success(`Initialized skill ${pc.bold(skillName)}`);
      console.log(`  ${pc.dim("Created:")} ${displayPath}`);
      console.log();
      console.log(pc.dim("Next steps:"));
      console.log(`  1. Edit ${pc.cyan(displayPath)} to define your skill instructions`);
      console.log(`  2. Update the ${pc.cyan("name")} and ${pc.cyan("description")} frontmatter`);
      console.log(
        `  3. Install it locally with ${pc.cyan(`agent-install skill add ./${hasExplicitName ? skillName : "."}`)}`,
      );
    } catch (error) {
      logger.error(toErrorMessage(error));
      process.exitCode = 1;
    }
  });
