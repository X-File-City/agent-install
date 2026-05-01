export {
  detectInstalledSkillAgents,
  getNonUniversalSkillAgents,
  getSkillAgentConfig,
  getSkillAgentDir,
  getSkillAgentTypes,
  getUniversalSkillAgents,
  isSkillAgentType,
  isUniversalSkillAgent,
  skillAgents,
} from "./agents.ts";
export { CANONICAL_SKILLS_DIR, SKILL_MANIFEST_FILE } from "./constants.ts";
export { fetchSkillManifestFromUrl } from "./fetch-url.ts";
export { fetchWellKnownSkills } from "./fetch-well-known.ts";
export { parseFrontmatter } from "./frontmatter.ts";
export { getPluginGroupings, getPluginSkillPaths } from "./plugin-manifest.ts";
export { GitCloneError, cleanupTempDir, cloneRepo } from "./git.ts";
export {
  installSkillsFromSource,
  installSkillsFromSource as add,
  installSkillsFromSource as install,
} from "./install-skills-from-source.ts";
export {
  getCanonicalSkillsDir,
  getSkillAgentBaseDir,
  installSkillForAgent,
  isSkillInstalledForAgent,
} from "./installer.ts";
export {
  discoverSkills,
  discoverSkills as discover,
  filterSkillsByName,
  getSkillDisplayName,
  parseSkillManifest,
} from "./skills.ts";
export { parseSkillSource, parseSkillSource as parseSource } from "./source-parser.ts";
export { sanitizeName } from "../utils/sanitize-name.ts";
export { sanitizeMetadata } from "../utils/sanitize-metadata.ts";

export type {
  FailedSkillRecord,
  InstallMode,
  InstalledSkillRecord,
  InstallSkillsFromSourceOptions,
  ParsedSkillSource,
  Skill,
  SkillAgentConfig,
  SkillAgentType,
  SkillInstallResult,
  SkillSourceType,
} from "./types.ts";
export type { GitCloneErrorKind } from "./git.ts";
