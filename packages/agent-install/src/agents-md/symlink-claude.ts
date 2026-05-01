import { existsSync } from "node:fs";
import { copyFile, lstat, realpath, rename, symlink, unlink } from "node:fs/promises";
import { platform } from "node:os";
import { join } from "node:path";

import { AGENTS_MD_FILENAME, CLAUDE_MD_BACKUP_FILENAME, CLAUDE_MD_FILENAME } from "./constants.ts";

export interface SymlinkClaudeToAgentsOptions {
  cwd?: string;
  overwrite?: boolean;
  backupName?: string;
}

export interface SymlinkClaudeToAgentsResult {
  claudePath: string;
  agentsPath: string;
  created: boolean;
  alreadyLinked: boolean;
  backedUpTo?: string;
  fellBackToCopy?: boolean;
}

const WIN_SYMLINK_TYPE = "file" as const;

const isAlreadyLinkedToAgentsMd = async (
  claudePath: string,
  agentsPath: string,
): Promise<boolean> => {
  try {
    const stats = await lstat(claudePath);
    if (!stats.isSymbolicLink()) return false;
    const resolvedClaude = await realpath(claudePath);
    const resolvedAgents = await realpath(agentsPath);
    return resolvedClaude === resolvedAgents;
  } catch {
    return false;
  }
};

const createSymlinkOrCopy = async (
  agentsPath: string,
  claudePath: string,
): Promise<{ fellBackToCopy: boolean }> => {
  const symlinkType = platform() === "win32" ? WIN_SYMLINK_TYPE : undefined;
  try {
    await symlink(AGENTS_MD_FILENAME, claudePath, symlinkType);
    return { fellBackToCopy: false };
  } catch {
    await copyFile(agentsPath, claudePath);
    return { fellBackToCopy: true };
  }
};

export const symlinkClaudeToAgents = async (
  options: SymlinkClaudeToAgentsOptions = {},
): Promise<SymlinkClaudeToAgentsResult> => {
  const cwd = options.cwd ?? process.cwd();
  const agentsPath = join(cwd, AGENTS_MD_FILENAME);
  const claudePath = join(cwd, CLAUDE_MD_FILENAME);

  if (!existsSync(agentsPath)) {
    throw new Error(
      `Cannot create ${CLAUDE_MD_FILENAME} symlink: ${agentsPath} does not exist. Create ${AGENTS_MD_FILENAME} first.`,
    );
  }

  if (existsSync(claudePath)) {
    if (await isAlreadyLinkedToAgentsMd(claudePath, agentsPath)) {
      return { claudePath, agentsPath, created: false, alreadyLinked: true };
    }

    if (!options.overwrite) {
      return {
        claudePath,
        agentsPath,
        created: false,
        alreadyLinked: false,
      };
    }

    const backupPath = join(cwd, options.backupName ?? CLAUDE_MD_BACKUP_FILENAME);
    try {
      await rename(claudePath, backupPath);
      const { fellBackToCopy } = await createSymlinkOrCopy(agentsPath, claudePath);
      return {
        claudePath,
        agentsPath,
        created: true,
        alreadyLinked: false,
        backedUpTo: backupPath,
        fellBackToCopy,
      };
    } catch {
      await unlink(claudePath).catch(() => {});
    }
  }

  const { fellBackToCopy } = await createSymlinkOrCopy(agentsPath, claudePath);
  return {
    claudePath,
    agentsPath,
    created: true,
    alreadyLinked: false,
    fellBackToCopy,
  };
};
