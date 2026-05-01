# agent-install

## 0.1.0

### Minor Changes

- b0f9656: Skills surface gets a major capability bump:
  - Adds 38 new agent definitions (52 total), bringing parity with the broader skills ecosystem (Amp, Antigravity, Augment, OpenClaw, Continue, Crush, Junie, Trae, Warp, Zencoder, and many more), with `XDG_CONFIG_HOME`, `CODEX_HOME`, `CLAUDE_CONFIG_DIR`, and `VIBE_HOME` env-var overrides honored.
  - Adds plugin manifest discovery: `discoverSkills` now reads `.claude-plugin/marketplace.json` and `.claude-plugin/plugin.json`, attaches `pluginName` to grouped skills, and rejects entries that escape the source root.
  - Adds well-known skills support: `parseSkillSource` recognises arbitrary HTTPS URLs as `well-known` sources, and `fetchWellKnownSkills` resolves `/.well-known/agent-skills/index.json` (with `/.well-known/skills/` legacy fallback), validates entry shape, and downloads each declared file into a temp dir for the normal install pipeline.
  - `git clone` failures now print actionable next steps (timeout env var, `gh auth status`, SSH key checks).
  - `skill list` is symlink-aware and only attributes skills to agents that are actually installed (or have a leftover skills folder), so universal agents stop double-listing under every redirect.

  ### Behavior changes worth knowing
  - `SkillSourceType` gained a new member: `"well-known"`. TS consumers doing exhaustive `switch` over the union will see a new case to handle.
  - Arbitrary HTTPS URLs without a `.git` suffix or `git@` prefix (e.g. `https://docs.example.com`, `https://git.self-hosted.example/owner/repo`) are now classified as `well-known` instead of falling through to a generic `git` clone. To force the legacy git-clone path for a self-hosted repo, append `.git` (e.g. `https://git.self-hosted.example/owner/repo.git`) or use the SSH form (`git@host:owner/repo.git`).

## 0.0.3

### Patch Changes

- fix

## 0.0.2

### Patch Changes

- fix

## 0.1.0

### Minor Changes

- 8e39a33: Initial public release of `agent-install`.

  Single package shipping a Node library and a CLI that install three things every
  AI coding agent consumes:
  - **Skills** — `SKILL.md` files discovered and symlinked (or copied) into each
    agent's skills directory, with a canonical copy at `.agents/skills/<name>`.
  - **MCP servers** — written into each agent's native config file across JSON
    (JSONC comment-preserving), YAML, and TOML, with per-agent transforms for
    Goose, Zed, OpenCode, Codex, VS Code, and GitHub Copilot CLI. 14 MCP hosts
    supported.
  - **AGENTS.md** — code-fence-aware section editing plus CLAUDE.md / GEMINI.md /
    `.cursor/rules/` variants and a CLAUDE.md → AGENTS.md symlink helper with a
    copy fallback on Windows.

  Subpath exports: `agent-install` (skill surface, default), `agent-install/skill`,
  `agent-install/mcp`, `agent-install/agents-md`. CLI: `agent-install skill|mcp|doc <action>`.

- c8a5dfa: Add a namespaced Node API, expand remote source support to GitLab and SSH, and
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

### Patch Changes

- init
