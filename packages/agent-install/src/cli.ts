import { Command } from "commander";

import { docCommand } from "./cli/commands/doc/index.ts";
import { mcpCommand } from "./cli/commands/mcp/index.ts";
import { skillCommand } from "./cli/commands/skill/index.ts";

const VERSION = process.env.VERSION ?? "0.0.0";

process.on("SIGINT", () => process.exit(0));
process.on("SIGTERM", () => process.exit(0));

const program = new Command()
  .name("agent-install")
  .description("Install SKILL.md files, MCP servers, and AGENTS.md guidance for any coding agent")
  .version(VERSION, "-v, --version", "display the version number");

program.addCommand(skillCommand);
program.addCommand(mcpCommand);
program.addCommand(docCommand);

const main = async (): Promise<void> => {
  await program.parseAsync();
};

main();
