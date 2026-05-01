import { createHighlighter, type Highlighter } from "shiki";

declare global {
  // Cached across HMR boundaries so dev doesn't recreate the WASM highlighter per request.
  var shikiHighlighter: Highlighter | undefined;
  var shikiHighlighterPromise: Promise<Highlighter> | undefined;
}

const SHIKI_THEME = "github-light";
const SHIKI_LANGS = ["typescript", "tsx", "json", "jsonc", "yaml", "toml", "bash", "shell"];

const removeBackground = (html: string): string =>
  html
    .replace(/style="[^"]*background-color:[^;"]*;?[^"]*"/gi, (match) =>
      match.replace(/background-color:[^;"]*;?/gi, ""),
    )
    .replace(/style=""/g, "");

const getHighlighter = async (): Promise<Highlighter> => {
  if (globalThis.shikiHighlighter) return globalThis.shikiHighlighter;
  if (globalThis.shikiHighlighterPromise) return globalThis.shikiHighlighterPromise;

  globalThis.shikiHighlighterPromise = createHighlighter({
    themes: [SHIKI_THEME],
    langs: SHIKI_LANGS,
  }).then((highlighter) => {
    globalThis.shikiHighlighter = highlighter;
    return highlighter;
  });

  return globalThis.shikiHighlighterPromise;
};

interface HighlightCodeOptions {
  code: string;
  lang: string;
}

export const highlightCode = async ({ code, lang }: HighlightCodeOptions): Promise<string> => {
  const highlighter = await getHighlighter();
  const html = await highlighter.codeToHtml(code, { lang, theme: SHIKI_THEME });
  return removeBackground(html);
};
