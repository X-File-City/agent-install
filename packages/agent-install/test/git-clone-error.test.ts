import { describe, expect, it } from "@voidzero-dev/vite-plus-test";

import { GitCloneError } from "../src/skill/git.ts";

describe("GitCloneError", () => {
  it("is an instance of Error with its own name", () => {
    const error = new GitCloneError("boom", "https://example.com/repo.git");
    expect(error).toBeInstanceOf(Error);
    expect(error.name).toBe("GitCloneError");
    expect(error.message).toBe("boom");
    expect(error.url).toBe("https://example.com/repo.git");
  });

  it("defaults kind to 'unknown'", () => {
    const error = new GitCloneError("plain", "u");
    expect(error.kind).toBe("unknown");
    expect(error.isTimeout).toBe(false);
    expect(error.isAuthError).toBe(false);
  });

  it("exposes boolean getters tied to kind", () => {
    const timeout = new GitCloneError("t", "u", "timeout");
    expect(timeout.isTimeout).toBe(true);
    expect(timeout.isAuthError).toBe(false);

    const auth = new GitCloneError("a", "u", "auth");
    expect(auth.isTimeout).toBe(false);
    expect(auth.isAuthError).toBe(true);

    const other = new GitCloneError("o", "u", "unknown");
    expect(other.isTimeout).toBe(false);
    expect(other.isAuthError).toBe(false);
  });
});
