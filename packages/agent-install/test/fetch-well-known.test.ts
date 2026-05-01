import { readFile, rm } from "node:fs/promises";
import { join } from "node:path";

import { afterEach, beforeEach, describe, expect, it, vi } from "@voidzero-dev/vite-plus-test";

import { fetchWellKnownSkills } from "../src/skill/fetch-well-known.ts";

interface FixtureFile {
  url: string;
  status: number;
  body: string;
}

const stubFetchWith = (fixtures: FixtureFile[]): void => {
  const map = new Map(fixtures.map((fixture) => [fixture.url, fixture]));
  vi.stubGlobal(
    "fetch",
    vi.fn(async (input: RequestInfo | URL): Promise<Response> => {
      const url = typeof input === "string" ? input : input.toString();
      const fixture = map.get(url);
      if (!fixture) return new Response("not found", { status: 404 });
      return new Response(fixture.body, { status: fixture.status });
    }),
  );
};

describe("fetchWellKnownSkills", () => {
  let cleanupDirs: string[] = [];

  beforeEach(() => {
    cleanupDirs = [];
  });

  afterEach(async () => {
    vi.unstubAllGlobals();
    for (const dir of cleanupDirs) {
      await rm(dir, { recursive: true, force: true });
    }
  });

  it("downloads a well-known skill and writes SKILL.md plus extra files into a temp dir", async () => {
    const indexBody = JSON.stringify({
      skills: [
        {
          name: "review",
          description: "Review code changes",
          files: ["SKILL.md", "rules/style.md"],
        },
      ],
    });

    const skillMd = `---\nname: review\ndescription: Review code changes\n---\n\n# review\n`;
    const styleMd = "# style rules\n";

    stubFetchWith([
      {
        url: "https://docs.example.com/.well-known/agent-skills/index.json",
        status: 200,
        body: indexBody,
      },
      {
        url: "https://docs.example.com/.well-known/agent-skills/review/SKILL.md",
        status: 200,
        body: skillMd,
      },
      {
        url: "https://docs.example.com/.well-known/agent-skills/review/rules/style.md",
        status: 200,
        body: styleMd,
      },
    ]);

    const baseDir = await fetchWellKnownSkills("https://docs.example.com");
    cleanupDirs.push(baseDir);

    const writtenManifest = await readFile(join(baseDir, "review", "SKILL.md"), "utf-8");
    expect(writtenManifest).toContain("name: review");

    const writtenStyle = await readFile(join(baseDir, "review", "rules", "style.md"), "utf-8");
    expect(writtenStyle).toBe(styleMd);
  });

  it("falls back from /.well-known/agent-skills/ to /.well-known/skills/", async () => {
    const indexBody = JSON.stringify({
      skills: [
        {
          name: "legacy",
          description: "Legacy skill",
          files: ["SKILL.md"],
        },
      ],
    });

    const skillMd = `---\nname: legacy\ndescription: Legacy skill\n---\n`;

    stubFetchWith([
      {
        url: "https://docs.example.com/.well-known/skills/index.json",
        status: 200,
        body: indexBody,
      },
      {
        url: "https://docs.example.com/.well-known/skills/legacy/SKILL.md",
        status: 200,
        body: skillMd,
      },
    ]);

    const baseDir = await fetchWellKnownSkills("https://docs.example.com");
    cleanupDirs.push(baseDir);

    const written = await readFile(join(baseDir, "legacy", "SKILL.md"), "utf-8");
    expect(written).toContain("legacy");
  });

  it("rejects index entries with path-traversal segments and throws if no skills remain", async () => {
    const indexBody = JSON.stringify({
      skills: [
        {
          name: "evil",
          description: "evil",
          files: ["SKILL.md", "../../etc/passwd"],
        },
      ],
    });

    stubFetchWith([
      {
        url: "https://docs.example.com/.well-known/agent-skills/index.json",
        status: 200,
        body: indexBody,
      },
    ]);

    await expect(fetchWellKnownSkills("https://docs.example.com")).rejects.toThrow(/well-known/i);
  });

  it("filters to a specific skill when the URL points at /.well-known/agent-skills/<name>", async () => {
    const indexBody = JSON.stringify({
      skills: [
        {
          name: "alpha",
          description: "Alpha",
          files: ["SKILL.md"],
        },
        {
          name: "beta",
          description: "Beta",
          files: ["SKILL.md"],
        },
      ],
    });

    const skillMd = (name: string): string => `---\nname: ${name}\ndescription: ${name}\n---\n`;

    stubFetchWith([
      {
        url: "https://docs.example.com/.well-known/agent-skills/beta/.well-known/agent-skills/index.json",
        status: 404,
        body: "",
      },
      {
        url: "https://docs.example.com/.well-known/agent-skills/index.json",
        status: 200,
        body: indexBody,
      },
      {
        url: "https://docs.example.com/.well-known/agent-skills/alpha/SKILL.md",
        status: 200,
        body: skillMd("alpha"),
      },
      {
        url: "https://docs.example.com/.well-known/agent-skills/beta/SKILL.md",
        status: 200,
        body: skillMd("beta"),
      },
    ]);

    const baseDir = await fetchWellKnownSkills(
      "https://docs.example.com/.well-known/agent-skills/beta",
    );
    cleanupDirs.push(baseDir);

    const beta = await readFile(join(baseDir, "beta", "SKILL.md"), "utf-8");
    expect(beta).toContain("beta");

    await expect(readFile(join(baseDir, "alpha", "SKILL.md"), "utf-8")).rejects.toThrow();
  });
});
