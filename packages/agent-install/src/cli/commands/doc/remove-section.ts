import { toErrorMessage } from "../../../utils/to-error-message.ts";
import { Command } from "commander";
import pc from "picocolors";

import { removeAgentsMdSection } from "../../../agents-md/index.ts";
import { logger } from "../../utils/logger.ts";
import { resolveAgentsMdAgent } from "./resolve-agent.ts";

interface DocRemoveSectionOptions {
  agent?: string;
  file?: string;
}

export const docRemoveSectionCommand = new Command("remove-section")
  .alias("rm-section")
  .description("Remove a section from an AGENTS.md file")
  .argument("<heading>", "Section heading to remove")
  .option("-a, --agent <agent>", "Agent variant to target")
  .option("-f, --file <file>", "Explicit file path (overrides --agent)")
  .action((heading: string, options: DocRemoveSectionOptions) => {
    try {
      const agent = resolveAgentsMdAgent(options.agent);
      const removed = removeAgentsMdSection({
        heading,
        agent,
        file: options.file,
        cwd: process.cwd(),
      });

      if (removed) {
        logger.success(`Removed ${pc.bold(heading)}`);
      } else {
        logger.warn(`Section ${pc.bold(heading)} not found`);
      }
    } catch (error) {
      logger.error(toErrorMessage(error));
      process.exitCode = 1;
    }
  });
