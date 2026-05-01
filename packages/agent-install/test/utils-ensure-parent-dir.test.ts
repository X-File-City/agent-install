import { existsSync, mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";

import { ensureParentDir } from "../src/utils/ensure-parent-dir.ts";

describe("ensureParentDir", () => {
  let root: string;

  beforeEach(() => {
    root = mkdtempSync(join(tmpdir(), "agent-install-ensure-parent-"));
  });

  afterEach(() => {
    rmSync(root, { recursive: true, force: true });
  });

  it("creates nested parent directories for a file path", () => {
    const filePath = join(root, "a", "b", "c", "file.txt");
    expect(existsSync(join(root, "a"))).toBe(false);
    ensureParentDir(filePath);
    expect(existsSync(join(root, "a", "b", "c"))).toBe(true);
  });

  it("is a no-op when the parent already exists", () => {
    const filePath = join(root, "only-file.txt");
    ensureParentDir(filePath);
    ensureParentDir(filePath);
    expect(existsSync(root)).toBe(true);
  });
});
