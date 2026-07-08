import React from "react";
import { Highlight, themes, type Language, type PrismTheme } from "prism-react-renderer";
import type { HighlightFn } from "./context";
import type { MdPreset } from "./preset";

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
      code={code.replace(/\n+$/, "")}
      language={(language ?? "text") as Language}
      theme={theme}
    >
      {({ className, style, tokens, getLineProps, getTokenProps }) => (
        <pre className={className} style={{ ...style, margin: 0, overflowX: "auto" }}>
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
