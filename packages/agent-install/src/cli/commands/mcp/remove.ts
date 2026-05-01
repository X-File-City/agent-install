import { Command } from "commander";
import pc from "picocolors";

import { removeMcpServer } from "../../../mcp/index.ts";
import { toErrorMessage } from "../../../utils/to-error-message.ts";
import { logger } from "../../utils/logger.ts";
import { parseMcpAgentList } from "../../utils/parse-mcp-agent-list.ts";

interface McpRemoveOptions {
  global?: boolean;
  agent?: string[];
  yes?: boolean;
}

export const mcpRemoveCommand = new Command("remove")
  .alias("rm")
  .description("Remove an MCP server from agent configs")
  .argument("<name>", "Server name")
  .option("-g, --global", "Remove from global scope")
  .option("-a, --agent <agents...>", "Filter by specific agents (use '*' for all)")
  .option("-y, --yes", "Skip confirmation prompts")
  .action((name: string, options: McpRemoveOptions) => {
    try {
      const results = removeMcpServer({
        name,
        agents: parseMcpAgentList(options.agent),
        global: Boolean(options.global),
        cwd: process.cwd(),
      });

      if (results.length === 0) {
        logger.warn(`No agent config contained ${pc.bold(name)}`);
        return;
      }

      for (const record of results) {
        if (record.removed) {
          logger.success(
            `${pc.cyan(record.agent)} removed ${pc.bold(name)} ${pc.dim(record.path)}`,
          );
        } else {
          logger.error(`${pc.cyan(record.agent)}: ${record.error ?? "not found"}`);
        }
      }
    } catch (error) {
      logger.error(toErrorMessage(error));
      process.exitCode = 1;
    }
  });
