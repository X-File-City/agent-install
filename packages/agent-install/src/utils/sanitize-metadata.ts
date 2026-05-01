import { stripTerminalEscapes } from "./strip-terminal-escapes.ts";

export const sanitizeMetadata = (input: string): string =>
  stripTerminalEscapes(input)
    .replace(/[\r\n]+/g, " ")
    .trim();
