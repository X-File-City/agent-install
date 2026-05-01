# agent-install

[![version](https://img.shields.io/npm/v/agent-install?style=flat&colorA=000000&colorB=000000)](https://npmjs.com/package/agent-install)
[![downloads](https://img.shields.io/npm/dt/agent-install.svg?style=flat&colorA=000000&colorB=000000)](https://npmjs.com/package/agent-install)

Install skills, MCP servers, and AGENTS.md guidance for any coding agent.

One package, one CLI, one Node API. It writes to each agent's native config so you don't have to learn ten different formats.

## Install

```bash
npx agent-install --help
```

Or add it as a dependency:

```bash
npm install agent-install
```

## Skills

Install a `SKILL.md` file (the format that triggers behavior in Claude Code, Cursor, Codex, OpenCode, and others) from a local path, GitHub repo, or URL.

```bash
npx agent-install skill add ./skills/react-grab
npx agent-install skill add owner/repo
npx agent-install skill add https://github.com/owner/repo/tree/main/skills/foo
```

Other skill commands:

```bash
npx agent-install skill init [name]      # create a new SKILL.md
npx agent-install skill list             # list installed skills
npx agent-install skill remove [skills]  # remove installed skills
```

### Skill source formats

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

## MCP servers

Install a [Model Context Protocol](https://modelcontextprotocol.io/docs/develop/build-server) server into each agent's native config. Works with remote URLs, npm packages, and raw commands.

```bash
npx agent-install mcp add https://mcp.context7.com/mcp -a cursor
npx agent-install mcp add @modelcontextprotocol/server-postgres -a claude-code --env "DATABASE_URL=..."
```

Other MCP commands:

```bash
npx agent-install mcp list           # list installed MCP servers
npx agent-install mcp remove <name>  # remove by server name
```

### MCP source formats

```
https://mcp.context7.com/mcp                  # remote HTTP
https://mcp.example.com/sse (+ --transport sse)
@modelcontextprotocol/server-postgres         # npm package (wrapped in npx -y)
"node /path/to/server.js --port 3000"         # raw command
```

## AGENTS.md

Manage [AGENTS.md](https://agents.md/) (and its per-agent variants like `CLAUDE.md`, `GEMINI.md`, `.cursor/rules/`).

```bash
npx agent-install doc init
npx agent-install doc set-section "Testing" --body "Run pnpm test"
npx agent-install doc symlink-claude
```

Other doc commands:

```bash
npx agent-install doc read                    # read and list sections
npx agent-install doc remove-section <heading>  # remove a section
```

## Programmatic use

The same package ships a Node API so you can call it from your own CLI or build script. React Grab, React Doctor, and other tools depend on this directly.

```ts
import { installSkillsFromSource } from "agent-install";

await installSkillsFromSource({
  source: "./skills/react-grab",
  agents: ["claude-code", "cursor"],
});
```

```ts
import { installMcpServer } from "agent-install/mcp";

installMcpServer({
  source: "https://mcp.context7.com/mcp",
  agents: ["cursor", "claude-code"],
  name: "context7",
});
```

```ts
import { upsertAgentsMdSection, symlinkClaudeToAgents } from "agent-install/agents-md";

upsertAgentsMdSection({
  heading: "React Grab",
  body: "Run `npx grab@latest` to set up React Grab.",
  placement: "append",
});

await symlinkClaudeToAgents();
```

### Subpath exports

| Import                    | Surface                                               |
| ------------------------- | ----------------------------------------------------- |
| `agent-install`           | Skills (SKILL.md install, discovery, clone/URL fetch) |
| `agent-install/skill`     | Alias of the root import                              |
| `agent-install/mcp`       | MCP servers (install, list, remove across agents)     |
| `agent-install/agents-md` | AGENTS.md manipulation and `CLAUDE.md` symlink helper |

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

## Resources

Found a bug? Open an issue on the [issue tracker](https://github.com/aidenybai/skill-install/issues). Pull requests welcome.

### License

agent-install is MIT-licensed open-source software.
