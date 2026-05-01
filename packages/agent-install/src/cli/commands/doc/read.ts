import { toErrorMessage } from "../../../utils/to-error-message.ts";
import { Command } from "commander";
import pc from "picocolors";

import { readAgentsMd } from "../../../agents-md/index.ts";
import { logger } from "../../utils/logger.ts";
import { resolveAgentsMdAgent } from "./resolve-agent.ts";

interface DocReadOptions {
  agent?: string;
  file?: string;
  json?: boolean;
}

export const docReadCommand = new Command("read")
  .description("Read the current AGENTS.md (or agent-specific variant) and list its sections")
  .option("-a, --agent <agent>", "Agent variant to read (claude-code, cursor, codex, ...)")
  .option("-f, --file <file>", "Explicit file path (overrides --agent)")
  .option("--json", "Output as JSON")
  .action((options: DocReadOptions) => {
    try {
      const agent = resolveAgentsMdAgent(options.agent);
      const document = readAgentsMd({
        agent,
        file: options.file,
        cwd: process.cwd(),
      });

      if (options.json) {
        console.log(
          JSON.stringify(
            {
              path: document.path,
              sections: document.sections.map((section) => ({
                heading: section.heading,
                level: section.level,
                body: section.body,
              })),
            },
            null,
            2,
          ),
        );
        return;
      }

      if (!document.content) {
        logger.warn(`No file at ${pc.cyan(document.path)}`);
        return;
      }

      logger.info(pc.bold(document.path));
      for (const section of document.sections) {
        const prefix = "#".repeat(section.level);
        console.log(`  ${pc.dim(prefix)} ${section.heading}`);
      }
    } catch (error) {
      logger.error(toErrorMessage(error));
      process.exitCode = 1;
    }
  });
