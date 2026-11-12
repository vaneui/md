import { markdownTokens } from "./tags";

/**
 * Splits Markdown into its top-level blocks, as `<Md>` parses them: a
 * paragraph, a heading, a whole list, a whole blockquote, a table, a code
 * fence, or a block tag with everything up to its closing tag. Each block is
 * an exact slice of `src` without the blank lines around it.
 *
 * The frontmatter is the first block. Lines that belong to no block (link
 * reference definitions) stay with the block before them. The last block may
 * be incomplete: an unclosed fence, or a block tag left open at the top level,
 * takes the rest of the source. A tag left open inside a list item or a
 * blockquote ends with it, and `include` and `partial` tags hold no blocks.
 *
 * Rendering each block as its own document is not the same as rendering the
 * source: reference links, variables and conditions span blocks. `MdStream`
 * renders one document for that reason.
 */
export function splitBlocks(src: string): string[] {
  // Where each line starts and ends, with the line breaks the tokenizer counts.
  const lineStarts: number[] = [0];
  const lineEnds: number[] = [];
  const lineBreak = /\r\n?|\n/g;
  for (let match = lineBreak.exec(src); match; match = lineBreak.exec(src)) {
    lineEnds.push(match.index);
    lineStarts.push(match.index + match[0].length);
  }
  lineEnds.push(src.length);
  const lineCount = lineStarts.length;

  // The first line of every block: a token that opens while no other block is open.
  const firstLines: number[] = [0];
  let depth = 0;
  for (const token of markdownTokens(src)) {
    const nesting = token.nesting ?? 0;
    const line = token.map?.[0];
    if (depth === 0 && nesting >= 0 && typeof line === "number" && line > firstLines[firstLines.length - 1] && line < lineCount) {
      firstLines.push(line);
    }
    depth = Math.max(0, depth + nesting);
  }

  const isBlank = (line: number) => src.slice(lineStarts[line], lineEnds[line]).trim() === "";
  const blocks: string[] = [];
  firstLines.forEach((first, index) => {
    let start = first;
    let end = index + 1 < firstLines.length ? firstLines[index + 1] : lineCount;
    while (start < end && isBlank(start)) start++;
    while (end > start && isBlank(end - 1)) end--;
    if (start < end) blocks.push(src.slice(lineStarts[start], lineEnds[end - 1]));
  });
  return blocks;
}
