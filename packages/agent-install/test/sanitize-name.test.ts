import { describe, expect, it } from "@voidzero-dev/vite-plus-test";

import { sanitizeName } from "../src/utils/sanitize-name.ts";

describe("sanitizeName: basic transformations", () => {
  it("converts to lowercase", () => {
    expect(sanitizeName("MySkill")).toBe("myskill");
    expect(sanitizeName("UPPERCASE")).toBe("uppercase");
  });

  it("replaces spaces with hyphens", () => {
    expect(sanitizeName("my skill")).toBe("my-skill");
    expect(sanitizeName("Convex Best Practices")).toBe("convex-best-practices");
  });

  it("collapses multiple spaces into a single hyphen", () => {
    expect(sanitizeName("my   skill")).toBe("my-skill");
  });

  it("preserves dots, underscores, and numbers", () => {
    expect(sanitizeName("bun.sh")).toBe("bun.sh");
    expect(sanitizeName("my_skill")).toBe("my_skill");
    expect(sanitizeName("skill.v2_beta")).toBe("skill.v2_beta");
    expect(sanitizeName("skill123")).toBe("skill123");
    expect(sanitizeName("v2.0")).toBe("v2.0");
  });
});

describe("sanitizeName: special characters", () => {
  it("replaces special characters with hyphens", () => {
    expect(sanitizeName("skill@name")).toBe("skill-name");
    expect(sanitizeName("skill#name")).toBe("skill-name");
    expect(sanitizeName("skill$name")).toBe("skill-name");
    expect(sanitizeName("skill!name")).toBe("skill-name");
  });

  it("collapses runs of special characters into a single hyphen", () => {
    expect(sanitizeName("skill@#$name")).toBe("skill-name");
    expect(sanitizeName("a!!!b")).toBe("a-b");
  });
});

describe("sanitizeName: path traversal prevention", () => {
  it("neutralises ../ traversal attempts", () => {
    expect(sanitizeName("../etc/passwd")).toBe("etc-passwd");
    expect(sanitizeName("../../secret")).toBe("secret");
  });

  it("neutralises backslash traversal attempts", () => {
    expect(sanitizeName("..\\..\\secret")).toBe("secret");
  });

  it("flattens absolute paths", () => {
    expect(sanitizeName("/etc/passwd")).toBe("etc-passwd");
    expect(sanitizeName("C:\\Windows\\System32")).toBe("c-windows-system32");
  });
});

describe("sanitizeName: leading/trailing cleanup", () => {
  it("strips leading dots", () => {
    expect(sanitizeName(".hidden")).toBe("hidden");
    expect(sanitizeName("..hidden")).toBe("hidden");
    expect(sanitizeName("...skill")).toBe("skill");
  });

  it("strips trailing dots", () => {
    expect(sanitizeName("skill.")).toBe("skill");
    expect(sanitizeName("skill..")).toBe("skill");
  });

  it("strips leading and trailing hyphens", () => {
    expect(sanitizeName("-skill")).toBe("skill");
    expect(sanitizeName("--skill")).toBe("skill");
    expect(sanitizeName("skill-")).toBe("skill");
    expect(sanitizeName("skill--")).toBe("skill");
  });

  it("strips mixed leading dots and hyphens", () => {
    expect(sanitizeName(".-.-skill")).toBe("skill");
    expect(sanitizeName("-.-.skill")).toBe("skill");
  });
});

describe("sanitizeName: edge cases", () => {
  it("returns 'unnamed-skill' for empty input", () => {
    expect(sanitizeName("")).toBe("unnamed-skill");
  });

  it("returns 'unnamed-skill' when every character is stripped", () => {
    expect(sanitizeName("...")).toBe("unnamed-skill");
    expect(sanitizeName("---")).toBe("unnamed-skill");
    expect(sanitizeName("@#$%")).toBe("unnamed-skill");
  });

  it("truncates to 255 characters", () => {
    const longName = "a".repeat(300);
    const result = sanitizeName(longName);
    expect(result.length).toBe(255);
    expect(result).toBe("a".repeat(255));
  });

  it("drops non-ASCII characters", () => {
    expect(sanitizeName("skill日本語")).toBe("skill");
    expect(sanitizeName("émoji🎉skill")).toBe("moji-skill");
  });
});

describe("sanitizeName: real-world examples", () => {
  it("handles GitHub repo-style names", () => {
    expect(sanitizeName("vercel/next.js")).toBe("vercel-next.js");
    expect(sanitizeName("owner/repo-name")).toBe("owner-repo-name");
  });

  it("handles URL-shaped inputs", () => {
    expect(sanitizeName("https://example.com")).toBe("https-example.com");
  });

  it("handles mintlify-style names", () => {
    expect(sanitizeName("docs.example.com")).toBe("docs.example.com");
    expect(sanitizeName("bun.sh")).toBe("bun.sh");
  });
});
