# agent-install

[![version](https://img.shields.io/npm/v/agent-install?style=flat&colorA=000000&colorB=000000)](https://npmjs.com/package/agent-install)
[![downloads](https://img.shields.io/npm/dt/agent-install.svg?style=flat&colorA=000000&colorB=000000)](https://npmjs.com/package/agent-install)

Node API for installing skills, MCP servers, and AGENTS.md guidance into any coding agent.

It writes to each agent's native config (Claude Code, Cursor, Codex, OpenCode, and others) so your CLI or build script doesn't have to learn ten different formats. A small `agent-install` CLI is also included for one-off use.

<p align="center">
  <img src="https://github.com/aidenybai/skill-install/blob/main/.github/assets/standards.png?raw=true" width="600" alt="xkcd 927: standards proliferate" />
  <br />
  <sub><i>Every agent has its own format for skills, MCP, and AGENTS.md. <code>agent-install</code> writes to all of them so you don't ship the 15th. (<a href="https://xkcd.com/927/">xkcd 927</a>)</i></sub>
</p>

## Install

```bash
npm install agent-install
```

## Skills

A skill is a `SKILL.md` file that an agent picks up and uses to trigger behavior. `installSkillsFromSource` parses a source (local path, GitHub repo, or URL), fetches it, and installs every discovered `SKILL.md` into each selected agent's skills directory.

```ts
import { installSkillsFromSource } from "agent-install";

const result = await installSkillsFromSource({
  source: "./skills/react-grab",
  agents: ["claude-code", "cursor"],
});

console.log(result.installed); // InstalledSkillRecord[]
console.log(result.failed);    // FailedSkillRecord[]
```

Other useful exports:

```ts
import {
  discoverSkills,
  parseSkillSource,
  installSkillForAgent,
  detectInstalledSkillAgents,
} from "agent-install";
```

## MCP servers

An MCP server speaks the [Model Context Protocol](https://modelcontextprotocol.io/docs/develop/build-server). `installMcpServer` parses a source (remote URL, npm package, or raw command), builds an `McpServerConfig`, and writes it into each selected agent's native config file (JSON, JSONC, YAML, or TOML). JSONC writes preserve existing comments.

```ts
import { installMcpServer } from "agent-install/mcp";

const result = installMcpServer({
  source: "https://mcp.context7.com/mcp",
  agents: ["cursor", "claude-code"],
  name: "context7",
});
```

```ts
import { installMcpServer } from "agent-install/mcp";

installMcpServer({
  source: "@modelcontextprotocol/server-postgres",
  agents: ["claude-code"],
  name: "postgres",
  env: { DATABASE_URL: process.env.DATABASE_URL ?? "" },
});
```

Other useful exports:

```ts
import {
  parseMcpSource,
  buildMcpServerConfig,
  listInstalledMcpServers,
  removeMcpServer,
} from "agent-install/mcp";
```

## AGENTS.md

[AGENTS.md](https://agents.md/) is the open README-for-agents spec. The `agent-install/agents-md` surface lets you read, upsert, and remove sections in `AGENTS.md` and its per-agent variants (`CLAUDE.md`, `GEMINI.md`, `.cursor/rules/`, `.windsurfrules`, etc.) without losing surrounding content.

```ts
import {
  upsertAgentsMdSection,
  removeAgentsMdSection,
  symlinkClaudeToAgents,
} from "agent-install/agents-md";

upsertAgentsMdSection({
  heading: "React Grab",
  body: "Run `npx grab@latest` to set up React Grab.",
  placement: "append",
});

await symlinkClaudeToAgents();
```

Other useful exports:

```ts
import {
  readAgentsMd,
  writeAgentsMd,
  parseSections,
  findSection,
  resolveAgentsMdFilePath,
} from "agent-install/agents-md";
```

## Subpath exports

| Import                    | Surface                                               |
| ------------------------- | ----------------------------------------------------- |
| `agent-install`           | Skills (SKILL.md install, discovery, clone/URL fetch) |
| `agent-install/skill`     | Alias of the root import                              |
| `agent-install/mcp`       | MCP servers (install, list, remove across agents)     |
| `agent-install/agents-md` | AGENTS.md manipulation and `CLAUDE.md` symlink helper |

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

## CLI

The package also ships an `agent-install` CLI for use outside of code (one-off installs, scripts, CI). It's a thin wrapper around the Node API.

```bash
npx agent-install --help
```

### Skills

```bash
npx agent-install skill add ./skills/react-grab
npx agent-install skill add owner/repo
npx agent-install skill add https://github.com/owner/repo/tree/main/skills/foo

npx agent-install skill init [name]      # create a new SKILL.md
npx agent-install skill list             # list installed skills
npx agent-install skill remove [skills]  # remove installed skills
```

### MCP servers

```bash
npx agent-install mcp add https://mcp.context7.com/mcp -a cursor
npx agent-install mcp add @modelcontextprotocol/server-postgres -a claude-code --env "DATABASE_URL=..."

npx agent-install mcp list           # list installed MCP servers
npx agent-install mcp remove <name>  # remove by server name
```

### AGENTS.md

```bash
npx agent-install doc init
npx agent-install doc set-section "Testing" --body "Run pnpm test"
npx agent-install doc remove-section "Testing"
npx agent-install doc symlink-claude
npx agent-install doc read
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

## Resources

Found a bug? Open an issue on the [issue tracker](https://github.com/aidenybai/skill-install/issues). Pull requests welcome.

### License

agent-install is MIT-licensed open-source software.
