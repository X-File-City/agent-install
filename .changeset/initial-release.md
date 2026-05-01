---
"agent-install": minor
---

Initial public release of `agent-install`.

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
