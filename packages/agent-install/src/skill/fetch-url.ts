import { mkdir, mkdtemp, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";

import { DEFAULT_FETCH_TIMEOUT_MS, SKILL_MANIFEST_FILE } from "./constants.ts";
import { parseFrontmatter } from "./frontmatter.ts";
import { sanitizeName } from "../utils/sanitize-name.ts";

export const fetchSkillManifestFromUrl = async (url: string): Promise<string> => {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), DEFAULT_FETCH_TIMEOUT_MS);

  try {
    const response = await fetch(url, { signal: controller.signal });
    if (!response.ok) {
      throw new Error(`Failed to fetch ${url}: HTTP ${response.status}`);
    }

    const content = await response.text();
    const { data } = parseFrontmatter(content);

    if (typeof data.name !== "string" || !data.name) {
      throw new Error(`Fetched SKILL.md has no "name" in its frontmatter: ${url}`);
    }

    const skillName = sanitizeName(data.name);
    const baseDir = await mkdtemp(join(tmpdir(), "agent-install-url-"));
    const skillDir = join(baseDir, skillName);
    await mkdir(dirname(join(skillDir, SKILL_MANIFEST_FILE)), { recursive: true });
    await writeFile(join(skillDir, SKILL_MANIFEST_FILE), content, "utf-8");

    return baseDir;
  } finally {
    clearTimeout(timer);
  }
};
