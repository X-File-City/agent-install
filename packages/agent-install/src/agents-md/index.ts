export { agentsMdFiles, getAgentsMdDescriptor, listAgentsMdDescriptors } from "./known-files.ts";
export {
  readAgentsMd,
  readAgentsMd as read,
  writeAgentsMd,
  writeAgentsMd as write,
} from "./read-write.ts";
export { removeAgentsMdSection, removeAgentsMdSection as removeSection } from "./remove-section.ts";
export { resolveAgentsMdFilePath } from "./resolve-file-path.ts";
export { findSection, parseSections, renderSection } from "./sections.ts";
export { symlinkClaudeToAgents, symlinkClaudeToAgents as symlinkClaude } from "./symlink-claude.ts";
export { upsertAgentsMdSection, upsertAgentsMdSection as setSection } from "./upsert-section.ts";

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
