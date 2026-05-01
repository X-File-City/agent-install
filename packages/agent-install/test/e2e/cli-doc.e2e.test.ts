import { existsSync, readFileSync } from "node:fs";
import { lstat, readlink, realpath } from "node:fs/promises";
import { join } from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";

import {
  createIsolatedWorkspace,
  runCli,
  setupWorkspaceDirectories,
  writeFileAt,
  type IsolatedWorkspace,
} from "./helpers.ts";

describe("CLI: doc", () => {
  let workspace: IsolatedWorkspace;

  beforeEach(async () => {
    workspace = createIsolatedWorkspace();
    await setupWorkspaceDirectories(workspace);
  });

  afterEach(() => {
    workspace.cleanup();
  });

  describe("init", () => {
    it("creates AGENTS.md with the default template", async () => {
      const result = await runCli(["doc", "init"], {
        cwd: workspace.cwd,
        env: workspace.env,
      });

      expect(result.exitCode).toBe(0);
      const content = readFileSync(join(workspace.cwd, "AGENTS.md"), "utf-8");
      expect(content).toContain("# AGENTS.md");
      expect(content).toContain("## Setup commands");
    });

    it("writes GEMINI.md for --agent gemini-cli", async () => {
      const result = await runCli(["doc", "init", "--agent", "gemini-cli"], {
        cwd: workspace.cwd,
        env: workspace.env,
      });
      expect(result.exitCode).toBe(0);
      expect(existsSync(join(workspace.cwd, "GEMINI.md"))).toBe(true);
    });

    it("warns without overwriting when AGENTS.md already exists", async () => {
      await runCli(["doc", "init"], { cwd: workspace.cwd, env: workspace.env });
      const original = readFileSync(join(workspace.cwd, "AGENTS.md"), "utf-8");

      const result = await runCli(["doc", "init"], {
        cwd: workspace.cwd,
        env: workspace.env,
      });
      expect(result.exitCode).toBe(0);
      expect(result.stdout.toLowerCase()).toContain("already exists");

      expect(readFileSync(join(workspace.cwd, "AGENTS.md"), "utf-8")).toBe(original);
    });

    it("rejects unknown --agent values", async () => {
      const result = await runCli(["doc", "init", "--agent", "made-up"], {
        cwd: workspace.cwd,
        env: workspace.env,
      });
      expect(result.exitCode).not.toBe(0);
      expect(result.stderr).toMatch(/Unknown agent/i);
    });
  });

  describe("read", () => {
    it("lists parsed section headings", async () => {
      await runCli(["doc", "init"], { cwd: workspace.cwd, env: workspace.env });
      const result = await runCli(["doc", "read"], {
        cwd: workspace.cwd,
        env: workspace.env,
      });
      expect(result.exitCode).toBe(0);
      for (const heading of ["AGENTS.md", "Project overview", "Setup commands", "Testing"]) {
        expect(result.stdout).toContain(heading);
      }
    });

    it("emits structured JSON with --json", async () => {
      await runCli(["doc", "init"], { cwd: workspace.cwd, env: workspace.env });
      const result = await runCli(["doc", "read", "--json"], {
        cwd: workspace.cwd,
        env: workspace.env,
      });
      expect(result.exitCode).toBe(0);
      const parsed = JSON.parse(result.stdout) as {
        path: string;
        sections: Array<{ heading: string; level: number; body: string }>;
      };
      expect(parsed.path).toContain("AGENTS.md");
      expect(parsed.sections.length).toBeGreaterThan(1);
      expect(parsed.sections[0].heading).toBeDefined();
    });

    it("warns when AGENTS.md is missing", async () => {
      const result = await runCli(["doc", "read"], {
        cwd: workspace.cwd,
        env: workspace.env,
      });
      expect(result.exitCode).toBe(0);
      expect(result.stdout.toLowerCase()).toContain("no file at");
    });
  });

  describe("set-section", () => {
    it("creates AGENTS.md when missing and adds the section", async () => {
      const result = await runCli(
        ["doc", "set-section", "Testing", "--body", "pnpm test", "--placement", "append"],
        { cwd: workspace.cwd, env: workspace.env },
      );
      expect(result.exitCode).toBe(0);

      const content = readFileSync(join(workspace.cwd, "AGENTS.md"), "utf-8");
      expect(content).toContain("## Testing");
      expect(content).toContain("pnpm test");
    });

    it("replaces a matching section by default", async () => {
      await writeFileAt(
        join(workspace.cwd, "AGENTS.md"),
        "# Intro\n\nintro body\n\n## Testing\n\nold body\n\n## Deploy\n\ndeploy body\n",
      );

      const result = await runCli(["doc", "set-section", "Testing", "--body", "new body"], {
        cwd: workspace.cwd,
        env: workspace.env,
      });
      expect(result.exitCode).toBe(0);

      const content = readFileSync(join(workspace.cwd, "AGENTS.md"), "utf-8");
      expect(content).toContain("new body");
      expect(content).not.toContain("old body");
      expect(content).toContain("deploy body");
    });

    it("preserves content inside fenced code blocks when replacing a nearby section", async () => {
      const initial = [
        "## Example",
        "",
        "```bash",
        "# this is not a heading",
        "## neither is this",
        "```",
        "",
        "## Deploy",
        "",
        "deploy body",
        "",
      ].join("\n");
      await writeFileAt(join(workspace.cwd, "AGENTS.md"), initial);

      const result = await runCli(["doc", "set-section", "Deploy", "--body", "fresh deploy"], {
        cwd: workspace.cwd,
        env: workspace.env,
      });
      expect(result.exitCode).toBe(0);

      const content = readFileSync(join(workspace.cwd, "AGENTS.md"), "utf-8");
      expect(content).toContain("# this is not a heading");
      expect(content).toContain("## neither is this");
      expect(content).toContain("fresh deploy");
      expect(content).not.toContain("deploy body");
    });

    it("reads --body-file contents", async () => {
      const bodyPath = join(workspace.cwd, "body.txt");
      await writeFileAt(bodyPath, "pulled from a file\nwith multiple lines\n");
      await runCli(["doc", "init"], { cwd: workspace.cwd, env: workspace.env });

      const result = await runCli(
        ["doc", "set-section", "External", "--body-file", bodyPath, "--placement", "append"],
        { cwd: workspace.cwd, env: workspace.env },
      );
      expect(result.exitCode).toBe(0);
      const content = readFileSync(join(workspace.cwd, "AGENTS.md"), "utf-8");
      expect(content).toContain("pulled from a file");
    });

    it("respects --level", async () => {
      const result = await runCli(
        ["doc", "set-section", "Deep", "--body", "b", "--level", "4", "--placement", "append"],
        { cwd: workspace.cwd, env: workspace.env },
      );
      expect(result.exitCode).toBe(0);
      const content = readFileSync(join(workspace.cwd, "AGENTS.md"), "utf-8");
      expect(content).toContain("#### Deep");
    });

    it("rejects empty bodies", async () => {
      const result = await runCli(["doc", "set-section", "X", "--body", "   "], {
        cwd: workspace.cwd,
        env: workspace.env,
      });
      expect(result.exitCode).not.toBe(0);
      expect(result.stderr).toMatch(/empty/i);
    });

    it("rejects invalid placement values", async () => {
      const result = await runCli(
        ["doc", "set-section", "X", "--body", "b", "--placement", "overwrite"],
        { cwd: workspace.cwd, env: workspace.env },
      );
      expect(result.exitCode).not.toBe(0);
      expect(result.stderr).toMatch(/placement/i);
    });

    it("rejects heading levels outside 1-6", async () => {
      const tooHigh = await runCli(["doc", "set-section", "X", "--body", "b", "--level", "7"], {
        cwd: workspace.cwd,
        env: workspace.env,
      });
      expect(tooHigh.exitCode).not.toBe(0);
      expect(tooHigh.stderr).toMatch(/heading level/i);

      const tooLow = await runCli(["doc", "set-section", "X", "--body", "b", "--level", "0"], {
        cwd: workspace.cwd,
        env: workspace.env,
      });
      expect(tooLow.exitCode).not.toBe(0);
    });
  });

  describe("remove-section", () => {
    it("removes an existing section", async () => {
      await writeFileAt(
        join(workspace.cwd, "AGENTS.md"),
        "## Keep\n\nkeep body\n\n## Drop\n\ndrop body\n",
      );

      const result = await runCli(["doc", "remove-section", "Drop"], {
        cwd: workspace.cwd,
        env: workspace.env,
      });
      expect(result.exitCode).toBe(0);

      const content = readFileSync(join(workspace.cwd, "AGENTS.md"), "utf-8");
      expect(content).toContain("## Keep");
      expect(content).not.toContain("## Drop");
      expect(content).not.toContain("drop body");
    });

    it("warns when the section is missing", async () => {
      await writeFileAt(join(workspace.cwd, "AGENTS.md"), "## Only\n\nbody\n");
      const result = await runCli(["doc", "remove-section", "Missing"], {
        cwd: workspace.cwd,
        env: workspace.env,
      });
      expect(result.exitCode).toBe(0);
      expect(result.stdout.toLowerCase()).toContain("not found");
    });
  });

  describe("symlink-claude", () => {
    it("creates CLAUDE.md pointing at AGENTS.md", async () => {
      await runCli(["doc", "init"], { cwd: workspace.cwd, env: workspace.env });
      const result = await runCli(["doc", "symlink-claude"], {
        cwd: workspace.cwd,
        env: workspace.env,
      });
      expect(result.exitCode).toBe(0);

      const stats = await lstat(join(workspace.cwd, "CLAUDE.md"));
      expect(stats.isSymbolicLink()).toBe(true);
      const target = await readlink(join(workspace.cwd, "CLAUDE.md"));
      expect(target).toBe("AGENTS.md");
    });

    it("reports idempotency on a second invocation", async () => {
      await runCli(["doc", "init"], { cwd: workspace.cwd, env: workspace.env });
      await runCli(["doc", "symlink-claude"], { cwd: workspace.cwd, env: workspace.env });

      const again = await runCli(["doc", "symlink-claude"], {
        cwd: workspace.cwd,
        env: workspace.env,
      });
      expect(again.exitCode).toBe(0);
      expect(again.stdout.toLowerCase()).toContain("already points");
    });

    it("errors when AGENTS.md is missing", async () => {
      const result = await runCli(["doc", "symlink-claude"], {
        cwd: workspace.cwd,
        env: workspace.env,
      });
      expect(result.exitCode).not.toBe(0);
      expect(result.stderr).toMatch(/AGENTS\.md/);
    });

    it("backs up an existing CLAUDE.md when --overwrite is passed", async () => {
      await runCli(["doc", "init"], { cwd: workspace.cwd, env: workspace.env });
      await writeFileAt(join(workspace.cwd, "CLAUDE.md"), "legacy content\n");

      const blocked = await runCli(["doc", "symlink-claude"], {
        cwd: workspace.cwd,
        env: workspace.env,
      });
      expect(blocked.exitCode).not.toBe(0);

      const result = await runCli(
        ["doc", "symlink-claude", "--overwrite", "--backup", "CLAUDE.bak"],
        { cwd: workspace.cwd, env: workspace.env },
      );
      expect(result.exitCode).toBe(0);

      const stats = await lstat(join(workspace.cwd, "CLAUDE.md"));
      expect(stats.isSymbolicLink()).toBe(true);
      const real = await realpath(join(workspace.cwd, "CLAUDE.md"));
      expect(real).toBe(await realpath(join(workspace.cwd, "AGENTS.md")));
      expect(readFileSync(join(workspace.cwd, "CLAUDE.bak"), "utf-8")).toBe("legacy content\n");
    });
  });

  describe("--file override", () => {
    it("writes to an explicit file path regardless of --agent", async () => {
      const custom = join(workspace.cwd, "docs", "custom.md");
      const result = await runCli(
        [
          "doc",
          "set-section",
          "From File",
          "--body",
          "via --file",
          "--file",
          custom,
          "--placement",
          "append",
        ],
        { cwd: workspace.cwd, env: workspace.env },
      );
      expect(result.exitCode).toBe(0);
      expect(readFileSync(custom, "utf-8")).toContain("## From File");
    });
  });
});
