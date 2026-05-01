import { describe, expect, it } from "vitest";

import { parseSkillSource } from "../src/skill/source-parser.ts";

describe("parseSkillSource (skill)", () => {
  it("rejects empty input", () => {
    expect(() => parseSkillSource("")).toThrow(/empty/);
    expect(() => parseSkillSource("   ")).toThrow(/empty/);
  });

  it("parses absolute and relative local paths", () => {
    expect(parseSkillSource("/abs/path").type).toBe("local");
    expect(parseSkillSource("./skills/foo").type).toBe("local");
    expect(parseSkillSource(".").type).toBe("local");
  });

  it("parses github shorthand", () => {
    expect(parseSkillSource("owner/repo")).toMatchObject({
      type: "github",
      url: "https://github.com/owner/repo.git",
    });
  });

  it("strips a trailing .git from shorthand repo names", () => {
    expect(parseSkillSource("owner/repo.git").url).toBe("https://github.com/owner/repo.git");
    expect(parseSkillSource("owner/repo.git@skill").url).toBe("https://github.com/owner/repo.git");
  });

  it("parses subpaths and fragment refs", () => {
    expect(parseSkillSource("owner/repo/skills/foo")).toMatchObject({
      type: "github",
      subpath: "skills/foo",
    });
    expect(parseSkillSource("owner/repo#feature/x")).toMatchObject({
      type: "github",
      ref: "feature/x",
    });
  });

  it("parses @skill filters", () => {
    expect(parseSkillSource("owner/repo@skill-name")).toMatchObject({
      type: "github",
      skillFilter: "skill-name",
    });
  });

  it("parses full GitHub tree URLs", () => {
    expect(parseSkillSource("https://github.com/owner/repo/tree/main/skills/foo")).toMatchObject({
      type: "github",
      url: "https://github.com/owner/repo.git",
      ref: "main",
      subpath: "skills/foo",
    });
  });

  it("recognizes direct SKILL.md URLs", () => {
    expect(parseSkillSource("https://example.com/docs/SKILL.md")).toMatchObject({
      type: "url",
      url: "https://example.com/docs/SKILL.md",
    });
  });
});
