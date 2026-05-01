---
"agent-install": minor
---

Add a namespaced Node API, expand remote source support to GitLab and SSH, and
close a hostname-spoofing parser bug.

**API**

- New top-level namespace exports: `import { skill, mcp, agentsMd } from "agent-install"`.
  Each surface gets short verbs that mirror the CLI: `skill.add`, `mcp.add`,
  `mcp.list`, `mcp.remove`, `agentsMd.setSection`, `agentsMd.removeSection`,
  `agentsMd.read`, `agentsMd.write`, `agentsMd.symlinkClaude`. The long-form
  names (`installSkillsFromSource`, `installMcpServer`, `upsertAgentsMdSection`,
  etc.) are kept as aliases.

**Sources**

- Skills can now be installed from GitLab as a first-class source: full GitLab
  repo URLs, `/-/tree/<ref>/<subpath>` URLs, the `gitlab:owner/repo` shorthand
  prefix (with subpath / `@filter` / `#ref` modifiers), and SSH URLs to
  `gitlab.com`.
- SSH URLs to `github.com` and `gitlab.com` are now host-typed and preserved
  as the clone URL (so deploy keys and private repos keep working). New
  `gitlab` value on `SkillSourceType`.

**Bug fix**

- HTTPS source parsing no longer mis-parses lookalike domains. Inputs like
  `https://example-github.com/owner/repo` and `https://my-github.com/owner/repo/tree/main`
  used to be silently rewritten to `https://github.com/owner/repo.git`; they now
  fall through to a generic git source. Subpath-traversal protection (`../`)
  is still enforced via `sanitizeSubpath`.
