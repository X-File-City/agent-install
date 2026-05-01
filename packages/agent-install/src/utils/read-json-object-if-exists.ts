import { readFile } from "node:fs/promises";

import { isPlainObject } from "./is-plain-object.ts";

export const readJsonObjectIfExists = async (
  path: string,
): Promise<Record<string, unknown> | null> => {
  try {
    const content = await readFile(path, "utf-8");
    const parsed = JSON.parse(content);
    return isPlainObject(parsed) ? parsed : null;
  } catch {
    return null;
  }
};
