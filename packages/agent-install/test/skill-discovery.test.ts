import { mkdtemp, mkdir, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";

import {
  discoverSkills,
  filterSkillsByName,
  getSkillDisplayName,
  parseSkillManifest,
} from "../src/skill/skills.ts";

const writeManifest = async (
  dir: string,
  name: string,
  description = "test description",
  extraFrontmatter = "",
): Promise<void> => {
  await mkdir(dir, { recursive: true });
  const content = `---
name: ${name}
description: ${description}
${extraFrontmatter}---

# ${name} body
`;
  await writeFile(join(dir, "SKILL.md"), content, "utf-8");
};

describe("parseSkillManifest", () => {
  let root: string;

  beforeEach(async () => {
    root = await mkdtemp(join(tmpdir(), "agent-install-discovery-"));
  });

  afterEach(async () => {
    await rm(root, { recursive: true, force: true });
  });

  it("parses a valid SKILL.md", async () => {
    const skillDir = join(root, "good");
    await writeManifest(skillDir, "good-skill", "Good for testing");
    const skill = await parseSkillManifest(join(skillDir, "SKILL.md"));
    expect(skill).toMatchObject({
      name: "good-skill",
      description: "Good for testing",
      path: skillDir,
    });
    expect(skill?.rawContent).toContain("# good-skill body");
  });

  it("returns null when name is missing", async () => {
    const skillDir = join(root, "no-name");
    await mkdir(skillDir, { recursive: true });
    await writeFile(
      join(skillDir, "SKILL.md"),
      `---\ndescription: only description\n---\n\nbody`,
      "utf-8",
    );
    expect(await parseSkillManifest(join(skillDir, "SKILL.md"))).toBeNull();
  });

  it("returns null when description is missing", async () => {
    const skillDir = join(root, "no-desc");
    await mkdir(skillDir, { recursive: true });
    await writeFile(join(skillDir, "SKILL.md"), `---\nname: alpha\n---\n\nbody`, "utf-8");
    expect(await parseSkillManifest(join(skillDir, "SKILL.md"))).toBeNull();
  });

  it("returns null when name/description are non-strings (YAML number, boolean)", async () => {
    const skillDir = join(root, "non-string");
    await mkdir(skillDir, { recursive: true });
    await writeFile(
      join(skillDir, "SKILL.md"),
      `---\nname: 123\ndescription: true\n---\n\nbody`,
      "utf-8",
    );
    expect(await parseSkillManifest(join(skillDir, "SKILL.md"))).toBeNull();
  });

  it("exposes metadata when it's a plain object", async () => {
    const skillDir = join(root, "meta");
    await writeManifest(skillDir, "with-meta", "desc", `metadata:\n  version: "1.0"\n`);
    const skill = await parseSkillManifest(join(skillDir, "SKILL.md"));
    expect(skill?.metadata).toEqual({ version: "1.0" });
  });

  it("drops non-object metadata", async () => {
    const skillDir = join(root, "meta-array");
    await writeManifest(skillDir, "array-meta", "desc", "metadata:\n  - a\n  - b\n");
    const skill = await parseSkillManifest(join(skillDir, "SKILL.md"));
    expect(skill?.metadata).toBeUndefined();
  });

  it("sanitises terminal-escape sequences in name and description", async () => {
    const skillDir = join(root, "tty");
    await mkdir(skillDir, { recursive: true });
    await writeFile(
      join(skillDir, "SKILL.md"),
      `---\nname: "safe\\u001b[31m hidden"\ndescription: "desc\\u001b[0m"\n---\n\nbody`,
      "utf-8",
    );
    const skill = await parseSkillManifest(join(skillDir, "SKILL.md"));
    expect(skill?.name).not.toContain("\x1b");
    expect(skill?.description).not.toContain("\x1b");
  });
});

describe("discoverSkills", () => {
  let root: string;

  beforeEach(async () => {
    root = await mkdtemp(join(tmpdir(), "agent-install-discovery-"));
  });

  afterEach(async () => {
    await rm(root, { recursive: true, force: true });
  });

  it("returns an empty list when the directory has no SKILL.md anywhere", async () => {
    await mkdir(join(root, "empty"), { recursive: true });
    expect(await discoverSkills(root)).toEqual([]);
  });

  it("finds a SKILL.md at the base directly and returns early", async () => {
    await writeManifest(root, "at-root");
    const skills = await discoverSkills(root);
    expect(skills).toHaveLength(1);
    expect(skills[0].name).toBe("at-root");
  });

  it("finds skills under the standard skills/ subdirectory", async () => {
    await writeManifest(join(root, "skills", "alpha"), "alpha");
    await writeManifest(join(root, "skills", "beta"), "beta");
    const skills = await discoverSkills(root);
    expect(skills.map((s) => s.name).sort()).toEqual(["alpha", "beta"]);
  });

  it("finds skills in .agents/skills", async () => {
    await writeManifest(join(root, ".agents", "skills", "gamma"), "gamma");
    const skills = await discoverSkills(root);
    expect(skills.map((s) => s.name)).toContain("gamma");
  });

  it("dedupes by name when multiple priority dirs carry the same skill", async () => {
    await writeManifest(join(root, "skills", "dup"), "duplicated");
    await writeManifest(join(root, ".agents", "skills", "dup"), "duplicated");
    const skills = await discoverSkills(root);
    expect(skills.filter((s) => s.name === "duplicated")).toHaveLength(1);
  });

  it("falls back to recursive search when no priority dir yields skills", async () => {
    await writeManifest(join(root, "deeply", "nested", "skill"), "deep-skill");
    const skills = await discoverSkills(root);
    expect(skills.map((s) => s.name)).toContain("deep-skill");
  });

  it("respects subpath", async () => {
    await writeManifest(join(root, "pkg", "skills", "inside"), "inside");
    await writeManifest(join(root, "other", "outside"), "outside");
    const skills = await discoverSkills(root, "pkg/skills");
    expect(skills.map((s) => s.name)).toEqual(["inside"]);
  });

  it("throws on unsafe subpath traversal", async () => {
    await expect(discoverSkills(root, "../../etc")).rejects.toThrow(/subpath/i);
  });

  it("fullDepth continues past the first SKILL.md", async () => {
    await writeManifest(root, "top");
    await writeManifest(join(root, "nested", "child"), "child");
    const deep = await discoverSkills(root, undefined, { fullDepth: true });
    expect(deep.map((s) => s.name).sort()).toEqual(["child", "top"]);
  });
});

describe("filterSkillsByName", () => {
  const skills = [
    { name: "react-grab", description: "", path: "/tmp/a", rawContent: "" },
    { name: "React Doctor", description: "", path: "/tmp/b", rawContent: "" },
    { name: "context", description: "", path: "/tmp/c", rawContent: "" },
  ];

  it("matches case-insensitively by exact name", () => {
    expect(filterSkillsByName(skills, ["REACT-GRAB"])).toHaveLength(1);
    expect(filterSkillsByName(skills, ["React Doctor"])).toHaveLength(1);
  });

  it("returns all matching names at once", () => {
    expect(filterSkillsByName(skills, ["react-grab", "context"])).toHaveLength(2);
  });

  it("returns empty when nothing matches", () => {
    expect(filterSkillsByName(skills, ["missing"])).toEqual([]);
  });
});

describe("getSkillDisplayName", () => {
  it("returns the name when present", () => {
    expect(
      getSkillDisplayName({ name: "named", description: "", path: "/tmp/x", rawContent: "" }),
    ).toBe("named");
  });

  it("falls back to the basename of path when name is empty", () => {
    expect(
      getSkillDisplayName({ name: "", description: "", path: "/tmp/fallback", rawContent: "" }),
    ).toBe("fallback");
  });
});
