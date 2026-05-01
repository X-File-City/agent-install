import { describe, expect, it } from "vitest";

import { deleteNestedValue } from "../src/utils/delete-nested-value.ts";
import { getNestedValue } from "../src/utils/get-nested-value.ts";
import { setNestedValue } from "../src/utils/set-nested-value.ts";

describe("setNestedValue", () => {
  it("sets deeply nested values, creating intermediate objects", () => {
    const target: Record<string, unknown> = {};
    setNestedValue(target, "a.b.c", 42);
    expect(target).toEqual({ a: { b: { c: 42 } } });
  });

  it("preserves existing sibling keys", () => {
    const target: Record<string, unknown> = { a: { existing: 1 } };
    setNestedValue(target, "a.added", 2);
    expect(target).toEqual({ a: { existing: 1, added: 2 } });
  });

  it("refuses to write to __proto__, prototype, or constructor segments", () => {
    const target: Record<string, unknown> = {};
    expect(() => setNestedValue(target, "__proto__.polluted", true)).toThrow();
    expect(() => setNestedValue(target, "constructor.prototype.polluted", true)).toThrow();
    expect(() => setNestedValue(target, "a.prototype.polluted", true)).toThrow();
    // @ts-expect-error -- Object.prototype should be untouched
    expect(({} as Record<string, unknown>).polluted).toBeUndefined();
  });
});

describe("getNestedValue", () => {
  it("returns undefined for missing paths", () => {
    expect(getNestedValue({ a: {} }, "a.b.c")).toBeUndefined();
    expect(getNestedValue(null, "a")).toBeUndefined();
  });

  it("returns leaf values", () => {
    expect(getNestedValue({ a: { b: 3 } }, "a.b")).toBe(3);
  });
});

describe("deleteNestedValue", () => {
  it("deletes leaf keys", () => {
    const target: Record<string, unknown> = { a: { b: { c: 1, d: 2 } } };
    expect(deleteNestedValue(target, "a.b.c")).toBe(true);
    expect(target).toEqual({ a: { b: { d: 2 } } });
  });

  it("returns false for missing keys", () => {
    expect(deleteNestedValue({ a: {} }, "a.b.c")).toBe(false);
  });

  it("refuses to walk __proto__ / prototype / constructor", () => {
    const target: Record<string, unknown> = { a: { b: 1 } };
    expect(deleteNestedValue(target, "__proto__.foo")).toBe(false);
    expect(deleteNestedValue(target, "constructor.prototype.foo")).toBe(false);
  });
});
