import { describe, expect, it } from "@voidzero-dev/vite-plus-test";

import { buildMcpServerConfig } from "../src/mcp/build-server-config.ts";
import { parseMcpSource } from "../src/mcp/source-parser.ts";

describe("buildMcpServerConfig: remote", () => {
  it("defaults to type=http", () => {
    const parsed = parseMcpSource("https://mcp.example.com/api");
    const config = buildMcpServerConfig(parsed);
    expect(config).toEqual({ type: "http", url: "https://mcp.example.com/api" });
  });

  it("applies --transport sse", () => {
    const parsed = parseMcpSource("https://mcp.example.com/sse");
    expect(buildMcpServerConfig(parsed, { transport: "sse" })).toEqual({
      type: "sse",
      url: "https://mcp.example.com/sse",
    });
  });

  it("merges headers when provided", () => {
    const parsed = parseMcpSource("https://mcp.example.com/api");
    const config = buildMcpServerConfig(parsed, {
      headers: { Authorization: "Bearer token", "X-Custom": "value" },
    });
    expect(config).toEqual({
      type: "http",
      url: "https://mcp.example.com/api",
      headers: { Authorization: "Bearer token", "X-Custom": "value" },
    });
  });

  it("does not include an empty headers object", () => {
    const parsed = parseMcpSource("https://mcp.example.com/api");
    const config = buildMcpServerConfig(parsed, { headers: {} });
    expect(Object.prototype.hasOwnProperty.call(config, "headers")).toBe(false);
  });
});

describe("buildMcpServerConfig: package", () => {
  it("wraps npm packages in npx -y", () => {
    const parsed = parseMcpSource("@modelcontextprotocol/server-postgres");
    expect(buildMcpServerConfig(parsed)).toEqual({
      command: "npx",
      args: ["-y", "@modelcontextprotocol/server-postgres"],
    });
  });

  it("merges env vars when provided", () => {
    const parsed = parseMcpSource("mcp-server-github");
    expect(
      buildMcpServerConfig(parsed, {
        env: { GITHUB_TOKEN: "secret" },
      }),
    ).toEqual({
      command: "npx",
      args: ["-y", "mcp-server-github"],
      env: { GITHUB_TOKEN: "secret" },
    });
  });

  it("does not include an empty env object", () => {
    const parsed = parseMcpSource("mcp-server-github");
    const config = buildMcpServerConfig(parsed, { env: {} });
    expect(Object.prototype.hasOwnProperty.call(config, "env")).toBe(false);
  });
});

describe("buildMcpServerConfig: command", () => {
  it("splits the command into command + args", () => {
    const parsed = parseMcpSource("node /path/to/server.js --port 3000");
    expect(buildMcpServerConfig(parsed)).toEqual({
      command: "node",
      args: ["/path/to/server.js", "--port", "3000"],
    });
  });

  it("attaches env vars to stdio commands", () => {
    const parsed = parseMcpSource("python -m mcp_server");
    expect(
      buildMcpServerConfig(parsed, {
        env: { PYTHONPATH: "/opt/lib" },
      }),
    ).toEqual({
      command: "python",
      args: ["-m", "mcp_server"],
      env: { PYTHONPATH: "/opt/lib" },
    });
  });
});
