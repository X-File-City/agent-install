import { describe, expect, it } from "@voidzero-dev/vite-plus-test";

import { isPlainObject } from "../src/utils/is-plain-object.ts";

describe("isPlainObject", () => {
  it("accepts plain objects", () => {
    expect(isPlainObject({})).toBe(true);
    expect(isPlainObject({ a: 1 })).toBe(true);
    expect(isPlainObject(Object.create(null))).toBe(true);
  });

  it("rejects arrays", () => {
    expect(isPlainObject([])).toBe(false);
    expect(isPlainObject([1, 2, 3])).toBe(false);
  });

  it("rejects null, undefined, and primitives", () => {
    expect(isPlainObject(null)).toBe(false);
    expect(isPlainObject(undefined)).toBe(false);
    expect(isPlainObject(0)).toBe(false);
    expect(isPlainObject("")).toBe(false);
    expect(isPlainObject("foo")).toBe(false);
    expect(isPlainObject(false)).toBe(false);
    expect(isPlainObject(Symbol("x"))).toBe(false);
  });

  it("narrows the type in the positive branch", () => {
    const value: unknown = { a: 1 };
    if (isPlainObject(value)) {
      expect(value.a).toBe(1);
    }
  });
});
