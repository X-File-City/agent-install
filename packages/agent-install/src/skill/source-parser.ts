import { isAbsolute, resolve } from "node:path";

import { sanitizeSubpath } from "../utils/sanitize-subpath.ts";
import type { ParsedSkillSource } from "./types.ts";

const isLocalPath = (input: string): boolean =>
  isAbsolute(input) ||
  input.startsWith("./") ||
  input.startsWith("../") ||
  input === "." ||
  input === ".." ||
  /^[a-zA-Z]:[/\\]/.test(input);

const isShorthandCandidate = (input: string): boolean =>
  !input.includes(":") && !input.startsWith(".") && !input.startsWith("/");

interface GithubSourceInput {
  owner: string;
  repo: string;
  ref?: string;
  subpath?: string;
  skillFilter?: string;
}

const buildGithubSource = ({
  owner,
  repo,
  ref,
  subpath,
  skillFilter,
}: GithubSourceInput): ParsedSkillSource => {
  const cleanRepo = repo.replace(/\.git$/, "");
  const result: ParsedSkillSource = {
    type: "github",
    url: `https://github.com/${owner}/${cleanRepo}.git`,
  };
  if (ref) result.ref = ref;
  if (subpath) result.subpath = sanitizeSubpath(subpath);
  if (skillFilter) result.skillFilter = skillFilter;
  return result;
};

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
  if (input.startsWith("github:") || input.startsWith("git@")) return true;

  if (input.startsWith("http://") || input.startsWith("https://")) {
    try {
      const parsed = new URL(input);
      if (parsed.hostname === "github.com") {
        return /^\/[^/]+\/[^/]+(?:\.git)?(?:\/tree\/[^/]+(?:\/.*)?)?\/?$/.test(parsed.pathname);
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

const appendFragmentRef = (input: string, ref?: string, skillFilter?: string): string => {
  if (!ref) return input;
  return `${input}#${ref}${skillFilter ? `@${skillFilter}` : ""}`;
};

const isDirectSkillMdUrl = (input: string): boolean =>
  /^https?:\/\//.test(input) && /\bSKILL\.md(?:$|\?|#)/i.test(input);

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

  const githubPrefixMatch = normalized.match(/^github:(.+)$/);
  if (githubPrefixMatch) {
    return parseSkillSource(
      appendFragmentRef(githubPrefixMatch[1], fragmentRef, fragmentSkillFilter),
    );
  }

  const githubTreeWithPathMatch = normalized.match(
    /github\.com\/([^/]+)\/([^/]+)\/tree\/([^/]+)\/(.+)/,
  );
  if (githubTreeWithPathMatch) {
    const [, owner, repo, ref, subpath] = githubTreeWithPathMatch;
    return buildGithubSource({ owner, repo, ref: ref || fragmentRef, subpath });
  }

  const githubTreeMatch = normalized.match(/github\.com\/([^/]+)\/([^/]+)\/tree\/([^/]+)$/);
  if (githubTreeMatch) {
    const [, owner, repo, ref] = githubTreeMatch;
    return buildGithubSource({ owner, repo, ref: ref || fragmentRef });
  }

  const githubRepoMatch = normalized.match(/github\.com\/([^/]+)\/([^/]+)/);
  if (githubRepoMatch) {
    const [, owner, repo] = githubRepoMatch;
    return buildGithubSource({ owner, repo, ref: fragmentRef });
  }

  if (isDirectSkillMdUrl(normalized)) {
    return { type: "url", url: normalized };
  }

  const atSkillMatch = normalized.match(/^([^/]+)\/([^/@]+)@(.+)$/);
  if (atSkillMatch && isShorthandCandidate(normalized)) {
    const [, owner, repo, skillFilter] = atSkillMatch;
    return buildGithubSource({
      owner,
      repo,
      ref: fragmentRef,
      skillFilter: fragmentSkillFilter || skillFilter,
    });
  }

  const shorthandMatch = normalized.match(/^([^/]+)\/([^/]+)(?:\/(.+?))?\/?$/);
  if (shorthandMatch && isShorthandCandidate(normalized)) {
    const [, owner, repo, subpath] = shorthandMatch;
    return buildGithubSource({
      owner,
      repo,
      ref: fragmentRef,
      subpath,
      skillFilter: fragmentSkillFilter,
    });
  }

  const result: ParsedSkillSource = { type: "git", url: normalized };
  if (fragmentRef) result.ref = fragmentRef;
  return result;
};
