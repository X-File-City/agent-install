import { describe, expect, it } from "@voidzero-dev/vite-plus-test";

import { parseSkillSource } from "../src/skill/source-parser.ts";
import { discoverSkills } from "../src/skill/skills.ts";
import { isPathSafe } from "../src/utils/is-path-safe.ts";
import { sanitizeSubpath } from "../src/utils/sanitize-subpath.ts";

describe("sanitizeSubpath", () => {
  it("allows normal subpaths", () => {
    expect(sanitizeSubpath("skills/my-skill")).toBe("skills/my-skill");
    expect(sanitizeSubpath("path/to/skill")).toBe("path/to/skill");
    expect(sanitizeSubpath("src")).toBe("src");
  });

  it("rejects subpaths with .. segments", () => {
    expect(() => sanitizeSubpath("../etc")).toThrow(/Unsafe subpath/);
    expect(() => sanitizeSubpath("../../etc/passwd")).toThrow(/Unsafe subpath/);
    expect(() => sanitizeSubpath("skills/../../etc")).toThrow(/Unsafe subpath/);
    expect(() => sanitizeSubpath("a/b/../../../etc")).toThrow(/Unsafe subpath/);
  });

  it("rejects backslash-based traversal", () => {
    expect(() => sanitizeSubpath("..\\etc")).toThrow(/Unsafe subpath/);
    expect(() => sanitizeSubpath("..\\..\\secret")).toThrow(/Unsafe subpath/);
  });

  it("allows dot-containing paths that are not traversal", () => {
    expect(sanitizeSubpath(".hidden")).toBe(".hidden");
    expect(sanitizeSubpath("file.txt")).toBe("file.txt");
    expect(sanitizeSubpath("path/to/.config")).toBe("path/to/.config");
    expect(sanitizeSubpath("..skill")).toBe("..skill");
    expect(sanitizeSubpath("skill..")).toBe("skill..");
  });
});

describe("isPathSafe", () => {
  it("returns true when the target is inside the base", () => {
    expect(isPathSafe("/tmp/repo", "/tmp/repo/skills")).toBe(true);
    expect(isPathSafe("/tmp/repo", "/tmp/repo/a/b/c")).toBe(true);
    expect(isPathSafe("/tmp/repo", "/tmp/repo")).toBe(true);
  });

  it("returns false when the target escapes the base", () => {
    expect(isPathSafe("/tmp/repo", "/tmp")).toBe(false);
    expect(isPathSafe("/tmp/repo", "/etc/passwd")).toBe(false);
    expect(isPathSafe("/tmp/repo", "/tmp/repo-evil")).toBe(false);
  });
});

describe("parseSkillSource rejects traversal", () => {
  it("rejects .. in a GitHub tree URL subpath", () => {
    expect(() => parseSkillSource("https://github.com/owner/repo/tree/main/../../etc")).toThrow(
      /Unsafe subpath/,
    );
  });

  it("rejects deeply nested traversal", () => {
    expect(() =>
      parseSkillSource("https://github.com/owner/repo/tree/main/a/b/../../../etc"),
    ).toThrow(/Unsafe subpath/);
  });

  it("accepts a valid GitHub tree URL subpath", () => {
    expect(
      parseSkillSource("https://github.com/owner/repo/tree/main/skills/my-skill"),
    ).toMatchObject({
      subpath: "skills/my-skill",
    });
  });

  it("rejects .. in shorthand subpaths", () => {
    expect(() => parseSkillSource("owner/repo/../../etc")).toThrow(/Unsafe subpath/);
  });

  it("accepts a valid shorthand subpath", () => {
    expect(parseSkillSource("owner/repo/skills/my-skill")).toMatchObject({
      subpath: "skills/my-skill",
    });
  });
});

describe("discoverSkills rejects unsafe subpaths", () => {
  it("throws when the subpath escapes the base directory", async () => {
    await expect(discoverSkills("/tmp/repo", "../../etc")).rejects.toThrow(/subpath/i);
  });
});
