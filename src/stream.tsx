import React from "react";
import { Md } from "./components/md";
import type { MdProps } from "./types";

/**
 * Split markdown into top-level blocks on blank lines, but never inside a
 * fenced code block (``` or ~~~), so a fence that is still streaming in is not
 * cut in half. The trailing block may be incomplete.
 */
export function splitBlocks(src: string): string[] {
  const lines = src.split("\n");
  const blocks: string[] = [];
  let current: string[] = [];
  let fence: string | null = null;

  const flush = () => {
    if (current.length) {
      blocks.push(current.join("\n"));
      current = [];
    }
  };

  for (const line of lines) {
    const match = /^\s*(`{3,}|~{3,})/.exec(line);
    if (fence) {
      current.push(line);
      if (match && line.trim().startsWith(fence)) fence = null;
      continue;
    }
    if (match) {
      fence = match[1];
      current.push(line);
      continue;
    }
    if (line.trim() === "") {
      flush();
      continue;
    }
    current.push(line);
  }
  flush();
  return blocks;
}

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
 * to each block.
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
