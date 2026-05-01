export const AGENTS_DIR = ".agents";
export const SKILLS_SUBDIR = "skills";
export const CANONICAL_SKILLS_DIR = ".agents/skills";
export const SKILL_MANIFEST_FILE = "SKILL.md";

export const DEFAULT_CLONE_TIMEOUT_MS = 300_000;
export const DEFAULT_FETCH_TIMEOUT_MS = 30_000;
export const MAX_SKILL_NAME_LENGTH = 255;
export const MS_PER_SECOND = 1000;
export const MAX_SEARCH_DEPTH = 5;

export const SKIP_DISCOVERY_DIRS: ReadonlySet<string> = new Set([
  "node_modules",
  ".git",
  "dist",
  "build",
  "__pycache__",
  "coverage",
  ".next",
  ".turbo",
]);

export const COPY_EXCLUDE_FILES: ReadonlySet<string> = new Set(["metadata.json"]);
export const COPY_EXCLUDE_DIRS: ReadonlySet<string> = new Set([
  ".git",
  "__pycache__",
  "__pypackages__",
]);
