import { mkdir, mkdtemp, readFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";

import { afterEach, beforeEach, describe, expect, it, vi } from "@voidzero-dev/vite-plus-test";

import { installSkillsFromSource } from "../src/skill/install-skills-from-source.ts";

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

describe("installSkillsFromSource over well-known endpoint", () => {
  let projectRoot: string;

  beforeEach(async () => {
    projectRoot = await mkdtemp(join(tmpdir(), "agent-install-wk-install-"));
    await mkdir(projectRoot, { recursive: true });
  });

  afterEach(async () => {
    vi.unstubAllGlobals();
    await rm(projectRoot, { recursive: true, force: true });
  });

  it("fetches via /.well-known/agent-skills/ and installs into the canonical project dir", async () => {
    const indexBody = JSON.stringify({
      skills: [
        {
          name: "well-known-skill",
          description: "From well-known",
          files: ["SKILL.md"],
        },
      ],
    });
    const skillMd = `---\nname: well-known-skill\ndescription: From well-known\n---\n\n# body\n`;

    stubFetchWith([
      {
        url: "https://docs.example.com/.well-known/agent-skills/index.json",
        status: 200,
        body: indexBody,
      },
      {
        url: "https://docs.example.com/.well-known/agent-skills/well-known-skill/SKILL.md",
        status: 200,
        body: skillMd,
      },
    ]);

    const result = await installSkillsFromSource({
      source: "https://docs.example.com",
      agents: ["cursor"],
      cwd: projectRoot,
      mode: "symlink",
      global: false,
    });

    expect(result.failed).toEqual([]);
    expect(result.installed.map((entry) => entry.skill)).toEqual(["well-known-skill"]);

    const installedManifest = await readFile(
      join(projectRoot, ".agents", "skills", "well-known-skill", "SKILL.md"),
      "utf-8",
    );
    expect(installedManifest).toContain("name: well-known-skill");
  });

  it("rejects the whole index when any entry contains a traversal segment", async () => {
    const indexBody = JSON.stringify({
      skills: [
        { name: "evil-skill", description: "evil", files: ["SKILL.md", "../../etc/passwd"] },
      ],
    });

    stubFetchWith([
      {
        url: "https://docs.example.com/.well-known/agent-skills/index.json",
        status: 200,
        body: indexBody,
      },
    ]);

    await expect(
      installSkillsFromSource({
        source: "https://docs.example.com",
        agents: ["cursor"],
        cwd: projectRoot,
        global: false,
      }),
    ).rejects.toThrow(/well-known/i);
  });
});
