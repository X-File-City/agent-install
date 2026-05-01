export const stripTrailingSlash = (input: string): string =>
  input.endsWith("/") ? input.slice(0, -1) : input;
