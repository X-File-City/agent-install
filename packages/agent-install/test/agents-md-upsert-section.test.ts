import { mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "@voidzero-dev/vite-plus-test";

import { readAgentsMd } from "../src/agents-md/read-write.ts";
import { upsertAgentsMdSection } from "../src/agents-md/upsert-section.ts";

describe("upsertAgentsMdSection", () => {
  let cwd: string;

  beforeEach(() => {
    cwd = mkdtempSync(join(tmpdir(), "agent-install-test-"));
  });

  afterEach(() => {
    rmSync(cwd, { recursive: true, force: true });
  });

  it("creates AGENTS.md when missing", () => {
    upsertAgentsMdSection({ cwd, heading: "Testing", body: "pnpm test", placement: "append" });
    const content = readFileSync(join(cwd, "AGENTS.md"), "utf-8");
    expect(content).toContain("## Testing");
    expect(content).toContain("pnpm test");
  });

  it("replaces a matching section in place", () => {
    writeFileSync(
      join(cwd, "AGENTS.md"),
      "# Intro\n\nintro body\n\n## Testing\n\nold body\n\n## Deploy\n\ndeploy body\n",
    );

    upsertAgentsMdSection({ cwd, heading: "Testing", body: "new body" });

    const document = readAgentsMd({ cwd });
    const headings = document.sections.map((section) => section.heading);
    expect(headings).toEqual(["Intro", "Testing", "Deploy"]);
    const testing = document.sections.find((section) => section.heading === "Testing");
    expect(testing?.body).toBe("new body");
    expect(document.content).toContain("deploy body");
  });

  it("preserves code-fence content when replacing a neighboring section", () => {
    const content = [
      "## Testing",
      "",
      "body",
      "",
      "```bash",
      "## not a heading",
      "```",
      "",
      "## Deploy",
      "",
      "deploy body",
      "",
    ].join("\n");
    writeFileSync(join(cwd, "AGENTS.md"), content);

    upsertAgentsMdSection({ cwd, heading: "Deploy", body: "new deploy" });

    const result = readFileSync(join(cwd, "AGENTS.md"), "utf-8");
    expect(result).toContain("## not a heading");
    expect(result).toContain("new deploy");
    expect(result).not.toContain("deploy body");
  });

  it("appends when placement=append and section already exists", () => {
    writeFileSync(join(cwd, "AGENTS.md"), "## Testing\n\nold body\n");
    upsertAgentsMdSection({ cwd, heading: "Testing", body: "another", placement: "append" });
    const result = readFileSync(join(cwd, "AGENTS.md"), "utf-8");
    expect(result).toMatch(/old body[\s\S]+another/);
  });

  it("prepends when placement=prepend", () => {
    writeFileSync(join(cwd, "AGENTS.md"), "## Existing\n\nexisting body\n");
    upsertAgentsMdSection({
      cwd,
      heading: "First",
      body: "first body",
      placement: "prepend",
    });
    const result = readFileSync(join(cwd, "AGENTS.md"), "utf-8");
    expect(result.indexOf("First")).toBeLessThan(result.indexOf("Existing"));
  });
});
