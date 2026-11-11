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

/** Streaming `<Md>`: memoizes fence-aware blocks so only the changed trailing block re-parses (experimental). */
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
