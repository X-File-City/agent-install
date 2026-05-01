import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname } from "node:path";

import { parseSections } from "./sections.ts";
import { resolveAgentsMdFilePath } from "./resolve-file-path.ts";
import type { AgentsMdDocument, ReadAgentsMdOptions, WriteAgentsMdOptions } from "./types.ts";

const ensureParentDir = (filePath: string): void => {
  const parent = dirname(filePath);
  if (!existsSync(parent)) mkdirSync(parent, { recursive: true });
};

export const readAgentsMd = (options: ReadAgentsMdOptions = {}): AgentsMdDocument => {
  const filePath = resolveAgentsMdFilePath(options);
  const content = existsSync(filePath) ? readFileSync(filePath, "utf-8") : "";
  const sections = parseSections(content);
  return { path: filePath, content, sections };
};

export const writeAgentsMd = (options: WriteAgentsMdOptions): string => {
  const filePath = resolveAgentsMdFilePath(options);
  ensureParentDir(filePath);
  const normalized = options.content.endsWith("\n") ? options.content : `${options.content}\n`;
  writeFileSync(filePath, normalized, "utf-8");
  return filePath;
};
