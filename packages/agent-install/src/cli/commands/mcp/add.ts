import { Command } from "commander";
import pc from "picocolors";

import {
  detectGloballyInstalledMcpAgents,
  detectProjectInstalledMcpAgents,
  getMcpAgentTypes,
  installMcpServer,
  parseMcpSource,
  type McpAgentType,
  type McpRemoteTransport,
} from "../../../mcp/index.ts";
import { toErrorMessage } from "../../../utils/to-error-message.ts";
import { formatAgentList } from "../../utils/format-agent-list.ts";
import { logger } from "../../utils/logger.ts";
import { parseMcpAgentList } from "../../utils/parse-mcp-agent-list.ts";

interface McpAddOptions {
  agent?: string[];
  global?: boolean;
  transport?: string;
  header?: string[];
  env?: string[];
  name?: string;
  yes?: boolean;
  all?: boolean;
}

const parseKeyValueList = (
  entries: string[] | undefined,
  separator: string,
): Record<string, string> => {
  if (!entries || entries.length === 0) return {};
  const result: Record<string, string> = {};
  for (const entry of entries) {
    const splitIndex = entry.indexOf(separator);
    if (splitIndex === -1) {
      throw new Error(`Invalid entry "${entry}": expected "${separator}" separator`);
    }
    const key = entry.slice(0, splitIndex).trim();
    const value = entry.slice(splitIndex + separator.length).trim();
    if (!key) throw new Error(`Invalid entry "${entry}": empty key`);
    result[key] = value;
  }
  return result;
};

const resolveTransport = (input: string | undefined): McpRemoteTransport | undefined => {
  if (!input) return undefined;
  if (input === "http" || input === "sse") return input;
  throw new Error(`Unsupported transport "${input}" (expected: http, sse)`);
};

const detectCandidateAgents = (cwd: string, isGlobal: boolean): McpAgentType[] =>
  isGlobal ? detectGloballyInstalledMcpAgents() : detectProjectInstalledMcpAgents(cwd);

export const mcpAddCommand = new Command("add")
  .description("Add an MCP server to coding agents")
  .argument("<source>", "Remote URL, npm package, or command line")
  .option("-a, --agent <agents...>", "Target specific agents (use '*' for all)")
  .option("-g, --global", "Install to user-level config instead of project")
  .option("-t, --transport <type>", "Transport type for remote servers (http or sse)")
  .option("--header <header...>", "HTTP header (Key: Value), repeatable")
  .option("--env <env...>", "Env var for stdio servers (KEY=VALUE), repeatable")
  .option("-n, --name <name>", "Server name override")
  .option("-y, --yes", "Skip all prompts")
  .option("--all", "Install to all supported agents")
  .action((source: string, options: McpAddOptions) => {
    try {
      const parsed = parseMcpSource(source);
      const cwd = process.cwd();
      const isGlobal = Boolean(options.global);

      let agentTypes = options.all ? getMcpAgentTypes() : parseMcpAgentList(options.agent);

      if (!agentTypes) {
        const detected = detectCandidateAgents(cwd, isGlobal);
        if (detected.length === 0) {
          logger.warn(
            `No ${isGlobal ? "global" : "project"}-installed MCP agents detected. Pass ${pc.cyan("-a <agent>")} (e.g. ${pc.cyan("-a cursor")}) or ${pc.cyan("--all")} to install.`,
          );
          process.exitCode = 1;
          return;
        }
        agentTypes = detected;
        logger.info(
          `Detected ${isGlobal ? "global" : "project"} agents: ${pc.cyan(formatAgentList(detected, "(none detected)"))}`,
        );
      }

      const result = installMcpServer({
        source,
        name: options.name,
        agents: agentTypes,
        global: isGlobal,
        cwd,
        transport: resolveTransport(options.transport),
        headers: parseKeyValueList(options.header, ":"),
        env: parseKeyValueList(options.env, "="),
      });

      logger.info(
        `Installing ${pc.bold(result.serverName)} (${pc.cyan(parsed.type)}) to ${pc.cyan(String(result.results.length))} agent(s)`,
      );

      for (const record of result.results) {
        if (record.success) {
          logger.success(`${pc.cyan(record.agent)} ${pc.dim(record.path)}`);
        } else {
          logger.error(`${pc.cyan(record.agent)}: ${record.error}`);
        }
      }

      if (result.results.some((record) => !record.success)) process.exitCode = 1;
    } catch (error) {
      logger.error(toErrorMessage(error));
      process.exitCode = 1;
    }
  });
