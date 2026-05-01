import { detectInstalledSkillAgents, getUniversalSkillAgents } from "./agents.ts";
import { fetchSkillManifestFromUrl } from "./fetch-url.ts";
import { cleanupTempDir, cloneRepo } from "./git.ts";
import { installSkillForAgent } from "./installer.ts";
import { discoverSkills, filterSkillsByName } from "./skills.ts";
import { parseSkillSource } from "./source-parser.ts";
import type {
  FailedSkillRecord,
  InstallSkillsFromSourceOptions,
  InstalledSkillRecord,
  ParsedSkillSource,
  Skill,
  SkillAgentType,
  SkillInstallResult,
} from "./types.ts";

interface ResolvedSource {
  basePath: string;
  subpath?: string;
  skillFilter?: string;
  cleanup?: () => Promise<void>;
}

const resolveSource = async (parsed: ParsedSkillSource): Promise<ResolvedSource> => {
  if (parsed.type === "local") {
    if (!parsed.localPath) throw new Error("Local source is missing a resolved path");
    return { basePath: parsed.localPath };
  }

  if (parsed.type === "url") {
    const baseDir = await fetchSkillManifestFromUrl(parsed.url);
    return { basePath: baseDir, cleanup: () => cleanupTempDir(baseDir) };
  }

  const cloneDir = await cloneRepo(parsed.url, parsed.ref);
  return {
    basePath: cloneDir,
    subpath: parsed.subpath,
    skillFilter: parsed.skillFilter,
    cleanup: () => cleanupTempDir(cloneDir),
  };
};

const resolveTargetAgents = async (
  requested: SkillAgentType[] | undefined,
): Promise<SkillAgentType[]> => {
  if (requested && requested.length > 0) return requested;
  const installed = await detectInstalledSkillAgents();
  return installed.length > 0 ? installed : getUniversalSkillAgents();
};

const resolveSkillFilters = (
  explicit: string[] | undefined,
  fromSource: string | undefined,
): string[] | undefined => {
  if (explicit && explicit.length > 0) return explicit;
  if (fromSource) return [fromSource];
  return undefined;
};

export const installSkillsFromSource = async (
  options: InstallSkillsFromSourceOptions,
): Promise<SkillInstallResult> => {
  const parsed = parseSkillSource(options.source);
  const resolved = await resolveSource(parsed);

  try {
    const filters = resolveSkillFilters(options.skills, resolved.skillFilter);
    const discovered = await discoverSkills(resolved.basePath, resolved.subpath);
    const skills: Skill[] = filters ? filterSkillsByName(discovered, filters) : discovered;

    if (skills.length === 0) {
      return { installed: [], failed: [], skills: [] };
    }

    const targetAgents = await resolveTargetAgents(options.agents);
    const installed: InstalledSkillRecord[] = [];
    const failed: FailedSkillRecord[] = [];

    for (const skill of skills) {
      for (const agent of targetAgents) {
        const result = await installSkillForAgent(skill, agent, {
          global: options.global,
          cwd: options.cwd,
          mode: options.mode,
        });

        if (result.success) {
          installed.push({
            skill: skill.name,
            agent,
            path: result.path,
            canonicalPath: result.canonicalPath,
            mode: result.mode,
            symlinkFailed: result.symlinkFailed,
          });
        } else {
          failed.push({ skill: skill.name, agent, error: result.error ?? "Unknown error" });
        }
      }
    }

    return { installed, failed, skills };
  } finally {
    await resolved.cleanup?.().catch(() => {});
  }
};
