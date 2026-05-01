import { Command } from "commander";

import { skillAddCommand } from "./add.ts";
import { skillInitCommand } from "./init.ts";
import { skillListCommand } from "./list.ts";
import { skillRemoveCommand } from "./remove.ts";

export const skillCommand = new Command("skill")
  .description("Manage SKILL.md files")
  .addCommand(skillAddCommand)
  .addCommand(skillInitCommand)
  .addCommand(skillListCommand)
  .addCommand(skillRemoveCommand);
