import { describe, expect, it } from "vitest";

import { parseSkillSource } from "../src/skill/source-parser.ts";

describe("parseSkillSource: SSH and git-protocol URLs", () => {
  it("treats git@host: URLs as a raw git source", () => {
    const result = parseSkillSource("git@github.com:owner/repo.git");
    expect(result.type).toBe("git");
    expect(result.url).toBe("git@github.com:owner/repo.git");
  });

  it("treats http(s)://…/repo.git URLs as a raw git source", () => {
    const result = parseSkillSource("https://gitlab.com/owner/repo.git");
    expect(result.type).toBe("git");
    expect(result.url).toBe("https://gitlab.com/owner/repo.git");
  });
});

describe("parseSkillSource: github: prefix syntax", () => {
  it("rewrites github:owner/repo to GitHub shorthand", () => {
    expect(parseSkillSource("github:owner/repo")).toMatchObject({
      type: "github",
      url: "https://github.com/owner/repo.git",
    });
  });

  it("rewrites github:owner/repo/subpath", () => {
    expect(parseSkillSource("github:owner/repo/skills/foo")).toMatchObject({
      type: "github",
      subpath: "skills/foo",
    });
  });

  it("rewrites github:owner/repo@skill-name", () => {
    expect(parseSkillSource("github:owner/repo@skill-name")).toMatchObject({
      type: "github",
      skillFilter: "skill-name",
    });
  });
});

describe("parseSkillSource: fragment refs", () => {
  it("handles URL-encoded fragments", () => {
    const result = parseSkillSource("owner/repo#feature%2Fpatch");
    expect(result).toMatchObject({ type: "github", ref: "feature/patch" });
  });

  it("handles branches that contain slashes (feature/x)", () => {
    const result = parseSkillSource("owner/repo#feature/x");
    expect(result).toMatchObject({ ref: "feature/x" });
  });

  it("parses #ref@skill combined fragment", () => {
    const result = parseSkillSource("owner/repo#main@the-skill");
    expect(result).toMatchObject({
      type: "github",
      ref: "main",
      skillFilter: "the-skill",
    });
  });
});

describe("parseSkillSource: full GitHub URLs", () => {
  it("strips trailing .git from full URLs", () => {
    expect(parseSkillSource("https://github.com/owner/repo.git")).toMatchObject({
      type: "github",
      url: "https://github.com/owner/repo.git",
    });
  });

  it("accepts tree URLs pointing at a branch only (no subpath)", () => {
    const result = parseSkillSource("https://github.com/owner/repo/tree/develop");
    expect(result).toMatchObject({ type: "github", ref: "develop" });
    expect(result.subpath).toBeUndefined();
  });

  it("correctly captures ref and subpath from a deep tree URL", () => {
    expect(
      parseSkillSource("https://github.com/owner/repo/tree/main/skills/.curated/foo"),
    ).toMatchObject({
      ref: "main",
      subpath: "skills/.curated/foo",
    });
  });
});

describe("parseSkillSource: direct SKILL.md URLs", () => {
  it("accepts SKILL.md URL with a query string", () => {
    expect(parseSkillSource("https://example.com/docs/SKILL.md?ref=main")).toMatchObject({
      type: "url",
    });
  });

  it("accepts SKILL.md URL with a hash fragment", () => {
    expect(parseSkillSource("https://example.com/docs/SKILL.md#section")).toMatchObject({
      type: "url",
    });
  });
});
