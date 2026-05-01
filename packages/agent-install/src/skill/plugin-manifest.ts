import { dirname, join, resolve } from "node:path";

import { isPathSafe } from "../utils/is-path-safe.ts";
import { isPlainObject } from "../utils/is-plain-object.ts";
import { readJsonObjectIfExists } from "../utils/read-json-object-if-exists.ts";

const MARKETPLACE_RELATIVE_PATH = ".claude-plugin/marketplace.json";
const PLUGIN_RELATIVE_PATH = ".claude-plugin/plugin.json";
const PLUGIN_SKILLS_SUBDIR = "skills";

const isClaudeRelativePath = (input: unknown): input is string =>
  typeof input === "string" && input.startsWith("./");

const stringValueOrEmpty = (input: unknown): string => (typeof input === "string" ? input : "");

const resolvePluginRoot = (manifest: Record<string, unknown>): string | null => {
  if (!isPlainObject(manifest.metadata)) return "";
  const rawPluginRoot = manifest.metadata.pluginRoot;
  if (rawPluginRoot === undefined) return "";
  return isClaudeRelativePath(rawPluginRoot) ? rawPluginRoot : null;
};

const collectPluginSkillSearchDirs = (
  basePath: string,
  pluginBase: string,
  rawSkills: unknown,
  searchDirs: string[],
): void => {
  if (!isPathSafe(basePath, pluginBase)) return;

  if (Array.isArray(rawSkills)) {
    for (const entry of rawSkills) {
      if (!isClaudeRelativePath(entry)) continue;
      const skillDir = dirname(join(pluginBase, entry));
      if (isPathSafe(basePath, skillDir)) searchDirs.push(skillDir);
    }
  }

  searchDirs.push(join(pluginBase, PLUGIN_SKILLS_SUBDIR));
};

const collectPluginGroupings = (
  basePath: string,
  pluginBase: string,
  pluginName: string,
  rawSkills: unknown,
  groupings: Map<string, string>,
): void => {
  if (!isPathSafe(basePath, pluginBase) || !Array.isArray(rawSkills)) return;

  for (const entry of rawSkills) {
    if (!isClaudeRelativePath(entry)) continue;
    const skillDir = join(pluginBase, entry);
    if (!isPathSafe(basePath, skillDir)) continue;
    groupings.set(resolve(skillDir), pluginName);
  }
};

export const getPluginSkillPaths = async (basePath: string): Promise<string[]> => {
  const searchDirs: string[] = [];

  const marketplace = await readJsonObjectIfExists(join(basePath, MARKETPLACE_RELATIVE_PATH));
  if (marketplace) {
    const pluginRoot = resolvePluginRoot(marketplace);
    if (pluginRoot !== null && Array.isArray(marketplace.plugins)) {
      for (const plugin of marketplace.plugins) {
        if (!isPlainObject(plugin)) continue;
        if (plugin.source !== undefined && !isClaudeRelativePath(plugin.source)) continue;
        const pluginBase = join(basePath, pluginRoot, stringValueOrEmpty(plugin.source));
        collectPluginSkillSearchDirs(basePath, pluginBase, plugin.skills, searchDirs);
      }
    }
  }

  const single = await readJsonObjectIfExists(join(basePath, PLUGIN_RELATIVE_PATH));
  if (single) collectPluginSkillSearchDirs(basePath, basePath, single.skills, searchDirs);

  return searchDirs;
};

export const getPluginGroupings = async (basePath: string): Promise<Map<string, string>> => {
  const groupings = new Map<string, string>();

  const marketplace = await readJsonObjectIfExists(join(basePath, MARKETPLACE_RELATIVE_PATH));
  if (marketplace) {
    const pluginRoot = resolvePluginRoot(marketplace);
    if (pluginRoot !== null && Array.isArray(marketplace.plugins)) {
      for (const plugin of marketplace.plugins) {
        if (!isPlainObject(plugin)) continue;
        if (typeof plugin.name !== "string" || !plugin.name) continue;
        if (plugin.source !== undefined && !isClaudeRelativePath(plugin.source)) continue;
        const pluginBase = join(basePath, pluginRoot, stringValueOrEmpty(plugin.source));
        collectPluginGroupings(basePath, pluginBase, plugin.name, plugin.skills, groupings);
      }
    }
  }

  const single = await readJsonObjectIfExists(join(basePath, PLUGIN_RELATIVE_PATH));
  if (single && typeof single.name === "string" && single.name) {
    collectPluginGroupings(basePath, basePath, single.name, single.skills, groupings);
  }

  return groupings;
};
