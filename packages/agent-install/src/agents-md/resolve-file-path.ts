import { isAbsolute, join } from "node:path";

import { getAgentsMdDescriptor } from "./known-files.ts";
import type { AgentsMdAgent } from "./types.ts";

export interface ResolveAgentsMdFilePathOptions {
  cwd?: string;
  agent?: AgentsMdAgent;
  file?: string;
}

export const resolveAgentsMdFilePath = (options: ResolveAgentsMdFilePathOptions): string => {
  const cwd = options.cwd ?? process.cwd();

  if (options.file) {
    return isAbsolute(options.file) ? options.file : join(cwd, options.file);
  }

  const agent = options.agent ?? "universal";
  const descriptor = getAgentsMdDescriptor(agent);
  const base = descriptor.subdirectory ? join(cwd, descriptor.subdirectory) : cwd;
  return join(base, descriptor.filename);
};
