export type McpAgentType =
  | "antigravity"
  | "cline"
  | "cline-cli"
  | "claude-code"
  | "claude-desktop"
  | "codex"
  | "cursor"
  | "gemini-cli"
  | "goose"
  | "github-copilot-cli"
  | "mcporter"
  | "opencode"
  | "vscode"
  | "zed";

export type McpConfigFormat = "json" | "jsonc" | "yaml" | "toml";

export type McpTransportType = "http" | "sse" | "stdio";

export type McpRemoteTransport = "http" | "sse";

export type McpSourceType = "remote" | "package" | "command";

export interface ParsedMcpSource {
  type: McpSourceType;
  value: string;
  inferredName: string;
}

export interface McpServerConfig {
  type?: McpRemoteTransport;
  url?: string;
  headers?: Record<string, string>;
  command?: string;
  args?: string[];
  env?: Record<string, string>;
}

export interface McpAgentConfig {
  name: McpAgentType;
  displayName: string;
  globalConfigPath: string;
  projectConfigPath?: string;
  configKey: string;
  projectConfigKey?: string;
  format: McpConfigFormat;
  supportedTransports: readonly McpTransportType[];
  unsupportedTransportMessage?: string;
  detectGlobalInstall: () => boolean;
  detectProjectInstall?: (cwd: string) => boolean;
  resolveConfigPath?: (options: { global: boolean; cwd: string }) => string;
  transformConfig?: (
    serverName: string,
    config: McpServerConfig,
    context: { global: boolean },
  ) => unknown;
}

export interface InstallMcpServerOptions {
  source: string;
  name?: string;
  agents?: McpAgentType[];
  global?: boolean;
  cwd?: string;
  transport?: McpRemoteTransport;
  headers?: Record<string, string>;
  env?: Record<string, string>;
}

export interface McpInstallResultForAgent {
  agent: McpAgentType;
  success: boolean;
  path: string;
  error?: string;
}

export interface InstallMcpServerResult {
  serverName: string;
  config: McpServerConfig;
  results: McpInstallResultForAgent[];
}

export interface ListedMcpServer {
  serverName: string;
  agent: McpAgentType;
  path: string;
  config: unknown;
}

export interface RemoveMcpServerOptions {
  name: string;
  agents?: McpAgentType[];
  global?: boolean;
  cwd?: string;
}

export interface RemoveMcpServerResult {
  agent: McpAgentType;
  path: string;
  removed: boolean;
  error?: string;
}
