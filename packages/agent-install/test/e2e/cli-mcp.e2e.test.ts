import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import TOML from "@iarna/toml";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { parse as parseYaml } from "yaml";

import {
  createIsolatedWorkspace,
  runCli,
  setupWorkspaceDirectories,
  writeFileAt,
  type IsolatedWorkspace,
} from "./helpers.ts";

const readJsonc = (path: string): Record<string, unknown> => {
  return JSON.parse(readFileSync(path, "utf-8")) as Record<string, unknown>;
};

describe("CLI: mcp add (project scope)", () => {
  let workspace: IsolatedWorkspace;

  beforeEach(async () => {
    workspace = createIsolatedWorkspace();
    await setupWorkspaceDirectories(workspace);
  });

  afterEach(() => {
    workspace.cleanup();
  });

  it("writes a remote HTTP server into Cursor's .cursor/mcp.json", async () => {
    const result = await runCli(["mcp", "add", "https://mcp.context7.com/mcp", "-a", "cursor"], {
      cwd: workspace.cwd,
      env: workspace.env,
    });

    expect(result.exitCode).toBe(0);
    expect(result.stdout).toContain("context7");

    const config = readJsonc(join(workspace.cwd, ".cursor", "mcp.json"));
    expect(config).toEqual({
      mcpServers: {
        context7: {
          type: "http",
          url: "https://mcp.context7.com/mcp",
        },
      },
    });
  });

  it("supports SSE transport via --transport", async () => {
    const result = await runCli(
      [
        "mcp",
        "add",
        "https://mcp.example.com/sse",
        "--transport",
        "sse",
        "-a",
        "cursor",
        "-n",
        "example",
      ],
      { cwd: workspace.cwd, env: workspace.env },
    );

    expect(result.exitCode).toBe(0);
    const config = readJsonc(join(workspace.cwd, ".cursor", "mcp.json")) as {
      mcpServers: Record<string, { type: string; url: string }>;
    };
    expect(config.mcpServers.example.type).toBe("sse");
    expect(config.mcpServers.example.url).toBe("https://mcp.example.com/sse");
  });

  it("wraps npm packages in npx -y and merges --env vars", async () => {
    const result = await runCli(
      [
        "mcp",
        "add",
        "@modelcontextprotocol/server-postgres",
        "-a",
        "claude-code",
        "--env",
        "DATABASE_URL=postgres://localhost/app",
        "--env",
        "POOL_SIZE=5",
      ],
      { cwd: workspace.cwd, env: workspace.env },
    );

    expect(result.exitCode).toBe(0);
    expect(result.stdout).toContain("postgres");

    const config = readJsonc(join(workspace.cwd, ".mcp.json")) as {
      mcpServers: Record<string, { command: string; args: string[]; env: Record<string, string> }>;
    };
    expect(config.mcpServers.postgres).toEqual({
      command: "npx",
      args: ["-y", "@modelcontextprotocol/server-postgres"],
      env: {
        DATABASE_URL: "postgres://localhost/app",
        POOL_SIZE: "5",
      },
    });
  });

  it("serialises --header key/value pairs for remote servers", async () => {
    const result = await runCli(
      [
        "mcp",
        "add",
        "https://mcp.example.com/mcp",
        "-a",
        "cursor",
        "-n",
        "withauth",
        "--header",
        "Authorization: Bearer secret",
        "--header",
        "X-Tenant: abc",
      ],
      { cwd: workspace.cwd, env: workspace.env },
    );

    expect(result.exitCode).toBe(0);
    const config = readJsonc(join(workspace.cwd, ".cursor", "mcp.json")) as {
      mcpServers: Record<string, { headers?: Record<string, string> }>;
    };
    expect(config.mcpServers.withauth.headers).toEqual({
      Authorization: "Bearer secret",
      "X-Tenant": "abc",
    });
  });

  it("writes Codex servers into TOML under [mcp_servers.<name>]", async () => {
    const result = await runCli(
      ["mcp", "add", "@modelcontextprotocol/server-filesystem", "-a", "codex"],
      { cwd: workspace.cwd, env: workspace.env },
    );

    expect(result.exitCode).toBe(0);
    const raw = readFileSync(join(workspace.cwd, ".codex", "config.toml"), "utf-8");
    const parsed = TOML.parse(raw) as {
      mcp_servers: Record<string, { command: string; args: string[] }>;
    };
    expect(parsed.mcp_servers.filesystem).toEqual({
      command: "npx",
      args: ["-y", "@modelcontextprotocol/server-filesystem"],
    });
  });

  it("writes Goose servers into YAML under extensions.<name> with transform", async () => {
    const result = await runCli(["mcp", "add", "mcp-server-test", "-a", "goose", "-n", "testsrv"], {
      cwd: workspace.cwd,
      env: workspace.env,
    });

    expect(result.exitCode).toBe(0);
    const raw = readFileSync(join(workspace.cwd, ".goose", "config.yaml"), "utf-8");
    const parsed = parseYaml(raw) as {
      extensions: Record<string, Record<string, unknown>>;
    };
    expect(parsed.extensions.testsrv).toMatchObject({
      name: "testsrv",
      cmd: "npx",
      args: ["-y", "mcp-server-test"],
      type: "stdio",
      enabled: true,
    });
  });

  it("writes Zed with source=custom transform", async () => {
    const result = await runCli(
      ["mcp", "add", "https://mcp.example.com/mcp", "-a", "zed", "-n", "zedsrv"],
      { cwd: workspace.cwd, env: workspace.env },
    );

    expect(result.exitCode).toBe(0);
    const config = readJsonc(join(workspace.cwd, ".zed", "settings.json")) as {
      context_servers: Record<string, { source: string; type: string; url: string }>;
    };
    expect(config.context_servers.zedsrv).toMatchObject({
      source: "custom",
      type: "http",
      url: "https://mcp.example.com/mcp",
    });
  });

  it("writes OpenCode with type=remote / type=local transforms", async () => {
    const remote = await runCli(
      ["mcp", "add", "https://mcp.example.com/mcp", "-a", "opencode", "-n", "oc-remote"],
      { cwd: workspace.cwd, env: workspace.env },
    );
    expect(remote.exitCode).toBe(0);

    const local = await runCli(["mcp", "add", "@scope/pkg", "-a", "opencode", "-n", "oc-local"], {
      cwd: workspace.cwd,
      env: workspace.env,
    });
    expect(local.exitCode).toBe(0);

    const config = readJsonc(join(workspace.cwd, "opencode.json")) as {
      mcp: Record<string, Record<string, unknown>>;
    };
    expect(config.mcp["oc-remote"]).toMatchObject({
      type: "remote",
      url: "https://mcp.example.com/mcp",
      enabled: true,
    });
    expect(config.mcp["oc-local"]).toMatchObject({
      type: "local",
      command: ["npx", "-y", "@scope/pkg"],
      enabled: true,
    });
  });

  it("rejects remote URLs for claude-desktop (stdio-only)", async () => {
    const result = await runCli(
      ["mcp", "add", "https://mcp.example.com/mcp", "-a", "claude-desktop"],
      { cwd: workspace.cwd, env: workspace.env },
    );

    expect(result.exitCode).not.toBe(0);
    expect(result.stdout + result.stderr).toMatch(/stdio/i);
  });

  it("preserves comments in existing JSONC when adding another server", async () => {
    const cursorPath = join(workspace.cwd, ".cursor", "mcp.json");
    await writeFileAt(
      cursorPath,
      `{
  // keep this comment
  "mcpServers": {
    "existing": {
      "type": "http",
      "url": "https://old.example.com/mcp"
    }
  }
}
`,
    );

    const result = await runCli(
      ["mcp", "add", "https://new.example.com/mcp", "-a", "cursor", "-n", "added"],
      { cwd: workspace.cwd, env: workspace.env },
    );
    expect(result.exitCode).toBe(0);

    const raw = readFileSync(cursorPath, "utf-8");
    expect(raw).toContain("// keep this comment");
    expect(raw).toContain("existing");
    expect(raw).toContain("added");
  });

  it("exits 1 with a warning when no agents are detected", async () => {
    const result = await runCli(["mcp", "add", "https://x.example.com/mcp"], {
      cwd: workspace.cwd,
      env: workspace.env,
    });
    expect(result.exitCode).toBe(1);
    expect(result.stdout + result.stderr).toMatch(/No project-installed MCP agents detected/);
  });

  it("auto-detects agents once their config directories exist", async () => {
    const first = await runCli(
      ["mcp", "add", "https://first.example.com/mcp", "-a", "cursor", "-n", "first"],
      { cwd: workspace.cwd, env: workspace.env },
    );
    expect(first.exitCode).toBe(0);

    const detected = await runCli(
      ["mcp", "add", "https://second.example.com/mcp", "-n", "second"],
      {
        cwd: workspace.cwd,
        env: workspace.env,
      },
    );
    expect(detected.exitCode).toBe(0);
    expect(detected.stdout).toMatch(/Detected project agents: .*cursor/);

    const config = readJsonc(join(workspace.cwd, ".cursor", "mcp.json")) as {
      mcpServers: Record<string, unknown>;
    };
    expect(Object.keys(config.mcpServers)).toEqual(expect.arrayContaining(["first", "second"]));
  });

  it("resolves agent aliases (gemini → gemini-cli, cline-vscode → cline)", async () => {
    const geminiResult = await runCli(
      ["mcp", "add", "https://mcp.example.com/mcp", "-a", "gemini", "-n", "gemsrv"],
      { cwd: workspace.cwd, env: workspace.env },
    );
    expect(geminiResult.exitCode).toBe(0);
    const geminiConfig = readJsonc(join(workspace.cwd, ".gemini", "settings.json"));
    expect(geminiConfig).toMatchObject({
      mcpServers: { gemsrv: { type: "http", url: "https://mcp.example.com/mcp" } },
    });
  });

  it("supports --all to install every project-capable agent, flagging stdio-only ones on remote input", async () => {
    const result = await runCli(
      ["mcp", "add", "https://mcp.example.com/mcp", "--all", "-n", "broad"],
      { cwd: workspace.cwd, env: workspace.env },
    );
    expect(result.exitCode).not.toBe(0);

    const combined = `${result.stdout}\n${result.stderr}`;
    expect(combined).toContain("claude-desktop");
    expect(combined).toMatch(/stdio/i);

    expect(existsSync(join(workspace.cwd, ".cursor", "mcp.json"))).toBe(true);
    expect(existsSync(join(workspace.cwd, ".codex", "config.toml"))).toBe(true);
    expect(existsSync(join(workspace.cwd, ".zed", "settings.json"))).toBe(true);
  });

  it("round-trips list + remove", async () => {
    await runCli(["mcp", "add", "https://mcp.example.com/mcp", "-a", "cursor", "-n", "rtrip"], {
      cwd: workspace.cwd,
      env: workspace.env,
    });

    const list = await runCli(["mcp", "list", "--json"], {
      cwd: workspace.cwd,
      env: workspace.env,
    });
    expect(list.exitCode).toBe(0);
    const parsed = JSON.parse(list.stdout) as Array<{ serverName: string; agent: string }>;
    expect(parsed.some((entry) => entry.serverName === "rtrip" && entry.agent === "cursor")).toBe(
      true,
    );

    const removal = await runCli(["mcp", "remove", "rtrip", "-y"], {
      cwd: workspace.cwd,
      env: workspace.env,
    });
    expect(removal.exitCode).toBe(0);

    const after = readJsonc(join(workspace.cwd, ".cursor", "mcp.json")) as {
      mcpServers: Record<string, unknown>;
    };
    expect(after.mcpServers?.rtrip).toBeUndefined();
  });

  it("rejects empty source input", async () => {
    const result = await runCli(["mcp", "add", "   ", "-a", "cursor"], {
      cwd: workspace.cwd,
      env: workspace.env,
    });
    expect(result.exitCode).not.toBe(0);
    expect(result.stdout + result.stderr).toMatch(/empty/i);
  });

  it("rejects --header without a colon separator", async () => {
    const result = await runCli(
      [
        "mcp",
        "add",
        "https://mcp.example.com/mcp",
        "-a",
        "cursor",
        "--header",
        "missing-separator",
      ],
      { cwd: workspace.cwd, env: workspace.env },
    );
    expect(result.exitCode).not.toBe(0);
    expect(result.stdout + result.stderr).toMatch(/separator/i);
  });

  it("rejects unsupported transport values", async () => {
    const result = await runCli(
      ["mcp", "add", "https://mcp.example.com/mcp", "-a", "cursor", "--transport", "websocket"],
      { cwd: workspace.cwd, env: workspace.env },
    );
    expect(result.exitCode).not.toBe(0);
    expect(result.stdout + result.stderr).toMatch(/transport/i);
  });
});
