import { describe, expect, it } from "@voidzero-dev/vite-plus-test";

import { toErrorMessage } from "../src/utils/to-error-message.ts";

describe("toErrorMessage", () => {
  it("returns the message of an Error", () => {
    expect(toErrorMessage(new Error("boom"))).toBe("boom");
  });

  it("returns the default fallback for non-Error values", () => {
    expect(toErrorMessage("a string")).toBe("Unknown error");
    expect(toErrorMessage(42)).toBe("Unknown error");
    expect(toErrorMessage(null)).toBe("Unknown error");
    expect(toErrorMessage(undefined)).toBe("Unknown error");
    expect(toErrorMessage({})).toBe("Unknown error");
  });

  it("honors a custom fallback", () => {
    expect(toErrorMessage("nope", "custom fallback")).toBe("custom fallback");
    expect(toErrorMessage(null, "another")).toBe("another");
  });

  it("uses the Error message even when a fallback is provided", () => {
    expect(toErrorMessage(new Error("specific"), "fallback")).toBe("specific");
  });

  it("works for subclasses of Error", () => {
    class CustomError extends Error {}
    expect(toErrorMessage(new CustomError("custom"))).toBe("custom");
  });
});
