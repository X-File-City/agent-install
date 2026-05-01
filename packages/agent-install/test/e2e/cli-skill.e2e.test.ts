import { existsSync, readFileSync } from "node:fs";
import { lstat, readlink, stat } from "node:fs/promises";
import { join } from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "@voidzero-dev/vite-plus-test";

import {
  createIsolatedWorkspace,
  runCli,
  setupWorkspaceDirectories,
  writeSkillFixture,
  type IsolatedWorkspace,
} from "./helpers.ts";

describe("CLI: skill", () => {
  let workspace: IsolatedWorkspace;

  beforeEach(async () => {
    workspace = createIsolatedWorkspace();
    await setupWorkspaceDirectories(workspace);
  });

  afterEach(() => {
    workspace.cleanup();
  });

  describe("init", () => {
    it("creates SKILL.md in a named subdirectory", async () => {
      const result = await runCli(["skill", "init", "example-skill"], {
        cwd: workspace.cwd,
        env: workspace.env,
      });

      expect(result.exitCode).toBe(0);
      expect(result.stdout).toContain("example-skill");
      const manifest = readFileSync(join(workspace.cwd, "example-skill", "SKILL.md"), "utf-8");
      expect(manifest).toContain("name: example-skill");
      expect(manifest).toContain("description:");
    });

    it("warns rather than overwriting an existing SKILL.md", async () => {
      await runCli(["skill", "init", "dup"], { cwd: workspace.cwd, env: workspace.env });
      const before = readFileSync(join(workspace.cwd, "dup", "SKILL.md"), "utf-8");

      const result = await runCli(["skill", "init", "dup"], {
        cwd: workspace.cwd,
        env: workspace.env,
      });
      expect(result.exitCode).toBe(0);
      expect(result.stdout.toLowerCase()).toContain("already exists");

      const after = readFileSync(join(workspace.cwd, "dup", "SKILL.md"), "utf-8");
      expect(after).toBe(before);
    });
  });

  describe("add", () => {
    it("installs a local skill to claude-code via canonical + symlink", async () => {
      const fixtureDir = join(workspace.cwd, "fixtures");
      await writeSkillFixture(fixtureDir, "fixture-skill");

      const result = await runCli(
        ["skill", "add", "./fixtures/fixture-skill", "-a", "claude-code", "-y"],
        { cwd: workspace.cwd, env: workspace.env },
      );

      expect(result.exitCode).toBe(0);
      expect(result.stdout).toContain("fixture-skill");

      const canonical = join(workspace.cwd, ".agents", "skills", "fixture-skill", "SKILL.md");
      expect(existsSync(canonical)).toBe(true);
      expect(readFileSync(canonical, "utf-8")).toContain("name: fixture-skill");

      const claudeLink = join(workspace.cwd, ".claude", "skills", "fixture-skill");
      const linkStat = await lstat(claudeLink);
      expect(linkStat.isSymbolicLink()).toBe(true);
      const target = await readlink(claudeLink);
      expect(target).toContain(".agents");
    });

    it("installs to a universal agent without creating a redundant agent-specific dir", async () => {
      await writeSkillFixture(workspace.cwd, "univ-skill");

      const result = await runCli(["skill", "add", "./univ-skill", "-a", "cursor", "-y"], {
        cwd: workspace.cwd,
        env: workspace.env,
      });

      expect(result.exitCode).toBe(0);

      const canonical = join(workspace.cwd, ".agents", "skills", "univ-skill");
      expect(existsSync(canonical)).toBe(true);
      expect(existsSync(join(workspace.cwd, ".cursor", "skills"))).toBe(false);
    });

    it("copies files (no symlink) when --copy is passed", async () => {
      await writeSkillFixture(workspace.cwd, "copy-skill");

      const result = await runCli(
        ["skill", "add", "./copy-skill", "-a", "claude-code", "--copy", "-y"],
        { cwd: workspace.cwd, env: workspace.env },
      );

      expect(result.exitCode).toBe(0);
      const claudePath = join(workspace.cwd, ".claude", "skills", "copy-skill");
      const claudeStat = await lstat(claudePath);
      expect(claudeStat.isSymbolicLink()).toBe(false);
      expect((await stat(claudePath)).isDirectory()).toBe(true);
      expect(readFileSync(join(claudePath, "SKILL.md"), "utf-8")).toContain("name: copy-skill");
    });

    it("rejects unknown agents with a descriptive error", async () => {
      await writeSkillFixture(workspace.cwd, "bad-skill");

      const result = await runCli(["skill", "add", "./bad-skill", "-a", "made-up-agent", "-y"], {
        cwd: workspace.cwd,
        env: workspace.env,
      });

      expect(result.exitCode).not.toBe(0);
      expect(result.stderr).toMatch(/Unknown agent/i);
      expect(existsSync(join(workspace.cwd, ".agents"))).toBe(false);
    });

    it("installs multiple agents in one invocation", async () => {
      await writeSkillFixture(workspace.cwd, "multi-skill");

      const result = await runCli(
        ["skill", "add", "./multi-skill", "-a", "claude-code", "cursor", "-y"],
        { cwd: workspace.cwd, env: workspace.env },
      );

      expect(result.exitCode).toBe(0);
      expect(existsSync(join(workspace.cwd, ".agents", "skills", "multi-skill", "SKILL.md"))).toBe(
        true,
      );
      expect(existsSync(join(workspace.cwd, ".claude", "skills", "multi-skill"))).toBe(true);
    });
  });

  describe("list", () => {
    it("reports installed skills as JSON", async () => {
      await writeSkillFixture(workspace.cwd, "listed-skill");
      await runCli(["skill", "add", "./listed-skill", "-a", "claude-code", "cursor", "-y"], {
        cwd: workspace.cwd,
        env: workspace.env,
      });

      const result = await runCli(["skill", "list", "--json"], {
        cwd: workspace.cwd,
        env: workspace.env,
      });
      expect(result.exitCode).toBe(0);

      const parsed = JSON.parse(result.stdout) as Array<{ skill: string; agent: string }>;
      const agents = parsed
        .filter((entry) => entry.skill === "listed-skill")
        .map((entry) => entry.agent);
      expect(agents).toContain("universal");
      expect(agents).toContain("claude-code");
    });

    it("warns when nothing is installed", async () => {
      const result = await runCli(["skill", "list"], {
        cwd: workspace.cwd,
        env: workspace.env,
      });
      expect(result.exitCode).toBe(0);
      expect(result.stdout.toLowerCase()).toContain("no installed skills");
    });

    it("does not double-list canonical skills under every undetected universal agent", async () => {
      await writeSkillFixture(workspace.cwd, "shared-skill");
      await runCli(["skill", "add", "./shared-skill", "-a", "claude-code", "-y"], {
        cwd: workspace.cwd,
        env: workspace.env,
      });

      const result = await runCli(["skill", "list", "--json"], {
        cwd: workspace.cwd,
        env: workspace.env,
      });
      expect(result.exitCode).toBe(0);

      const parsed = JSON.parse(result.stdout) as Array<{ skill: string; agent: string }>;
      const agents = parsed
        .filter((entry) => entry.skill === "shared-skill")
        .map((entry) => entry.agent);

      expect(agents).toContain("universal");
      expect(agents).toContain("claude-code");
      // Universal agents (cursor, codex, opencode, …) and undetected non-universal
      // agents (droid, kilo, roo, …) must not appear individually for a skill that
      // only lives in the canonical dir + claude-code's symlink.
      for (const undetected of ["cursor", "codex", "opencode", "amp", "droid", "roo"]) {
        expect(agents).not.toContain(undetected);
      }
    });

    it("surfaces ghost skills left behind in an agent dir after the agent was removed", async () => {
      await writeSkillFixture(workspace.cwd, "ghost-skill");
      await runCli(["skill", "add", "./ghost-skill", "-a", "kilo", "-y"], {
        cwd: workspace.cwd,
        env: workspace.env,
      });

      // Kilo is non-universal and not detected (no ~/.kilocode in the isolated home),
      // so it only shows up because its project-local skills dir is non-empty.
      expect(existsSync(join(workspace.cwd, ".kilocode", "skills", "ghost-skill"))).toBe(true);

      const result = await runCli(["skill", "list", "--json"], {
        cwd: workspace.cwd,
        env: workspace.env,
      });
      const parsed = JSON.parse(result.stdout) as Array<{ skill: string; agent: string }>;
      const agents = parsed
        .filter((entry) => entry.skill === "ghost-skill")
        .map((entry) => entry.agent);

      expect(agents).toContain("kilo");
    });
  });

  describe("remove", () => {
    it("removes canonical and agent-specific copies", async () => {
      await writeSkillFixture(workspace.cwd, "rm-skill");
      await runCli(["skill", "add", "./rm-skill", "-a", "claude-code", "cursor", "-y"], {
        cwd: workspace.cwd,
        env: workspace.env,
      });

      expect(existsSync(join(workspace.cwd, ".agents", "skills", "rm-skill"))).toBe(true);
      expect(existsSync(join(workspace.cwd, ".claude", "skills", "rm-skill"))).toBe(true);

      const result = await runCli(["skill", "remove", "rm-skill", "-y"], {
        cwd: workspace.cwd,
        env: workspace.env,
      });
      expect(result.exitCode).toBe(0);

      expect(existsSync(join(workspace.cwd, ".agents", "skills", "rm-skill"))).toBe(false);
      expect(existsSync(join(workspace.cwd, ".claude", "skills", "rm-skill"))).toBe(false);
    });
  });
});
