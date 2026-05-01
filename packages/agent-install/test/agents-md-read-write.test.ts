import { readFileSync } from "node:fs";
import { mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";

import { readAgentsMd, writeAgentsMd } from "../src/agents-md/read-write.ts";
import { removeAgentsMdSection } from "../src/agents-md/remove-section.ts";

describe("readAgentsMd / writeAgentsMd", () => {
  let cwd: string;

  beforeEach(async () => {
    cwd = await mkdtemp(join(tmpdir(), "agent-install-rw-"));
  });

  afterEach(async () => {
    await rm(cwd, { recursive: true, force: true });
  });

  it("returns empty content when the file is missing", () => {
    const document = readAgentsMd({ cwd });
    expect(document.content).toBe("");
    expect(document.sections).toEqual([]);
    expect(document.path.endsWith("AGENTS.md")).toBe(true);
  });

  it("parses sections after write", async () => {
    await writeFile(join(cwd, "AGENTS.md"), "# Title\n\nintro\n\n## A\n\nbody\n", "utf-8");
    const document = readAgentsMd({ cwd });
    expect(document.sections.map((section) => section.heading)).toEqual(["Title", "A"]);
  });

  it("always writes a trailing newline", () => {
    const path = writeAgentsMd({ cwd, content: "no newline" });
    expect(readFileSync(path, "utf-8").endsWith("\n")).toBe(true);
  });

  it("does not double-append newline when content already has one", () => {
    const path = writeAgentsMd({ cwd, content: "already has\n" });
    expect(readFileSync(path, "utf-8")).toBe("already has\n");
  });

  it("creates parent directories for nested --file paths", () => {
    const path = writeAgentsMd({ cwd, file: "deep/nested/out.md", content: "# Hi" });
    expect(readFileSync(path, "utf-8")).toBe("# Hi\n");
  });
});

describe("removeAgentsMdSection", () => {
  let cwd: string;

  beforeEach(async () => {
    cwd = await mkdtemp(join(tmpdir(), "agent-install-rm-"));
  });

  afterEach(async () => {
    await rm(cwd, { recursive: true, force: true });
  });

  it("removes the first section cleanly", async () => {
    await writeFile(join(cwd, "AGENTS.md"), "## First\n\na\n\n## Second\n\nb\n", "utf-8");
    expect(removeAgentsMdSection({ cwd, heading: "First" })).toBe(true);
    const content = readFileSync(join(cwd, "AGENTS.md"), "utf-8");
    expect(content).not.toContain("First");
    expect(content).toContain("Second");
  });

  it("removes the last section cleanly", async () => {
    await writeFile(join(cwd, "AGENTS.md"), "## First\n\na\n\n## Last\n\nb\n", "utf-8");
    expect(removeAgentsMdSection({ cwd, heading: "Last" })).toBe(true);
    const content = readFileSync(join(cwd, "AGENTS.md"), "utf-8");
    expect(content).toContain("First");
    expect(content).not.toContain("Last");
  });

  it("returns false when the heading does not exist", async () => {
    await writeFile(join(cwd, "AGENTS.md"), "## Only\n\nbody\n", "utf-8");
    expect(removeAgentsMdSection({ cwd, heading: "Missing" })).toBe(false);
  });

  it("handles CRLF input", async () => {
    await writeFile(join(cwd, "AGENTS.md"), "## A\r\n\r\na\r\n\r\n## B\r\n\r\nb\r\n", "utf-8");
    expect(removeAgentsMdSection({ cwd, heading: "A" })).toBe(true);
    expect(readFileSync(join(cwd, "AGENTS.md"), "utf-8")).toContain("## B");
  });
});
