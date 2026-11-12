import { tokenize } from "./tokenizer";

/** Tags that never take children: an opening one does not hold the blocks after it. */
const SELF_CLOSING_TAGS: ReadonlySet<string> = new Set(["include", "partial"]);

/**
 * Splits Markdown into its top-level blocks, as the Markdoc tokenizer reads
 * them: a paragraph, a heading, a whole list, a whole blockquote, a table, a
 * code fence, or a block tag with everything up to its closing tag. Each block
 * is an exact slice of `src` without the blank lines around it.
 *
 * The frontmatter is the first block. Lines that belong to no block (link
 * reference definitions) stay with the block before them. The last block may
 * be incomplete: an unclosed fence or an unclosed tag takes the rest of the
 * source.
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
  for (const token of tokenize(src)) {
    const tag: unknown = token.meta?.tag;
    const isTagEdge = token.type === "tag_open" || token.type === "tag_close";
    const selfClosing = isTagEdge && typeof tag === "string" && SELF_CLOSING_TAGS.has(tag);
    const nesting = selfClosing ? 0 : token.nesting ?? 0;
    const line = token.map?.[0];
    const opens = nesting >= 0 && !(selfClosing && token.type === "tag_close");
    if (depth === 0 && opens && typeof line === "number" && line > firstLines[firstLines.length - 1] && line < lineCount) {
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
