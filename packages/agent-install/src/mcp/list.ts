import { existsSync } from "node:fs";

import { getMcpAgentConfig, getMcpAgentTypes } from "./agents.ts";
import { listServersInConfigFile } from "./formats/index.ts";
import { resolveMcpConfigTarget } from "./resolve-config-target.ts";
import type { ListedMcpServer, McpAgentType } from "./types.ts";

export interface ListInstalledMcpServersOptions {
  agents?: McpAgentType[];
  global?: boolean;
  cwd?: string;
}

export const listInstalledMcpServers = (
  options: ListInstalledMcpServersOptions = {},
): ListedMcpServer[] => {
  const agentTypes = options.agents ?? getMcpAgentTypes();
  const collected: ListedMcpServer[] = [];

  for (const agentType of agentTypes) {
    const agent = getMcpAgentConfig(agentType);
    const { configPath, configKey } = resolveMcpConfigTarget(agent, options);
    if (!existsSync(configPath)) continue;

    const entries = listServersInConfigFile(configPath, agent.format, configKey);
    for (const [serverName, rawConfig] of Object.entries(entries)) {
      collected.push({ serverName, agent: agentType, path: configPath, config: rawConfig });
    }
  }

  return collected;
};
