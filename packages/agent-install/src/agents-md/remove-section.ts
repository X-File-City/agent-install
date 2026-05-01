import { readAgentsMd, writeAgentsMd } from "./read-write.ts";
import { findSection } from "./sections.ts";
import type { RemoveSectionOptions } from "./types.ts";

export const removeAgentsMdSection = (options: RemoveSectionOptions): boolean => {
  const document = readAgentsMd(options);
  const target = findSection(document.sections, options.heading);
  if (!target) return false;

  const before = document.content.slice(0, target.start).replace(/\r?\n+$/, "");
  const after = document.content.slice(target.end).replace(/^\r?\n+/, "");

  const joined =
    before.length > 0 && after.length > 0
      ? `${before}\n\n${after}`
      : before.length > 0
        ? before
        : after;

  writeAgentsMd({
    cwd: options.cwd,
    agent: options.agent,
    file: options.file,
    content: joined,
  });
  return true;
};
