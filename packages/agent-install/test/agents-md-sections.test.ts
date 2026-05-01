import { describe, expect, it } from "@voidzero-dev/vite-plus-test";

import { findSection, parseSections, renderSection } from "../src/agents-md/sections.ts";

describe("parseSections", () => {
  it("returns an empty list for an empty document", () => {
    expect(parseSections("")).toEqual([]);
  });

  it("parses sequential headings at different levels", () => {
    const content = `# Title\n\nintro\n\n## One\n\nbody one\n\n### Nested\n\nnested body\n\n## Two\n\nbody two\n`;
    const sections = parseSections(content);
    expect(sections.map((section) => ({ heading: section.heading, level: section.level }))).toEqual(
      [
        { heading: "Title", level: 1 },
        { heading: "One", level: 2 },
        { heading: "Nested", level: 3 },
        { heading: "Two", level: 2 },
      ],
    );
    expect(sections[1].body).toBe("body one");
  });

  it("does not treat # inside fenced code blocks as headings", () => {
    const content = [
      "## Real Heading",
      "",
      "body",
      "",
      "```bash",
      "# not a heading",
      "## also not a heading",
      "```",
      "",
      "## Second Heading",
      "",
      "tail",
      "",
    ].join("\n");

    const sections = parseSections(content);
    expect(sections.map((section) => section.heading)).toEqual(["Real Heading", "Second Heading"]);
    expect(sections[0].body).toContain("```bash");
    expect(sections[0].body).toContain("## also not a heading");
  });

  it("handles tilde-fenced code blocks", () => {
    const content = ["## Heading", "", "~~~", "# not a heading", "~~~", "", "## Next", ""].join(
      "\n",
    );
    expect(parseSections(content).map((section) => section.heading)).toEqual(["Heading", "Next"]);
  });

  it("handles CRLF line endings", () => {
    const content = "# A\r\n\r\nbody\r\n\r\n## B\r\n\r\nmore\r\n";
    expect(parseSections(content).map((section) => section.heading)).toEqual(["A", "B"]);
  });
});

describe("findSection", () => {
  it("is case-insensitive", () => {
    const sections = parseSections("## Testing\n\nbody\n");
    expect(findSection(sections, "testing")?.heading).toBe("Testing");
  });

  it("returns undefined when missing", () => {
    const sections = parseSections("## A\n\nbody\n");
    expect(findSection(sections, "B")).toBeUndefined();
  });
});

describe("renderSection", () => {
  it("renders at the requested level", () => {
    expect(renderSection("Title", "body", 3)).toBe("### Title\n\nbody\n");
  });

  it("trims leading and trailing blank lines in the body", () => {
    expect(renderSection("T", "\n\nbody\n\n")).toBe("## T\n\nbody\n");
  });
});
