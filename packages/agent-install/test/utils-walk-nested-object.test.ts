import { describe, expect, it } from "@voidzero-dev/vite-plus-test";

import { walkNestedObject } from "../src/utils/walk-nested-object.ts";

describe("walkNestedObject", () => {
  it("returns the nested object at the given path", () => {
    const root = { a: { b: { c: { leaf: 1 } } } };
    expect(walkNestedObject(root, ["a", "b", "c"])).toEqual({ leaf: 1 });
  });

  it("returns the root when segments is empty", () => {
    const root = { key: "value" };
    expect(walkNestedObject(root, [])).toBe(root);
  });

  it("returns undefined when a segment is missing", () => {
    expect(walkNestedObject({ a: {} }, ["a", "b"])).toBeUndefined();
  });

  it("returns undefined when a segment is not a plain object", () => {
    expect(walkNestedObject({ a: [1, 2] }, ["a"])).toBeUndefined();
    expect(walkNestedObject({ a: "scalar" }, ["a"])).toBeUndefined();
    expect(walkNestedObject({ a: null }, ["a"])).toBeUndefined();
  });

  it("returns undefined when the final segment is not a plain object", () => {
    expect(walkNestedObject({ a: { b: 42 } }, ["a", "b"])).toBeUndefined();
  });
});
