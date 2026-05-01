import { toErrorMessage } from "../../../utils/to-error-message.ts";
import { existsSync, writeFileSync } from "node:fs";

import { Command } from "commander";
import pc from "picocolors";

import { resolveAgentsMdFilePath } from "../../../agents-md/index.ts";
import { logger } from "../../utils/logger.ts";
import { resolveAgentsMdAgent } from "./resolve-agent.ts";

interface DocInitOptions {
  agent?: string;
}

const TEMPLATE = `# AGENTS.md

This document is the source of truth for AI coding agents working in this repository.

## Project overview

Short description of what this project does.

## Setup commands

\`\`\`bash
pnpm install
pnpm dev
\`\`\`

## Conventions

- Describe coding style, framework, and patterns agents should follow.
- Link to any other docs that are relevant.

## Testing

\`\`\`bash
pnpm test
\`\`\`
`;

export const docInitCommand = new Command("init")
  .description("Create an AGENTS.md (or agent-specific variant) in the current directory")
  .option("-a, --agent <agent>", "Agent to target (defaults to universal AGENTS.md)")
  .action((options: DocInitOptions) => {
    try {
      const cwd = process.cwd();
      const agent = resolveAgentsMdAgent(options.agent);
      const filePath = resolveAgentsMdFilePath({ cwd, agent });

      if (existsSync(filePath)) {
        logger.warn(`${pc.cyan(filePath)} already exists`);
        return;
      }

      writeFileSync(filePath, TEMPLATE, "utf-8");
      logger.success(`Created ${pc.bold(filePath)}`);
    } catch (error) {
      logger.error(toErrorMessage(error));
      process.exitCode = 1;
    }
  });
