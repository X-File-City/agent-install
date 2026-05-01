import { isAbsolute, resolve } from "node:path";

import { escapeRegex } from "../utils/escape-regex.ts";
import { sanitizeSubpath } from "../utils/sanitize-subpath.ts";
import type { ParsedSkillSource } from "./types.ts";

type Host = "github" | "gitlab";

interface HostConfig {
  host: Host;
  domain: string;
  prefix: string;
  treePrefix: string;
  // GitHub repos live at /owner/repo with no nesting, so we tolerate trailing
  // path segments (e.g. /blob/main/file.md, /issues/123) and still extract owner/repo.
  // GitLab supports subgroups (/group/subgroup/project), so a lenient regex would
  // mis-parse subgroup URLs as owner/repo. We anchor GitLab strictly instead.
  anchorRepo: boolean;
}

const HOST_CONFIGS: HostConfig[] = [
  {
    host: "github",
    domain: "github.com",
    prefix: "github:",
    treePrefix: "/tree/",
    anchorRepo: false,
  },
  {
    host: "gitlab",
    domain: "gitlab.com",
    prefix: "gitlab:",
    treePrefix: "/-/tree/",
    anchorRepo: true,
  },
];

const HOST_BY_NAME = new Map<Host, HostConfig>(HOST_CONFIGS.map((config) => [config.host, config]));
const HOST_BY_DOMAIN = new Map<string, HostConfig>(
  HOST_CONFIGS.map((config) => [config.domain, config]),
);

const SSH_URL_PATTERN = /^git@([^:]+):([^/]+)\/([^/]+?)(?:\.git)?$/;

const isLocalPath = (input: string): boolean =>
  isAbsolute(input) ||
  input.startsWith("./") ||
  input.startsWith("../") ||
  input === "." ||
  input === ".." ||
  /^[a-zA-Z]:[/\\]/.test(input);

const isShorthandCandidate = (input: string): boolean =>
  !input.includes(":") && !input.startsWith(".") && !input.startsWith("/");

interface HostedSourceInput {
  host: Host;
  owner: string;
  repo: string;
  ref?: string;
  subpath?: string;
  skillFilter?: string;
}

const buildHostedSource = ({
  host,
  owner,
  repo,
  ref,
  subpath,
  skillFilter,
}: HostedSourceInput): ParsedSkillSource => {
  const config = HOST_BY_NAME.get(host);
  if (!config) throw new Error(`Unknown host: ${host}`);
  const cleanRepo = repo.replace(/\.git$/, "");
  const result: ParsedSkillSource = {
    type: host,
    url: `https://${config.domain}/${owner}/${cleanRepo}.git`,
  };
  if (ref) result.ref = ref;
  if (subpath) result.subpath = sanitizeSubpath(subpath);
  if (skillFilter) result.skillFilter = skillFilter;
  return result;
};

interface HostUrlPatterns {
  treeWithPath: RegExp;
  tree: RegExp;
  repo: RegExp;
}

const buildHostUrlPatterns = (config: HostConfig): HostUrlPatterns => {
  const domain = escapeRegex(config.domain);
  const treePrefix = escapeRegex(config.treePrefix);
  const repoPattern = config.anchorRepo
    ? `${domain}/([^/]+)/([^/]+?)(?:\\.git)?/?$`
    : `${domain}/([^/]+)/([^/]+)`;
  return {
    treeWithPath: new RegExp(`${domain}/([^/]+)/([^/]+)${treePrefix}([^/]+)/(.+)`),
    tree: new RegExp(`${domain}/([^/]+)/([^/]+)${treePrefix}([^/]+)$`),
    repo: new RegExp(repoPattern),
  };
};

const HOST_URL_PATTERNS = new Map<Host, HostUrlPatterns>(
  HOST_CONFIGS.map((config) => [config.host, buildHostUrlPatterns(config)]),
);

interface FragmentRefResult {
  inputWithoutFragment: string;
  ref?: string;
  skillFilter?: string;
}

const decodeFragmentValue = (value: string): string => {
  try {
    return decodeURIComponent(value);
  } catch {
    return value;
  }
};

const looksLikeGitSource = (input: string): boolean => {
  if (input.startsWith("git@")) return true;
  if (HOST_CONFIGS.some((config) => input.startsWith(config.prefix))) return true;

  if (input.startsWith("http://") || input.startsWith("https://")) {
    try {
      const parsed = new URL(input);
      const config = HOST_BY_DOMAIN.get(parsed.hostname);
      if (config) {
        const treePrefix = escapeRegex(config.treePrefix);
        return new RegExp(`^/[^/]+/[^/]+(?:\\.git)?(?:${treePrefix}[^/]+(?:/.*)?)?/?$`).test(
          parsed.pathname,
        );
      }
    } catch {
      return false;
    }
  }

  if (/^https?:\/\/.+\.git(?:$|[/?])/i.test(input)) return true;

  return isShorthandCandidate(input) && /^([^/]+)\/([^/]+)(?:\/(.+)|@(.+))?$/.test(input);
};

const parseFragmentRef = (input: string): FragmentRefResult => {
  const hashIndex = input.indexOf("#");
  if (hashIndex < 0) return { inputWithoutFragment: input };

  const inputWithoutFragment = input.slice(0, hashIndex);
  const fragment = input.slice(hashIndex + 1);
  if (!fragment || !looksLikeGitSource(inputWithoutFragment)) {
    return { inputWithoutFragment: input };
  }

  const atIndex = fragment.indexOf("@");
  if (atIndex === -1) {
    return { inputWithoutFragment, ref: decodeFragmentValue(fragment) };
  }

  const ref = fragment.slice(0, atIndex);
  const skillFilter = fragment.slice(atIndex + 1);
  return {
    inputWithoutFragment,
    ref: ref ? decodeFragmentValue(ref) : undefined,
    skillFilter: skillFilter ? decodeFragmentValue(skillFilter) : undefined,
  };
};

const isDirectSkillMdUrl = (input: string): boolean =>
  /^https?:\/\//.test(input) && /\bSKILL\.md(?:$|\?|#)/i.test(input);

const EXCLUDED_WELL_KNOWN_HOSTS = new Set(["raw.githubusercontent.com"]);

// We deliberately do NOT verify the index exists here; that happens lazily at install time.
const isWellKnownCandidate = (input: string): boolean => {
  if (!/^https?:\/\//.test(input)) return false;

  let parsed: URL;
  try {
    parsed = new URL(input);
  } catch {
    return false;
  }

  if (HOST_BY_DOMAIN.has(parsed.hostname)) return false;
  if (EXCLUDED_WELL_KNOWN_HOSTS.has(parsed.hostname)) return false;
  if (input.endsWith(".git")) return false;
  if (isDirectSkillMdUrl(input)) return false;

  return true;
};

const parseHostedShorthand = (
  rest: string,
  host: Host,
  fragmentRef?: string,
  fragmentSkillFilter?: string,
): ParsedSkillSource | null => {
  const atSkillMatch = rest.match(/^([^/]+)\/([^/@]+)@(.+)$/);
  if (atSkillMatch) {
    const [, owner, repo, skillFilter] = atSkillMatch;
    return buildHostedSource({
      host,
      owner,
      repo,
      ref: fragmentRef,
      skillFilter: fragmentSkillFilter ?? skillFilter,
    });
  }

  const shorthandMatch = rest.match(/^([^/]+)\/([^/]+)(?:\/(.+?))?\/?$/);
  if (shorthandMatch) {
    const [, owner, repo, subpath] = shorthandMatch;
    return buildHostedSource({
      host,
      owner,
      repo,
      ref: fragmentRef,
      subpath,
      skillFilter: fragmentSkillFilter,
    });
  }

  return null;
};

const isHostnameAuthoritative = (input: string, expectedHostname: string): boolean => {
  if (!input.startsWith("http://") && !input.startsWith("https://")) return false;
  try {
    return new URL(input).hostname === expectedHostname;
  } catch {
    return false;
  }
};

const parseHostUrl = (
  input: string,
  host: Host,
  fragmentRef?: string,
): ParsedSkillSource | null => {
  const config = HOST_BY_NAME.get(host);
  if (!config) return null;
  // We validate the hostname strictly via URL to defeat spoofing
  // (e.g. "https://example-github.com/owner/repo"), but match the regex on the
  // original input — `URL.pathname` normalizes "/../" segments, which would
  // bypass `sanitizeSubpath`'s traversal protection.
  if (!isHostnameAuthoritative(input, config.domain)) return null;

  const patterns = HOST_URL_PATTERNS.get(host);
  if (!patterns) return null;

  const treeWithPathMatch = input.match(patterns.treeWithPath);
  if (treeWithPathMatch) {
    const [, owner, repo, ref, subpath] = treeWithPathMatch;
    return buildHostedSource({ host, owner, repo, ref: ref || fragmentRef, subpath });
  }

  const treeMatch = input.match(patterns.tree);
  if (treeMatch) {
    const [, owner, repo, ref] = treeMatch;
    return buildHostedSource({ host, owner, repo, ref: ref || fragmentRef });
  }

  const repoMatch = input.match(patterns.repo);
  if (repoMatch) {
    const [, owner, repo] = repoMatch;
    return buildHostedSource({ host, owner, repo, ref: fragmentRef });
  }

  return null;
};

const parseSshUrl = (
  input: string,
  fragmentRef?: string,
  fragmentSkillFilter?: string,
): ParsedSkillSource | null => {
  const match = input.match(SSH_URL_PATTERN);
  if (!match) return null;
  const [, sshHost] = match;

  const knownHost = HOST_BY_DOMAIN.get(sshHost)?.host;
  const result: ParsedSkillSource = {
    type: knownHost ?? "git",
    url: input,
  };
  if (fragmentRef) result.ref = fragmentRef;
  if (fragmentSkillFilter) result.skillFilter = fragmentSkillFilter;
  return result;
};

export const parseSkillSource = (input: string): ParsedSkillSource => {
  if (!input || input.trim().length === 0) {
    throw new Error(
      "Invalid skill source: input is empty. Expected a local path, owner/repo shorthand, or URL.",
    );
  }

  if (isLocalPath(input)) {
    const resolvedPath = resolve(input);
    return { type: "local", url: resolvedPath, localPath: resolvedPath };
  }

  const {
    inputWithoutFragment,
    ref: fragmentRef,
    skillFilter: fragmentSkillFilter,
  } = parseFragmentRef(input);
  const normalized = inputWithoutFragment;

  for (const config of HOST_CONFIGS) {
    if (normalized.startsWith(config.prefix)) {
      const rest = normalized.slice(config.prefix.length);
      const result = parseHostedShorthand(rest, config.host, fragmentRef, fragmentSkillFilter);
      if (result) return result;
    }
  }

  if (normalized.startsWith("git@")) {
    const sshResult = parseSshUrl(normalized, fragmentRef, fragmentSkillFilter);
    if (sshResult) return sshResult;
  }

  for (const config of HOST_CONFIGS) {
    const result = parseHostUrl(normalized, config.host, fragmentRef);
    if (result) return result;
  }

  if (isDirectSkillMdUrl(normalized)) {
    return { type: "url", url: normalized };
  }

  if (isShorthandCandidate(normalized)) {
    const result = parseHostedShorthand(normalized, "github", fragmentRef, fragmentSkillFilter);
    if (result) return result;
  }

  if (isWellKnownCandidate(normalized)) {
    const wellKnownResult: ParsedSkillSource = { type: "well-known", url: normalized };
    if (fragmentSkillFilter) wellKnownResult.skillFilter = fragmentSkillFilter;
    return wellKnownResult;
  }

  const result: ParsedSkillSource = { type: "git", url: normalized };
  if (fragmentRef) result.ref = fragmentRef;
  return result;
};
