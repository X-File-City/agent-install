export { agentsMdFiles, getAgentsMdDescriptor, listAgentsMdDescriptors } from "./known-files.ts";
export { readAgentsMd, writeAgentsMd } from "./read-write.ts";
export { removeAgentsMdSection } from "./remove-section.ts";
export { resolveAgentsMdFilePath } from "./resolve-file-path.ts";
export { findSection, parseSections, renderSection } from "./sections.ts";
export { symlinkClaudeToAgents } from "./symlink-claude.ts";
export { upsertAgentsMdSection } from "./upsert-section.ts";

export type {
  AgentsMdAgent,
  AgentsMdDocument,
  AgentsMdFileDescriptor,
  AgentsMdSection,
  ReadAgentsMdOptions,
  RemoveSectionOptions,
  SectionPlacement,
  UpsertSectionOptions,
  WriteAgentsMdOptions,
} from "./types.ts";
export type {
  SymlinkClaudeToAgentsOptions,
  SymlinkClaudeToAgentsResult,
} from "./symlink-claude.ts";
