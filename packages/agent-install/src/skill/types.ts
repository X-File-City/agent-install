export type SkillAgentType =
  | "claude-code"
  | "codex"
  | "cursor"
  | "droid"
  | "gemini-cli"
  | "github-copilot"
  | "goose"
  | "opencode"
  | "pi"
  | "windsurf"
  | "roo"
  | "cline"
  | "kilo"
  | "universal";

export type SkillSourceType = "local" | "github" | "gitlab" | "git" | "url";

export type InstallMode = "symlink" | "copy";

export interface ParsedSkillSource {
  type: SkillSourceType;
  url: string;
  localPath?: string;
  subpath?: string;
  ref?: string;
  skillFilter?: string;
}

export interface Skill {
  name: string;
  description: string;
  path: string;
  rawContent: string;
  metadata?: Record<string, unknown>;
}

export interface SkillAgentConfig {
  name: SkillAgentType;
  displayName: string;
  skillsDir: string;
  globalSkillsDir: string | undefined;
  detectInstalled: () => Promise<boolean>;
  isUniversal?: boolean;
}

export interface InstallSkillsFromSourceOptions {
  source: string;
  cwd?: string;
  agents?: SkillAgentType[];
  skills?: string[];
  mode?: InstallMode;
  global?: boolean;
}

export interface InstalledSkillRecord {
  skill: string;
  agent: SkillAgentType;
  path: string;
  canonicalPath?: string;
  mode: InstallMode;
  symlinkFailed?: boolean;
}

export interface FailedSkillRecord {
  skill: string;
  agent: SkillAgentType;
  error: string;
}

export interface SkillInstallResult {
  installed: InstalledSkillRecord[];
  failed: FailedSkillRecord[];
  skills: Skill[];
}
