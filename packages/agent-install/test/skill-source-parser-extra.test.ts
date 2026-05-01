import { describe, expect, it } from "@voidzero-dev/vite-plus-test";

import { parseSkillSource } from "../src/skill/source-parser.ts";

describe("parseSkillSource: SSH URLs", () => {
  it("recognizes git@github.com SSH URLs as github sources, preserving the clone URL", () => {
    const result = parseSkillSource("git@github.com:owner/repo.git");
    expect(result.type).toBe("github");
    expect(result.url).toBe("git@github.com:owner/repo.git");
  });

  it("recognizes git@gitlab.com SSH URLs as gitlab sources, preserving the clone URL", () => {
    const result = parseSkillSource("git@gitlab.com:owner/repo.git");
    expect(result.type).toBe("gitlab");
    expect(result.url).toBe("git@gitlab.com:owner/repo.git");
  });

  it("falls back to type 'git' for SSH URLs to other hosts", () => {
    const result = parseSkillSource("git@bitbucket.org:owner/repo.git");
    expect(result.type).toBe("git");
    expect(result.url).toBe("git@bitbucket.org:owner/repo.git");
  });

  it("supports fragment ref and skill filter on SSH URLs", () => {
    const result = parseSkillSource("git@github.com:owner/repo.git#main@the-skill");
    expect(result).toMatchObject({
      type: "github",
      url: "git@github.com:owner/repo.git",
      ref: "main",
      skillFilter: "the-skill",
    });
  });
});

describe("parseSkillSource: gitlab sources", () => {
  it("parses a full GitLab repo URL", () => {
    expect(parseSkillSource("https://gitlab.com/owner/repo")).toMatchObject({
      type: "gitlab",
      url: "https://gitlab.com/owner/repo.git",
    });
  });

  it("parses a GitLab tree URL with ref and subpath", () => {
    expect(parseSkillSource("https://gitlab.com/owner/repo/-/tree/main/skills/foo")).toMatchObject({
      type: "gitlab",
      url: "https://gitlab.com/owner/repo.git",
      ref: "main",
      subpath: "skills/foo",
    });
  });

  it("parses a GitLab tree URL with only a ref", () => {
    expect(parseSkillSource("https://gitlab.com/owner/repo/-/tree/develop")).toMatchObject({
      type: "gitlab",
      url: "https://gitlab.com/owner/repo.git",
      ref: "develop",
    });
  });

  it("parses gitlab: shorthand prefix", () => {
    expect(parseSkillSource("gitlab:owner/repo")).toMatchObject({
      type: "gitlab",
      url: "https://gitlab.com/owner/repo.git",
    });
    expect(parseSkillSource("gitlab:owner/repo/skills/foo")).toMatchObject({
      type: "gitlab",
      subpath: "skills/foo",
    });
    expect(parseSkillSource("gitlab:owner/repo@my-skill")).toMatchObject({
      type: "gitlab",
      skillFilter: "my-skill",
    });
  });

  it("strips trailing .git from a GitLab repo URL", () => {
    expect(parseSkillSource("https://gitlab.com/owner/repo.git")).toMatchObject({
      type: "gitlab",
      url: "https://gitlab.com/owner/repo.git",
    });
  });
});

describe("parseSkillSource: hostname spoofing protection", () => {
  it("treats a lookalike domain like example-github.com as well-known (not github)", () => {
    const result = parseSkillSource("https://example-github.com/owner/repo");
    expect(result.type).toBe("well-known");
    expect(result.url).toBe("https://example-github.com/owner/repo");
  });

  it("treats my-github.com/owner/repo/tree/main as well-known (not github)", () => {
    const result = parseSkillSource("https://my-github.com/owner/repo/tree/main");
    expect(result.type).toBe("well-known");
  });

  it("treats github.com.evil.com as well-known (not github)", () => {
    const result = parseSkillSource("https://github.com.evil.com/owner/repo");
    expect(result.type).toBe("well-known");
    expect(result.url).toBe("https://github.com.evil.com/owner/repo");
  });

  it("treats a lookalike domain like fake-gitlab.com as well-known (not gitlab)", () => {
    const result = parseSkillSource("https://fake-gitlab.com/owner/repo");
    expect(result.type).toBe("well-known");
  });
});

describe("parseSkillSource: GitHub URL leniency vs. GitLab strictness", () => {
  it("extracts owner/repo from a GitHub file URL (lenient)", () => {
    expect(parseSkillSource("https://github.com/owner/repo/blob/main/file.md")).toMatchObject({
      type: "github",
      url: "https://github.com/owner/repo.git",
    });
  });

  it("extracts owner/repo from a GitHub issue URL (lenient)", () => {
    expect(parseSkillSource("https://github.com/owner/repo/issues/123")).toMatchObject({
      type: "github",
      url: "https://github.com/owner/repo.git",
    });
  });

  it("does NOT mis-parse a GitLab subgroup URL as owner/repo (strict)", () => {
    const result = parseSkillSource("https://gitlab.com/group/subgroup/project");
    expect(result.type).toBe("git");
    expect(result.url).toBe("https://gitlab.com/group/subgroup/project");
  });
});

describe("parseSkillSource: arbitrary git remotes", () => {
  it("falls back to type 'git' for an unknown https git URL", () => {
    const result = parseSkillSource("https://git.example.com/owner/repo.git");
    expect(result.type).toBe("git");
    expect(result.url).toBe("https://git.example.com/owner/repo.git");
  });

  it("preserves a fragment ref on a generic git URL", () => {
    const result = parseSkillSource("https://git.example.com/owner/repo.git#main");
    expect(result).toMatchObject({
      type: "git",
      url: "https://git.example.com/owner/repo.git",
      ref: "main",
    });
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

  it("rewrites github:owner/repo#main with a fragment ref", () => {
    expect(parseSkillSource("github:owner/repo#main")).toMatchObject({
      type: "github",
      url: "https://github.com/owner/repo.git",
      ref: "main",
    });
  });

  it("rewrites github:owner/repo#main@filter with combined fragment", () => {
    expect(parseSkillSource("github:owner/repo#main@my-skill")).toMatchObject({
      type: "github",
      ref: "main",
      skillFilter: "my-skill",
    });
  });
});

describe("parseSkillSource: gitlab: prefix syntax with fragments", () => {
  it("supports a fragment ref on the gitlab: prefix", () => {
    expect(parseSkillSource("gitlab:owner/repo#main")).toMatchObject({
      type: "gitlab",
      url: "https://gitlab.com/owner/repo.git",
      ref: "main",
    });
  });

  it("supports combined fragment ref + skill filter on gitlab:", () => {
    expect(parseSkillSource("gitlab:owner/repo#release@my-skill")).toMatchObject({
      type: "gitlab",
      ref: "release",
      skillFilter: "my-skill",
    });
  });
});

describe("parseSkillSource: SSH bare ref", () => {
  it("parses git@github.com:owner/repo.git#main with no skill filter", () => {
    const result = parseSkillSource("git@github.com:owner/repo.git#main");
    expect(result).toMatchObject({
      type: "github",
      url: "git@github.com:owner/repo.git",
      ref: "main",
    });
    expect(result.skillFilter).toBeUndefined();
  });

  it("preserves the SSH URL untouched (no rewrite to https)", () => {
    const result = parseSkillSource("git@github.com:owner/repo.git");
    expect(result.url.startsWith("git@")).toBe(true);
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
