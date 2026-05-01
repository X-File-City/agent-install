import { toErrorMessage } from "../../../utils/to-error-message.ts";
import { symlinkClaudeToAgents } from "../../../agents-md/index.ts";
import { Command } from "commander";
import pc from "picocolors";

import { logger } from "../../utils/logger.ts";

interface DocSymlinkClaudeOptions {
  overwrite?: boolean;
  backup?: string;
}

export const docSymlinkClaudeCommand = new Command("symlink-claude")
  .description("Create a CLAUDE.md → AGENTS.md symlink (migration helper)")
  .option("--overwrite", "Replace an existing CLAUDE.md (backs it up first)")
  .option("--backup <name>", "Backup filename if overwriting (default: CLAUDE.md.bak)")
  .action(async (options: DocSymlinkClaudeOptions) => {
    try {
      const result = await symlinkClaudeToAgents({
        cwd: process.cwd(),
        overwrite: Boolean(options.overwrite),
        backupName: options.backup,
      });

      if (result.alreadyLinked) {
        logger.info(`CLAUDE.md already points to AGENTS.md`);
        return;
      }

      if (result.created) {
        const suffix = result.backedUpTo
          ? ` (backed up existing to ${pc.dim(result.backedUpTo)})`
          : "";
        logger.success(`Linked ${pc.cyan(result.claudePath)} → AGENTS.md${suffix}`);
        return;
      }

      logger.warn(
        `CLAUDE.md already exists at ${pc.cyan(result.claudePath)}. Pass --overwrite to replace it.`,
      );
      process.exitCode = 1;
    } catch (error) {
      logger.error(toErrorMessage(error));
      process.exitCode = 1;
    }
  });
