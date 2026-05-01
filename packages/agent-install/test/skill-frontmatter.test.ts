import { describe, expect, it } from "vitest";

import { parseFrontmatter } from "../src/skill/frontmatter.ts";

describe("parseFrontmatter", () => {
  it("parses standard YAML frontmatter", () => {
    const raw = `---
name: my-skill
description: Describe it
---

# Body
`;
    const { data, content } = parseFrontmatter(raw);
    expect(data).toEqual({ name: "my-skill", description: "Describe it" });
    expect(content).toContain("# Body");
  });

  it("returns empty data when there is no frontmatter", () => {
    const raw = "# Just a heading\n\nno frontmatter here\n";
    const { data, content } = parseFrontmatter(raw);
    expect(data).toEqual({});
    expect(content).toBe(raw);
  });

  it("handles CRLF line endings", () => {
    const raw = `---\r\nname: x\r\ndescription: y\r\n---\r\n\r\n# Body\r\n`;
    const { data } = parseFrontmatter(raw);
    expect(data).toEqual({ name: "x", description: "y" });
  });

  it("preserves nested metadata objects", () => {
    const raw = `---
name: x
description: y
metadata:
  version: "1.0"
  tags:
    - react
    - testing
---

body`;
    const { data } = parseFrontmatter(raw);
    expect(data.metadata).toEqual({ version: "1.0", tags: ["react", "testing"] });
  });

  it("returns empty data when frontmatter is not an object (e.g. a YAML list)", () => {
    const raw = `---
- alpha
- beta
---

body`;
    const { data } = parseFrontmatter(raw);
    expect(data).toEqual({});
  });

  it("returns empty data for empty frontmatter block", () => {
    const raw = `---\n\n---\n\nbody`;
    const { data, content } = parseFrontmatter(raw);
    expect(data).toEqual({});
    expect(content.trim()).toBe("body");
  });

  it("does not execute JS-flavoured frontmatter (CWE-95 defense)", () => {
    const raw = `---js
module.exports = { name: "injected" }
---

body`;
    const { data } = parseFrontmatter(raw);
    expect(data).toEqual({});
  });
});
