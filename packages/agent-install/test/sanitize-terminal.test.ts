import { describe, expect, it } from "vitest";

import { sanitizeMetadata } from "../src/utils/sanitize-metadata.ts";
import { stripTerminalEscapes } from "../src/utils/strip-terminal-escapes.ts";

describe("stripTerminalEscapes: CSI sequences", () => {
  it("strips SGR color codes", () => {
    expect(stripTerminalEscapes("\x1b[31mred text\x1b[0m")).toBe("red text");
    expect(stripTerminalEscapes("\x1b[1;32mbold green\x1b[0m")).toBe("bold green");
    expect(stripTerminalEscapes("\x1b[38;5;145mextended color\x1b[0m")).toBe("extended color");
  });

  it("strips cursor movement sequences", () => {
    expect(stripTerminalEscapes("\x1b[H")).toBe("");
    expect(stripTerminalEscapes("\x1b[5;10H")).toBe("");
    expect(stripTerminalEscapes("\x1b[A")).toBe("");
    expect(stripTerminalEscapes("\x1b[10B")).toBe("");
    expect(stripTerminalEscapes("\x1b[C")).toBe("");
    expect(stripTerminalEscapes("\x1b[D")).toBe("");
  });

  it("strips screen clear sequences", () => {
    expect(stripTerminalEscapes("\x1b[2J")).toBe("");
    expect(stripTerminalEscapes("\x1b[3J")).toBe("");
    expect(stripTerminalEscapes("\x1b[K")).toBe("");
    expect(stripTerminalEscapes("\x1b[2K")).toBe("");
  });

  it("strips scroll sequences", () => {
    expect(stripTerminalEscapes("\x1b[S")).toBe("");
    expect(stripTerminalEscapes("\x1b[T")).toBe("");
  });
});

describe("stripTerminalEscapes: OSC sequences", () => {
  it("strips window title changes", () => {
    expect(stripTerminalEscapes("\x1b]0;malicious title\x07")).toBe("");
    expect(stripTerminalEscapes("\x1b]0;[POC] hijacked\x07rest")).toBe("rest");
  });

  it("strips OSC with ST terminator", () => {
    expect(stripTerminalEscapes("\x1b]0;title\x1b\\")).toBe("");
  });

  it("strips hyperlink sequences", () => {
    expect(stripTerminalEscapes("\x1b]8;;https://evil.com\x07click\x1b]8;;\x07")).toBe("click");
  });
});

describe("stripTerminalEscapes: simple escapes and control characters", () => {
  it("strips save/restore cursor", () => {
    expect(stripTerminalEscapes("\x1b7text\x1b8")).toBe("text");
  });

  it("strips two-byte escapes", () => {
    expect(stripTerminalEscapes("\x1bM")).toBe("");
    expect(stripTerminalEscapes("\x1bc")).toBe("");
  });

  it("strips BEL, BS, CR, and null bytes but keeps tab and newline", () => {
    expect(stripTerminalEscapes("hello\x07world")).toBe("helloworld");
    expect(stripTerminalEscapes("hello\x08world")).toBe("helloworld");
    expect(stripTerminalEscapes("hello\rworld")).toBe("helloworld");
    expect(stripTerminalEscapes("hello\x00world")).toBe("helloworld");
    expect(stripTerminalEscapes("hello\tworld")).toBe("hello\tworld");
    expect(stripTerminalEscapes("hello\nworld")).toBe("hello\nworld");
  });

  it("strips C1 control codes", () => {
    expect(stripTerminalEscapes("hello\x9bworld")).toBe("helloworld");
    expect(stripTerminalEscapes("hello\x9dworld")).toBe("helloworld");
  });
});

describe("stripTerminalEscapes: normal text passthrough", () => {
  it("passes ASCII, unicode, and emoji through", () => {
    expect(stripTerminalEscapes("hello world")).toBe("hello world");
    expect(stripTerminalEscapes("hello 日本語 world")).toBe("hello 日本語 world");
    expect(stripTerminalEscapes("hello 🎉 world")).toBe("hello 🎉 world");
  });
});

describe("stripTerminalEscapes: real-world attack payloads", () => {
  it("strips a combined title+clear+cursor+SGR payload", () => {
    const malicious =
      "\x1b]0;[POC] agent-install output hijacked\x07" +
      "\x1b[3J" +
      "\x1b[2J" +
      "\x1b[H" +
      "\x1b[31m[POC] Terminal output injected from SKILL.md\x1b[0m\n" +
      "\x1b[33mThis cleared the screen and overwrote CLI output.\x1b[0m";
    const result = stripTerminalEscapes(malicious);
    expect(result).not.toContain("\x1b");
    expect(result).not.toContain("\x07");
    expect(result).toContain("[POC] Terminal output injected from SKILL.md");
    expect(result).toContain("This cleared the screen and overwrote CLI output.");
  });

  it("strips concealed-text attacks", () => {
    expect(stripTerminalEscapes("safe-skill\x1b[8m(downloads malware)\x1b[0m")).toBe(
      "safe-skill(downloads malware)",
    );
  });

  it("strips clear + fake output payloads", () => {
    expect(stripTerminalEscapes("safe-skill\x1b[2J\x1b[H\x1b[32m✓ Verified Safe\x1b[0m")).toBe(
      "safe-skill✓ Verified Safe",
    );
  });
});

describe("sanitizeMetadata", () => {
  it("strips escapes and trims", () => {
    expect(sanitizeMetadata("  \x1b[31mhello\x1b[0m  ")).toBe("hello");
  });

  it("collapses newlines into spaces", () => {
    expect(sanitizeMetadata("line1\nline2\nline3")).toBe("line1 line2 line3");
  });

  it("collapses CRLF into a single space", () => {
    expect(sanitizeMetadata("line1\r\nline2")).toBe("line1 line2");
  });

  it("handles the full POC payload", () => {
    const malicious =
      "\u001b]0;[POC] hijacked\u0007\u001b[3J\u001b[2J\u001b[H" +
      "\u001b[31m[POC] Injected from SKILL.md\u001b[0m\n" +
      "\u001b[33mThis cleared the screen.\u001b[0m";
    expect(sanitizeMetadata(malicious)).toBe(
      "[POC] Injected from SKILL.md This cleared the screen.",
    );
  });

  it("passes normal names and descriptions through unchanged", () => {
    expect(sanitizeMetadata("next-best-practices")).toBe("next-best-practices");
    expect(sanitizeMetadata("AI SDK")).toBe("AI SDK");
    expect(sanitizeMetadata("Build UIs with @nuxt/ui v4")).toBe("Build UIs with @nuxt/ui v4");
  });
});
