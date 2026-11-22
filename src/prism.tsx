import React from "react";
import { Highlight, themes, type Language, type PrismTheme } from "prism-react-renderer";
import type { HighlightFn } from "./renderContext";
import type { MdPreset } from "./preset";
import { trimTrailingNewlines } from "./trimNewlines";

export interface PrismHighlighterOptions {
  /** A prism-react-renderer theme. Defaults to the built-in GitHub light theme. */
  theme?: PrismTheme;
}

/**
 * A synchronous highlight hook backed by prism-react-renderer. Pass it to
 * `<Md highlight={prismHighlighter()}>`. `prism-react-renderer` is an optional
 * peer dependency; install it to use this subpath.
 */
export function prismHighlighter(options: PrismHighlighterOptions = {}): HighlightFn {
  const theme = options.theme ?? themes.github;
  return (code, language) => (
    <Highlight
      code={trimTrailingNewlines(code)}
      language={(language ?? "text") as Language}
      theme={theme}
    >
      {({ className, style, tokens, getLineProps, getTokenProps }) => (
        // tabIndex: a code block wider than its box scrolls sideways, and only a focusable
        // scroll container can be scrolled from the keyboard (Shiki's own <pre> does the same).
        <pre className={className} style={{ ...style, margin: 0, overflowX: "auto" }} tabIndex={0}>
          {tokens.map((line, i) => (
            <div key={i} {...getLineProps({ line })}>
              {line.map((token, key) => (
                <span key={key} {...getTokenProps({ token })} />
              ))}
            </div>
          ))}
        </pre>
      )}
    </Highlight>
  );
}

/** The Prism highlighter packaged as a preset for `createMd().use(...)`. */
export function prismPreset(options: PrismHighlighterOptions = {}): MdPreset {
  return { highlight: prismHighlighter(options) };
}
