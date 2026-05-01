import { Command } from "commander";

import { docInitCommand } from "./init.ts";
import { docReadCommand } from "./read.ts";
import { docRemoveSectionCommand } from "./remove-section.ts";
import { docSetSectionCommand } from "./set-section.ts";
import { docSymlinkClaudeCommand } from "./symlink-claude.ts";

export const docCommand = new Command("doc")
  .description("Manage AGENTS.md / CLAUDE.md / GEMINI.md / Cursor rules")
  .addCommand(docInitCommand)
  .addCommand(docReadCommand)
  .addCommand(docSetSectionCommand)
  .addCommand(docRemoveSectionCommand)
  .addCommand(docSymlinkClaudeCommand);
