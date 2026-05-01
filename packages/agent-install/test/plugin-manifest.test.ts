import { mkdir, mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";

import { afterEach, beforeEach, describe, expect, it } from "@voidzero-dev/vite-plus-test";

import { discoverSkills } from "../src/skill/skills.ts";

const writeSkillManifest = async (dir: string, name: string): Promise<void> => {
  await mkdir(dir, { recursive: true });
  await writeFile(
    join(dir, "SKILL.md"),
    `---\nname: ${name}\ndescription: ${name} description\n---\n`,
    "utf-8",
  );
};

const writeJson = async (path: string, value: unknown): Promise<void> => {
  await mkdir(join(path, ".."), { recursive: true });
  await writeFile(path, JSON.stringify(value, null, 2), "utf-8");
};

describe("plugin manifest discovery", () => {
  let root: string;

  beforeEach(async () => {
    root = await mkdtemp(join(tmpdir(), "agent-install-plugin-manifest-"));
  });

  afterEach(async () => {
    await rm(root, { recursive: true, force: true });
  });

  it("discovers skills declared in .claude-plugin/marketplace.json and tags them with pluginName", async () => {
    await writeSkillManifest(join(root, "plugins/docs/skills/review"), "review-skill");
    await writeSkillManifest(join(root, "plugins/docs/skills/test"), "test-skill");
    await writeJson(join(root, ".claude-plugin/marketplace.json"), {
      metadata: { pluginRoot: "./plugins" },
      plugins: [
        {
          name: "docs-suite",
          source: "./docs",
          skills: ["./skills/review", "./skills/test"],
        },
      ],
    });

    const discovered = await discoverSkills(root);
    const byName = new Map(discovered.map((skill) => [skill.name, skill]));

    expect(byName.get("review-skill")?.pluginName).toBe("docs-suite");
    expect(byName.get("test-skill")?.pluginName).toBe("docs-suite");
  });

  it("ignores plugin entries whose source escapes the base path (security)", async () => {
    await writeSkillManifest(join(root, "skills/safe"), "safe-skill");
    await writeJson(join(root, ".claude-plugin/marketplace.json"), {
      plugins: [
        {
          name: "evil",
          source: "../../../etc",
          skills: ["./passwd"],
        },
      ],
    });

    const discovered = await discoverSkills(root);
    expect(discovered.map((skill) => skill.name)).toContain("safe-skill");
    expect(discovered.find((skill) => skill.pluginName === "evil")).toBeUndefined();
  });

  it("supports a single plugin manifest at .claude-plugin/plugin.json", async () => {
    await writeSkillManifest(join(root, "skills/single"), "single-skill");
    await writeJson(join(root, ".claude-plugin/plugin.json"), {
      name: "lone-plugin",
      skills: ["./skills/single"],
    });

    const discovered = await discoverSkills(root);
    const found = discovered.find((skill) => skill.name === "single-skill");
    expect(found?.pluginName).toBe("lone-plugin");
  });

  it("rejects skills-array entries that escape the base path via ../", async () => {
    await writeSkillManifest(join(root, "skills/safe"), "safe-skill-2");
    await writeJson(join(root, ".claude-plugin/plugin.json"), {
      name: "traversal-plugin",
      skills: ["./../../etc/passwd", "./skills/safe"],
    });

    const discovered = await discoverSkills(root);
    expect(discovered.map((skill) => skill.name)).toContain("safe-skill-2");
    expect(discovered.some((skill) => skill.name.includes("passwd"))).toBe(false);
    expect(discovered.find((skill) => skill.pluginName === "traversal-plugin")?.name).toBe(
      "safe-skill-2",
    );
  });

  it("ignores skills-array entries that don't start with './' (per Claude convention)", async () => {
    await writeSkillManifest(join(root, "skills/ok"), "ok-skill");
    await writeJson(join(root, ".claude-plugin/plugin.json"), {
      name: "nonconforming",
      skills: ["skills/ok", "/abs/path", "./skills/ok"],
    });

    const discovered = await discoverSkills(root);
    expect(discovered.find((skill) => skill.name === "ok-skill")?.pluginName).toBe("nonconforming");
  });
});
