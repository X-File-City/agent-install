import { MAX_SKILL_NAME_LENGTH } from "../skill/constants.ts";

export const sanitizeName = (name: string): string => {
  const normalized = name
    .toLowerCase()
    .replace(/[^a-z0-9._]+/g, "-")
    .replace(/^[.-]+|[.-]+$/g, "");

  return normalized.substring(0, MAX_SKILL_NAME_LENGTH) || "unnamed-skill";
};
