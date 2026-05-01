import { toErrorMessage } from "../../../utils/to-error-message.ts";
import { readFileSync } from "node:fs";

import { Command } from "commander";
import pc from "picocolors";

import { upsertAgentsMdSection, type SectionPlacement } from "../../../agents-md/index.ts";
import { logger } from "../../utils/logger.ts";
import { resolveAgentsMdAgent } from "./resolve-agent.ts";

interface DocSetSectionOptions {
  agent?: string;
  file?: string;
  body?: string;
  bodyFile?: string;
  placement?: string;
  level?: string;
}

const MIN_HEADING_LEVEL = 1;
const MAX_HEADING_LEVEL = 6;

const isValidPlacement = (value: string): value is SectionPlacement =>
  value === "append" || value === "prepend" || value === "replace";

export const docSetSectionCommand = new Command("set-section")
  .description("Create or replace a section in an AGENTS.md file")
  .argument("<heading>", "Section heading (used as the Markdown heading)")
  .option("-a, --agent <agent>", "Agent variant to target")
  .option("-f, --file <file>", "Explicit file path (overrides --agent)")
  .option("--body <body>", "Inline body content")
  .option("--body-file <path>", "Read body from a file")
  .option("--placement <mode>", "append, prepend, or replace (default: replace)")
  .option("--level <level>", "Heading level (1-6, default: 2)")
  .action((heading: string, options: DocSetSectionOptions) => {
    try {
      const agent = resolveAgentsMdAgent(options.agent);
      const body =
        options.body ?? (options.bodyFile ? readFileSync(options.bodyFile, "utf-8") : "");
      if (!body.trim()) {
        throw new Error("Body is empty. Provide --body or --body-file with content.");
      }

      const placement = options.placement ?? "replace";
      if (!isValidPlacement(placement)) {
        throw new Error(`Invalid placement "${placement}" (expected: append, prepend, replace)`);
      }

      const level = options.level ? Number.parseInt(options.level, 10) : 2;
      if (!Number.isInteger(level) || level < MIN_HEADING_LEVEL || level > MAX_HEADING_LEVEL) {
        throw new Error(
          `Invalid heading level "${options.level}" (expected: ${MIN_HEADING_LEVEL}-${MAX_HEADING_LEVEL})`,
        );
      }

      const filePath = upsertAgentsMdSection({
        heading,
        body,
        agent,
        file: options.file,
        placement,
        level,
        cwd: process.cwd(),
      });

      logger.success(`Updated ${pc.bold(heading)} in ${pc.cyan(filePath)}`);
    } catch (error) {
      logger.error(toErrorMessage(error));
      process.exitCode = 1;
    }
  });
