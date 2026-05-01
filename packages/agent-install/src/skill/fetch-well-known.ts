import { mkdir, mkdtemp, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";

import { isPathSafe } from "../utils/is-path-safe.ts";
import { isPlainObject } from "../utils/is-plain-object.ts";
import { sanitizeName } from "../utils/sanitize-name.ts";
import { stripTrailingSlash } from "../utils/strip-trailing-slash.ts";
import { DEFAULT_FETCH_TIMEOUT_MS, WELL_KNOWN_INDEX_FILE, WELL_KNOWN_PATHS } from "./constants.ts";

interface WellKnownIndexEntry {
  name: string;
  description: string;
  files: string[];
}

interface ResolvedWellKnownIndex {
  entries: WellKnownIndexEntry[];
  baseUrl: string;
  wellKnownPath: string;
  requestedSkillName?: string;
}

interface IndexCandidate {
  indexUrl: string;
  baseUrl: string;
  wellKnownPath: string;
}

const TEMP_PREFIX = "agent-install-well-known-";
const SKILL_NAME_PATTERN = /^[a-z0-9]([a-z0-9-]{0,62}[a-z0-9])?$/;

class WellKnownTimeoutError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "WellKnownTimeoutError";
  }
}

const isValidWellKnownEntry = (value: unknown): value is WellKnownIndexEntry => {
  if (!isPlainObject(value)) return false;
  if (typeof value.name !== "string" || !value.name) return false;
  if (typeof value.description !== "string" || !value.description) return false;
  if (!Array.isArray(value.files) || value.files.length === 0) return false;

  if (value.name.length > 1 && !SKILL_NAME_PATTERN.test(value.name)) return false;
  if (value.name.length === 1 && !/^[a-z0-9]$/.test(value.name)) return false;

  for (const file of value.files) {
    if (typeof file !== "string") return false;
    if (file.startsWith("/") || file.startsWith("\\") || file.includes("..")) return false;
  }

  return value.files.some((file) => typeof file === "string" && file.toLowerCase() === "skill.md");
};

const fetchOk = async (url: string): Promise<Response | null> => {
  try {
    const response = await fetch(url, {
      signal: AbortSignal.timeout(DEFAULT_FETCH_TIMEOUT_MS),
    });
    return response.ok ? response : null;
  } catch (error) {
    if (error instanceof DOMException && error.name === "TimeoutError") {
      throw new WellKnownTimeoutError(`Request timed out: ${url}`);
    }
    return null;
  }
};

const buildIndexCandidates = (inputUrl: string): IndexCandidate[] => {
  const parsed = new URL(inputUrl);
  const basePath = stripTrailingSlash(parsed.pathname);
  const candidates: IndexCandidate[] = [];

  for (const wellKnownPath of WELL_KNOWN_PATHS) {
    candidates.push({
      indexUrl: `${parsed.protocol}//${parsed.host}${basePath}/${wellKnownPath}/${WELL_KNOWN_INDEX_FILE}`,
      baseUrl: `${parsed.protocol}//${parsed.host}${basePath}`,
      wellKnownPath,
    });
    if (basePath) {
      candidates.push({
        indexUrl: `${parsed.protocol}//${parsed.host}/${wellKnownPath}/${WELL_KNOWN_INDEX_FILE}`,
        baseUrl: `${parsed.protocol}//${parsed.host}`,
        wellKnownPath,
      });
    }
  }

  return candidates;
};

const extractRequestedSkillName = (inputUrl: string): string | undefined => {
  try {
    const parsed = new URL(inputUrl);
    const match = parsed.pathname.match(/\/.well-known\/(?:agent-skills|skills)\/([^/]+)\/?$/);
    const name = match?.[1];
    return name && name !== WELL_KNOWN_INDEX_FILE ? name : undefined;
  } catch {
    return undefined;
  }
};

const validateIndexEntries = (payload: unknown): WellKnownIndexEntry[] | null => {
  if (!isPlainObject(payload)) return null;
  const { skills } = payload;
  if (!Array.isArray(skills)) return null;
  if (!skills.every(isValidWellKnownEntry)) return null;
  return skills;
};

const resolveIndex = async (inputUrl: string): Promise<ResolvedWellKnownIndex | null> => {
  for (const candidate of buildIndexCandidates(inputUrl)) {
    const response = await fetchOk(candidate.indexUrl);
    if (!response) continue;

    let payload: unknown;
    try {
      payload = await response.json();
    } catch {
      continue;
    }

    const entries = validateIndexEntries(payload);
    if (!entries) continue;

    return {
      entries,
      baseUrl: candidate.baseUrl,
      wellKnownPath: candidate.wellKnownPath,
      requestedSkillName: extractRequestedSkillName(inputUrl),
    };
  }
  return null;
};

const writeSkillFiles = async (
  resolved: ResolvedWellKnownIndex,
  entry: WellKnownIndexEntry,
  rootDir: string,
): Promise<boolean> => {
  const skillDir = join(rootDir, sanitizeName(entry.name));
  await mkdir(skillDir, { recursive: true });

  const skillBaseUrl = `${stripTrailingSlash(resolved.baseUrl)}/${resolved.wellKnownPath}/${entry.name}`;

  let installedAny = false;
  await Promise.all(
    entry.files.map(async (relativePath) => {
      const targetPath = join(skillDir, relativePath);
      // Defense in depth: even though the index validator rejects ".." and
      // leading separators, a Windows drive-letter relative path could still
      // escape via path.join. Reject anything that resolves outside skillDir.
      if (!isPathSafe(skillDir, targetPath)) return;

      const response = await fetchOk(`${skillBaseUrl}/${relativePath}`);
      if (!response) return;

      const content = await response.text();
      await mkdir(dirname(targetPath), { recursive: true });
      await writeFile(targetPath, content, "utf-8");
      installedAny = true;
    }),
  );

  return installedAny;
};

export const fetchWellKnownSkills = async (inputUrl: string): Promise<string> => {
  const resolved = await resolveIndex(inputUrl).catch((error: unknown) => {
    if (error instanceof WellKnownTimeoutError) {
      throw new Error(
        `Timed out resolving well-known skills index at ${inputUrl}. ` +
          `Set the source's HTTP server to respond faster, or pass a local path.`,
      );
    }
    throw error;
  });

  if (!resolved) {
    throw new Error(
      `No /.well-known/agent-skills/index.json (or fallback /.well-known/skills/index.json) found at ${inputUrl}`,
    );
  }

  const entries = resolved.requestedSkillName
    ? resolved.entries.filter((entry) => entry.name === resolved.requestedSkillName)
    : resolved.entries;

  if (entries.length === 0) {
    throw new Error(
      resolved.requestedSkillName
        ? `Skill "${resolved.requestedSkillName}" not found in well-known index at ${inputUrl}`
        : `Well-known index at ${inputUrl} declares no skills`,
    );
  }

  const baseDir = await mkdtemp(join(tmpdir(), TEMP_PREFIX));
  const installResults = await Promise.all(
    entries.map((entry) => writeSkillFiles(resolved, entry, baseDir)),
  );

  if (!installResults.some(Boolean)) {
    throw new Error(`Failed to fetch any skill files from well-known index at ${inputUrl}`);
  }

  return baseDir;
};
