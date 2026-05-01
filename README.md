# agent-install

A single package — a Node library **and** a CLI — for installing what every AI coding agent consumes:

1. **Skills** — `SKILL.md` files that trigger behavior
2. **MCP servers** — Model Context Protocol servers, wired into each agent's native config format ([modelcontextprotocol.io](https://modelcontextprotocol.io/docs/develop/build-server))
3. **AGENTS.md** — the open README-for-agents spec at [agents.md](https://agents.md/), plus `CLAUDE.md`, `GEMINI.md`, and `.cursor/rules/`

```bash
# Skills
npx agent-install skill add ./skills/react-grab

# MCP servers
npx agent-install mcp add https://mcp.context7.com/mcp -a cursor
npx agent-install mcp add @modelcontextprotocol/server-postgres -a claude-code --env "DATABASE_URL=..."

# AGENTS.md
npx agent-install doc init
npx agent-install doc set-section "Testing" --body "Run pnpm test"
npx agent-install doc symlink-claude
```

## Programmatic use

The same package ships the Node API that the CLI is built on. React Grab, React Doctor, and other tool CLIs depend on this directly:

```bash
pnpm add agent-install
```

```ts
// Skills
import { installSkillsFromSource } from "agent-install";
await installSkillsFromSource({
  source: "./skills/react-grab",
  agents: ["claude-code", "cursor"],
});

// MCP servers
import { installMcpServer } from "agent-install/mcp";
installMcpServer({
  source: "https://mcp.context7.com/mcp",
  agents: ["cursor", "claude-code"],
  name: "context7",
});

// AGENTS.md
import { upsertAgentsMdSection, symlinkClaudeToAgents } from "agent-install/agents-md";
upsertAgentsMdSection({
  heading: "React Grab",
  body: "Run `npx grab@latest` to set up React Grab.",
  placement: "append",
});
await symlinkClaudeToAgents();
```

## Subpath exports

| Import                    | Surface                                               |
| ------------------------- | ----------------------------------------------------- |
| `agent-install`           | Skills (SKILL.md install, discovery, clone/URL fetch) |
| `agent-install/skill`     | Alias of the root import                              |
| `agent-install/mcp`       | MCP servers (install, list, remove across agents)     |
| `agent-install/agents-md` | AGENTS.md manipulation + `CLAUDE.md` symlink helper   |

## CLI

```
agent-install skill <action>     Manage SKILL.md files
  add <source>                   Install from local path, GitHub, or URL
  init [name]                    Create a new SKILL.md
  list                           List installed skills
  remove [skills...]             Remove installed skills

agent-install mcp <action>       Install, list, and remove MCP servers
  add <source>                   Install by remote URL, npm package, or command
  list                           List installed MCP servers
  remove <name>                  Remove by server name

agent-install doc <action>       Manage AGENTS.md / CLAUDE.md / GEMINI.md / Cursor rules
  init                           Create a starter AGENTS.md
  read                           Read and list sections
  set-section <heading>          Create or replace a section (--body or --body-file)
  remove-section <heading>       Remove a section
  symlink-claude                 Create CLAUDE.md → AGENTS.md symlink
```

## Source formats

### Skill sources

```
./skills/my-skill                             # local path
owner/repo                                    # GitHub shorthand
owner/repo/path/to/skill                      # with subpath
owner/repo@skill-name                         # with skill filter
owner/repo#branch                             # with git ref
https://github.com/owner/repo                 # full URL
https://github.com/owner/repo/tree/main/skills/foo
https://example.com/path/SKILL.md             # direct SKILL.md URL
```

### MCP sources

```
https://mcp.context7.com/mcp                  # remote HTTP
https://mcp.example.com/sse (+ --transport sse)
@modelcontextprotocol/server-postgres         # npm package (wrapped in npx -y)
"node /path/to/server.js --port 3000"         # raw command
```

## Supported agents

| Surface   | Agents                                                                                                                                              |
| --------- | --------------------------------------------------------------------------------------------------------------------------------------------------- |
| Skills    | Claude Code, Cursor, Codex, OpenCode, Gemini CLI, GitHub Copilot, Goose, Windsurf, Roo, Cline, Kilo, universal                                      |
| MCP       | Claude Code, Claude Desktop, Cursor, Codex, Cline (ext + CLI), VS Code, GitHub Copilot CLI, Gemini CLI, Goose, OpenCode, Zed, Antigravity, MCPorter |
| AGENTS.md | Universal, Claude Code (CLAUDE.md), Gemini CLI (GEMINI.md), Cursor (.cursor/rules), Windsurf (.windsurfrules), Codex, OpenCode, Aider               |

## Development

```bash
pnpm install
pnpm build
pnpm test
pnpm lint
pnpm typecheck
```

Single package at [`packages/agent-install`](./packages/agent-install).
