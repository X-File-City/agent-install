import { parse as parseYaml } from "yaml";

import { isPlainObject } from "../utils/is-plain-object.ts";

export interface Frontmatter {
  data: Record<string, unknown>;
  content: string;
}

export const parseFrontmatter = (raw: string): Frontmatter => {
  const match = raw.match(/^---\r?\n([\s\S]*?)\r?\n---\r?\n?([\s\S]*)$/);
  if (!match) {
    return { data: {}, content: raw };
  }

  const parsed = parseYaml(match[1] ?? "");
  const data = isPlainObject(parsed) ? parsed : {};
  return { data, content: match[2] ?? "" };
};
