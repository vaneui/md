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
