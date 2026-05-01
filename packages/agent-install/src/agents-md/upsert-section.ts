import { DEFAULT_AGENTS_MD_SECTION_LEVEL } from "./constants.ts";
import { readAgentsMd, writeAgentsMd } from "./read-write.ts";
import { findSection, renderSection } from "./sections.ts";
import type { AgentsMdDocument, UpsertSectionOptions } from "./types.ts";

const appendBlock = (content: string, block: string): string => {
  if (!content.trim()) return block;
  const trimmed = content.replace(/\r?\n+$/, "");
  return `${trimmed}\n\n${block}`;
};

const prependBlock = (content: string, block: string): string => {
  if (!content.trim()) return block;
  return `${block}\n${content.replace(/^\r?\n+/, "")}`;
};

const replaceSection = (document: AgentsMdDocument, heading: string, block: string): string => {
  const target = findSection(document.sections, heading);
  if (!target) {
    return appendBlock(document.content, block);
  }
  const before = document.content.slice(0, target.start).replace(/\r?\n+$/, "");
  const after = document.content.slice(target.end).replace(/^\r?\n+/, "");

  const middle = before.length > 0 ? `${before}\n\n${block}` : block;
  return after.length > 0 ? `${middle}\n${after}` : middle;
};

export const upsertAgentsMdSection = (options: UpsertSectionOptions): string => {
  const document = readAgentsMd(options);
  const level = options.level ?? DEFAULT_AGENTS_MD_SECTION_LEVEL;
  const block = renderSection(options.heading, options.body, level);
  const placement = options.placement ?? "replace";

  let nextContent: string;
  if (placement === "append") {
    nextContent = appendBlock(document.content, block);
  } else if (placement === "prepend") {
    nextContent = prependBlock(document.content, block);
  } else {
    nextContent = replaceSection(document, options.heading, block);
  }

  return writeAgentsMd({
    cwd: options.cwd,
    agent: options.agent,
    file: options.file,
    content: nextContent,
  });
};
