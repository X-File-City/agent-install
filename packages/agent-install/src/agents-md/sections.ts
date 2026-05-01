import type { AgentsMdSection } from "./types.ts";

const HEADING_LINE_REGEX = /^(#{1,6})\s+(.+?)\s*$/;
const FENCE_LINE_REGEX = /^(\s{0,3})(`{3,}|~{3,})(.*)$/;

const computeLineStarts = (content: string): number[] => {
  const lineStarts: number[] = [0];
  for (let index = 0; index < content.length; index += 1) {
    if (content.charCodeAt(index) === 10) {
      lineStarts.push(index + 1);
    }
  }
  return lineStarts;
};

export const parseSections = (content: string): AgentsMdSection[] => {
  const lines = content.split(/\r?\n/);
  const lineStarts = computeLineStarts(content);
  const sections: Array<{ heading: string; level: number; start: number; headingLength: number }> =
    [];

  let activeFence: string | null = null;

  for (let lineIndex = 0; lineIndex < lines.length; lineIndex += 1) {
    const line = lines[lineIndex];

    const fenceMatch = line.match(FENCE_LINE_REGEX);
    if (fenceMatch) {
      const fenceToken = fenceMatch[2];
      if (activeFence === null) {
        activeFence = fenceToken[0];
      } else if (fenceToken[0] === activeFence && fenceToken.length >= activeFence.length) {
        activeFence = null;
      }
      continue;
    }

    if (activeFence !== null) continue;

    const headingMatch = line.match(HEADING_LINE_REGEX);
    if (!headingMatch) continue;

    sections.push({
      heading: headingMatch[2].trim(),
      level: headingMatch[1].length,
      start: lineStarts[lineIndex],
      headingLength: headingMatch[0].length,
    });
  }

  return sections.map((section, sectionIndex) => {
    const nextSection = sections[sectionIndex + 1];
    const end = nextSection ? nextSection.start : content.length;
    const body = content
      .slice(section.start + section.headingLength, end)
      .replace(/^\r?\n+/, "")
      .trimEnd();

    return {
      heading: section.heading,
      level: section.level,
      body,
      start: section.start,
      end,
    };
  });
};

const normalizeHeading = (heading: string): string => heading.trim().toLowerCase();

export const findSection = (
  sections: AgentsMdSection[],
  heading: string,
): AgentsMdSection | undefined => {
  const target = normalizeHeading(heading);
  return sections.find((section) => normalizeHeading(section.heading) === target);
};

export const renderSection = (heading: string, body: string, level = 2): string => {
  const prefix = "#".repeat(level);
  const trimmedBody = body.replace(/^\r?\n+/, "").replace(/\r?\n+$/, "");
  return `${prefix} ${heading}\n\n${trimmedBody}\n`;
};
