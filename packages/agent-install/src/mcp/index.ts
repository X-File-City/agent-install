export {
  detectGloballyInstalledMcpAgents,
  detectProjectInstalledMcpAgents,
  getMcpAgentConfig,
  getMcpAgentTypes,
  getMcpAgentsSupportingProjectScope,
  isMcpAgentType,
  isMcpTransportSupported,
  mcpAgentAliases,
  mcpAgents,
  resolveMcpAgentAlias,
} from "./agents.ts";
export { buildMcpServerConfig } from "./build-server-config.ts";
export { DEFAULT_REMOTE_TRANSPORT, NPX_COMMAND, NPX_DASH_Y } from "./constants.ts";
export {
  listServersInConfigFile,
  readConfigFile,
  removeServerFromConfigFile,
  writeServerToConfigFile,
} from "./formats/index.ts";
export {
  installMcpServer,
  installMcpServer as add,
  installMcpServer as install,
  resolveMcpTargetAgents,
} from "./install-mcp-server.ts";
export { installMcpServerForAgent, installMcpServerForAgents } from "./installer.ts";
export { resolveMcpConfigTarget } from "./resolve-config-target.ts";
export { listInstalledMcpServers, listInstalledMcpServers as list } from "./list.ts";
export {
  extractPackageName,
  isRemoteMcpSource,
  parseMcpSource,
  parseMcpSource as parseSource,
} from "./source-parser.ts";
export { removeMcpServer, removeMcpServer as remove, removeMcpServerFromAgent } from "./remove.ts";

export type {
  InstallMcpServerOptions,
  InstallMcpServerResult,
  ListedMcpServer,
  McpAgentConfig,
  McpAgentType,
  McpConfigFormat,
  McpInstallResultForAgent,
  McpRemoteTransport,
  McpServerConfig,
  McpSourceType,
  McpTransportType,
  ParsedMcpSource,
  RemoveMcpServerOptions,
  RemoveMcpServerResult,
} from "./types.ts";
