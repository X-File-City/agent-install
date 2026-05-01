import { spawn } from "node:child_process";
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join, normalize, resolve, sep } from "node:path";

import { DEFAULT_CLONE_TIMEOUT_MS, MS_PER_SECOND } from "./constants.ts";

const CLONE_TIMEOUT_ENV_VAR = "AGENT_INSTALL_CLONE_TIMEOUT_MS";
const LEGACY_CLONE_TIMEOUT_ENV_VAR = "SKILL_INSTALL_CLONE_TIMEOUT_MS";
const TEMP_CLONE_PREFIX = "agent-install-";

export type GitCloneErrorKind = "timeout" | "auth" | "unknown";

export class GitCloneError extends Error {
  readonly url: string;
  readonly kind: GitCloneErrorKind;

  constructor(message: string, url: string, kind: GitCloneErrorKind = "unknown") {
    super(message);
    this.name = "GitCloneError";
    this.url = url;
    this.kind = kind;
  }

  get isTimeout(): boolean {
    return this.kind === "timeout";
  }

  get isAuthError(): boolean {
    return this.kind === "auth";
  }
}

const resolveCloneTimeoutMs = (): number => {
  const raw = process.env[CLONE_TIMEOUT_ENV_VAR] ?? process.env[LEGACY_CLONE_TIMEOUT_ENV_VAR];
  if (!raw) return DEFAULT_CLONE_TIMEOUT_MS;
  const parsed = Number.parseInt(raw, 10);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : DEFAULT_CLONE_TIMEOUT_MS;
};

interface SpawnResult {
  code: number;
  stderr: string;
  timedOut: boolean;
}

const runGit = (args: string[], timeoutMs: number): Promise<SpawnResult> =>
  new Promise((resolvePromise) => {
    const child = spawn("git", args, {
      env: {
        ...process.env,
        GIT_TERMINAL_PROMPT: "0",
        GIT_LFS_SKIP_SMUDGE: "1",
      },
    });

    let stderr = "";
    let timedOut = false;
    const timer = setTimeout(() => {
      timedOut = true;
      child.kill("SIGKILL");
    }, timeoutMs);

    child.stderr.on("data", (chunk: Buffer) => {
      stderr += chunk.toString();
    });

    child.on("close", (code) => {
      clearTimeout(timer);
      resolvePromise({ code: code ?? 1, stderr, timedOut });
    });

    child.on("error", (err) => {
      clearTimeout(timer);
      stderr += err.message;
      resolvePromise({ code: 1, stderr, timedOut });
    });
  });

const AUTH_ERROR_MARKERS = [
  "Authentication failed",
  "could not read Username",
  "Permission denied",
  "Repository not found",
];

const isAuthErrorMessage = (stderr: string): boolean =>
  AUTH_ERROR_MARKERS.some((marker) => stderr.includes(marker));

export const cloneRepo = async (url: string, ref?: string): Promise<string> => {
  const tempDir = await mkdtemp(join(tmpdir(), TEMP_CLONE_PREFIX));
  const timeoutMs = resolveCloneTimeoutMs();

  const args = [
    "-c",
    "filter.lfs.required=false",
    "-c",
    "filter.lfs.smudge=",
    "-c",
    "filter.lfs.clean=",
    "-c",
    "filter.lfs.process=",
    "clone",
    "--depth",
    "1",
  ];
  if (ref) args.push("--branch", ref);
  args.push(url, tempDir);

  const { code, stderr, timedOut } = await runGit(args, timeoutMs);
  if (code === 0) return tempDir;

  await rm(tempDir, { recursive: true, force: true }).catch(() => {});

  if (timedOut) {
    const seconds = Math.round(timeoutMs / MS_PER_SECOND);
    throw new GitCloneError(
      `Clone timed out after ${seconds}s. Set ${CLONE_TIMEOUT_ENV_VAR} to raise the limit.`,
      url,
      "timeout",
    );
  }

  if (isAuthErrorMessage(stderr)) {
    throw new GitCloneError(
      `Authentication failed for ${url}. Check credentials or SSH keys.`,
      url,
      "auth",
    );
  }

  throw new GitCloneError(`Failed to clone ${url}: ${stderr.trim() || "unknown error"}`, url);
};

export const cleanupTempDir = async (dir: string): Promise<void> => {
  const normalizedDir = normalize(resolve(dir));
  const normalizedTmpDir = normalize(resolve(tmpdir()));

  if (!normalizedDir.startsWith(normalizedTmpDir + sep) && normalizedDir !== normalizedTmpDir) {
    throw new Error("Attempted to clean up directory outside of temp directory");
  }

  await rm(dir, { recursive: true, force: true });
};
