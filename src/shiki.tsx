import React from "react";
import { createHighlighterCoreSync } from "shiki/core";
import { createJavaScriptRegexEngine } from "shiki/engine/javascript";
import type { HighlightFn } from "./context";
import type { MdPreset } from "./preset";

type SyncCoreOptions = Parameters<typeof createHighlighterCoreSync>[0];

export interface ShikiHighlighterOptions {
  /**
   * Shiki language inputs, imported and passed by the consumer. Keeping
   * grammars on the consumer side keeps them out of this package's bundle and
   * lets the consumer control which languages ship.
   */
  langs: SyncCoreOptions["langs"];
  /** Shiki theme inputs, imported by the consumer. */
  themes: SyncCoreOptions["themes"];
  /** Active theme name. Defaults to the first loaded theme. */
  theme?: string;
}

const plain = (code: string): React.ReactNode => (
  <pre style={{ margin: 0, overflowX: "auto", fontFamily: "monospace", fontSize: "0.875rem" }}>
    <code>{code}</code>
  </pre>
);

/**
 * A synchronous highlight hook backed by Shiki's sync core. The consumer
 * imports and passes the langs/themes, so grammars stay out of this package's
 * bundle. `shiki` is an optional peer dependency. Unknown languages fall back
 * to a plain <pre>.
 */
export function shikiHighlighter(options: ShikiHighlighterOptions): HighlightFn {
  const highlighter = createHighlighterCoreSync({
    langs: options.langs,
    themes: options.themes,
    engine: createJavaScriptRegexEngine(),
  });
  const themeName = options.theme ?? highlighter.getLoadedThemes()[0];
  const loadedLangs = new Set(highlighter.getLoadedLanguages());
  return (code, language) => {
    const src = code.replace(/\n+$/, "");
    if (!language || !loadedLangs.has(language)) return plain(src);
    const html = highlighter.codeToHtml(src, { lang: language, theme: themeName });
    return <div className="vaneui-md-shiki" dangerouslySetInnerHTML={{ __html: html }} />;
  };
}

/** The Shiki highlighter packaged as a preset for `createMd().use(...)`. */
export function shikiPreset(options: ShikiHighlighterOptions): MdPreset {
  return { highlight: shikiHighlighter(options) };
}
