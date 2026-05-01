import { execFile } from "node:child_process";
import { existsSync, mkdtempSync, rmSync } from "node:fs";
import { mkdir, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { promisify } from "node:util";

const execFileAsync = promisify(execFile);

const HERE = dirname(fileURLToPath(import.meta.url));
export const PACKAGE_ROOT = resolve(HERE, "..", "..");
export const BIN_PATH = join(PACKAGE_ROOT, "bin", "agent-install.mjs");
export const DIST_PATH = join(PACKAGE_ROOT, "dist");

const E2E_MAX_BUFFER_BYTES = 10 * 1024 * 1024;
const E2E_DEFAULT_TIMEOUT_MS = 20_000;

export interface CliResult {
  stdout: string;
  stderr: string;
  exitCode: number;
}

export interface RunCliOptions {
  cwd?: string;
  env?: Record<string, string | undefined>;
  timeoutMs?: number;
  input?: string;
}

export const ensureBuildExists = (): void => {
  if (!existsSync(BIN_PATH) || !existsSync(join(DIST_PATH, "cli.js"))) {
    throw new Error(
      `E2E precondition failed: ${BIN_PATH} or ${DIST_PATH}/cli.js missing. Run \`pnpm build\` first.`,
    );
  }
};

export const runCli = async (args: string[], options: RunCliOptions = {}): Promise<CliResult> => {
  ensureBuildExists();

  const spawnEnv: NodeJS.ProcessEnv = { ...process.env };
  if (options.env) {
    for (const [key, value] of Object.entries(options.env)) {
      if (value === undefined) delete spawnEnv[key];
      else spawnEnv[key] = value;
    }
  }

  try {
    const child = execFileAsync(process.execPath, [BIN_PATH, ...args], {
      cwd: options.cwd,
      env: spawnEnv,
      encoding: "utf-8",
      maxBuffer: E2E_MAX_BUFFER_BYTES,
      timeout: options.timeoutMs ?? E2E_DEFAULT_TIMEOUT_MS,
    });

    if (options.input !== undefined && child.child.stdin) {
      child.child.stdin.write(options.input);
      child.child.stdin.end();
    }

    const { stdout, stderr } = await child;
    return { stdout, stderr, exitCode: 0 };
  } catch (err: unknown) {
    const error = err as {
      stdout?: string;
      stderr?: string;
      code?: number | string;
      killed?: boolean;
      signal?: string;
    };
    const numericCode = typeof error.code === "number" ? error.code : 1;
    return {
      stdout: error.stdout ?? "",
      stderr: error.stderr ?? "",
      exitCode: numericCode,
    };
  }
};

export interface IsolatedWorkspace {
  cwd: string;
  home: string;
  xdgConfigHome: string;
  env: Record<string, string>;
  cleanup: () => void;
}

export const createIsolatedWorkspace = (): IsolatedWorkspace => {
  const root = mkdtempSync(join(tmpdir(), "agent-install-e2e-"));
  const cwd = join(root, "project");
  const home = join(root, "home");
  const xdgConfigHome = join(home, ".config");
  return {
    cwd,
    home,
    xdgConfigHome,
    env: {
      HOME: home,
      XDG_CONFIG_HOME: xdgConfigHome,
      CLAUDE_CONFIG_DIR: join(home, ".claude"),
      CODEX_HOME: join(home, ".codex"),
      VIBE_HOME: join(home, ".vibe"),
      USERPROFILE: home,
      APPDATA: join(home, "AppData", "Roaming"),
    },
    cleanup: () => rmSync(root, { recursive: true, force: true }),
  };
};

export const setupWorkspaceDirectories = async (workspace: IsolatedWorkspace): Promise<void> => {
  await mkdir(workspace.cwd, { recursive: true });
  await mkdir(workspace.home, { recursive: true });
  await mkdir(workspace.xdgConfigHome, { recursive: true });
};

export const writeSkillFixture = async (
  parentDir: string,
  skillName: string,
  description = "A fixture skill used in end-to-end tests.",
): Promise<string> => {
  const skillDir = join(parentDir, skillName);
  await mkdir(skillDir, { recursive: true });
  const manifest = `---
name: ${skillName}
description: ${description}
---

# ${skillName}

Instructions for testing purposes only.
`;
  await writeFile(join(skillDir, "SKILL.md"), manifest, "utf-8");
  return skillDir;
};

export const writeFileAt = async (path: string, contents: string): Promise<void> => {
  await mkdir(dirname(path), { recursive: true });
  await writeFile(path, contents, "utf-8");
};
