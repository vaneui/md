import React from "react";
import { Md } from "./components/md-client";
import { splitBlocks } from "./splitBlocks";
import type { MdProps } from "./types";

/** Split streaming markdown into memoization-friendly blocks. */
export function useMdStream(content: string): string[] {
  return React.useMemo(() => splitBlocks(content), [content]);
}

const MemoBlock = React.memo(function MemoBlock(
  { block, ...rest }: { block: string } & Omit<MdProps, "content">,
) {
  return <Md content={block} {...rest} />;
});

/**
 * A streaming-friendly `<Md>`. Splits `content` into fence-aware blocks and
 * memoizes each, so as content grows only the new or changed trailing block
 * re-parses. Completed blocks stay stable across updates (given stable props),
 * which keeps token-by-token LLM output cheap to render. All other `<Md>` props
 * (presets, highlight, rendererTheme, config, sanitize, transform) are threaded
 * to each block, and each block inherits a parent `RendererThemeContext`.
 *
 * Experimental: block boundaries are heuristic (blank line outside a fence), so
 * a block can still re-flow when a later boundary appears.
 */
export const MdStream: React.FC<MdProps> = ({ content, ...rest }) => {
  const blocks = useMdStream(content);
  return (
    <>
      {blocks.map((block, i) => (
        <MemoBlock key={i} block={block} {...rest} />
      ))}
    </>
  );
};
