/**
 * Block structure for `@vaneui/md/include`: which lines of a Markdown file are
 * fenced code, read the way Markdoc reads them (markdown-it, with indented
 * code blocks and setext headings turned off). Internal: nothing here is
 * exported from a package entry.
 *
 * `BlockScanner` follows the container rules line by line: it keeps the open
 * blockquotes and list items, continues them on each line, lets a paragraph
 * continue lazily, and closes what a line does not continue. Where
 * markdown-it departs from CommonMark (a blockquote continues at a `>`
 * indented any amount; which blocks end a lazy paragraph line), it follows
 * markdown-it. That is enough to know where each fence opens and ends,
 * including a fence that ends because its list item or blockquote ended. It
 * builds no document.
 *
 * Known differences from Markdoc, all in input that docs do not contain:
 * - tables, link reference definitions and Markdoc tags spanning several
 *   lines read as paragraph text;
 * - a tab after a second `>` on a line is measured from the line start, where
 *   markdown-it measures it from the enclosing blockquote's content;
 * - a document starting with a blockquote or list item whose first line is
 *   `---` is frontmatter to Markdoc up to the next `---` line in it;
 * - containers nested deeper than 100 levels read as text (Markdoc drops such
 *   content).
 *
 * Every loop here advances through the line or through the container stack,
 * whose depth is capped, so a scan is linear in the length of the input.
 */

const TAB_STOP = 4;

/** Markdoc stops parsing at 100 nesting levels; deeper markers read as text here. */
const MAX_CONTAINERS = 100;

interface Container {
  /** A blockquote; otherwise a list item. */
  quote: boolean;
  /** List item: columns from its parent's content start to its own. */
  width: number;
  /** List item whose first line had no content: a blank line ends it. */
  empty: boolean;
}

/** A fenced code block that has not been closed yet. */
export interface OpenFence {
  char: string;
  length: number;
  /**
   * Columns from the start of the innermost blockquote's content (the line
   * start outside blockquotes) to the fence characters. Code lines lose up to
   * this much indentation.
   */
  indent: number;
  /** Text that puts a closing fence in the same containers, e.g. "  " in a list item. */
  closePrefix: string;
}

function isSpaceOrTab(char: string | undefined): boolean {
  return char === " " || char === "\t";
}

/** Column after `char` when it starts at `column`. */
function advance(column: number, char: string): number {
  return char === "\t" ? column + TAB_STOP - (column % TAB_STOP) : column + 1;
}

/**
 * `text.slice(0, end)` with its tabs replaced by spaces, counting columns from
 * the start of `text`.
 */
export function expandTabs(text: string, end: number): string {
  const head = text.slice(0, end);
  if (head.indexOf("\t") === -1) return head;
  let result = "";
  let column = 0;
  for (const char of head) {
    const next = advance(column, char);
    result += char === "\t" ? " ".repeat(next - column) : char;
    column = next;
  }
  return result;
}

/** A fence opener at `index`: 3+ backticks or tildes; a backtick fence's info string has no backticks. */
function fenceAt(text: string, index: number): { char: string; length: number } | null {
  const char = text[index];
  if (char !== "`" && char !== "~") return null;
  let end = index;
  while (text[end] === char) end++;
  if (end - index < 3) return null;
  if (char === "`" && text.indexOf("`", end) !== -1) return null;
  return { char, length: end - index };
}

/** A closing fence at `index`: the fence character at least as many times, then only spaces or tabs. */
function closesFence(text: string, index: number, fence: OpenFence): boolean {
  let end = index;
  while (text[end] === fence.char) end++;
  if (end - index < fence.length) return false;
  while (isSpaceOrTab(text[end])) end++;
  return end === text.length;
}

/** A thematic break at `index`: 3+ of the same `*`, `-` or `_`, with only spaces or tabs between. */
function isThematicBreak(text: string, index: number): boolean {
  const char = text[index];
  if (char !== "*" && char !== "-" && char !== "_") return false;
  let count = 0;
  for (let i = index; i < text.length; i++) {
    if (text[i] === char) count++;
    else if (!isSpaceOrTab(text[i])) return false;
  }
  return count >= 3;
}

/** An ATX heading at `index`: 1 to 6 `#`, then a space, a tab or the end of the line. */
function isHeading(text: string, index: number): boolean {
  let end = index;
  while (text[end] === "#") end++;
  return end > index && end - index <= 6 && (end === text.length || isSpaceOrTab(text[end]));
}

/**
 * A Markdoc tag alone on its line from `index`, such as `{% if $x %}`: the
 * first `%}` outside a quoted string ends the line. A variable (`{% $x %}`) is
 * inline content, not a tag line.
 */
function isTagLine(text: string, index: number): boolean {
  if (!text.startsWith("{%", index)) return false;
  let quoted = false;
  let end = -1;
  for (let i = index + 2; i < text.length - 1; i++) {
    const char = text[i];
    if (quoted) {
      if (char === "\\") i++;
      else if (char === '"') quoted = false;
    } else if (char === '"') {
      quoted = true;
    } else if (char === "%" && text[i + 1] === "}") {
      end = i;
      break;
    }
  }
  if (end === -1 || text.slice(end + 2).trim() !== "") return false;
  return text.slice(index + 2, end).trim()[0] !== "$";
}

/**
 * A list marker at `index` (`-`, `*`, `+`, or 1 to 9 digits and `.` or `)`),
 * followed by a space, a tab or the end of the line. `interrupts` is whether
 * it may start a list in the middle of a paragraph: a bullet, or the number 1.
 */
function listMarkerAt(text: string, index: number): { end: number; interrupts: boolean } | null {
  const char = text[index];
  let end: number;
  let interrupts = true;
  if (char === "-" || char === "*" || char === "+") {
    end = index + 1;
  } else {
    end = index;
    while (end - index < 9 && text[end] >= "0" && text[end] <= "9") end++;
    if (end === index || (text[end] !== "." && text[end] !== ")")) return null;
    interrupts = Number(text.slice(index, end)) === 1;
    end++;
  }
  if (end < text.length && !isSpaceOrTab(text[end])) return null;
  return { end, interrupts };
}

/**
 * `text` up to `index` with its blockquote markers kept and everything else
 * (list markers, indentation, tabs) turned into spaces of the same width. A
 * `>` that had no space after it gets one, since a space there would
 * otherwise be read as part of the marker.
 */
function closePrefixOf(text: string, index: number): string {
  let prefix = "";
  let column = 0;
  for (let i = 0; i < index; i++) {
    const char = text[i];
    const next = advance(column, char);
    if (char === ">") prefix += isSpaceOrTab(text[i + 1]) || i + 1 === index ? ">" : "> ";
    else prefix += " ".repeat(next - column);
    column = next;
  }
  return prefix;
}

/**
 * Reads a file one line at a time. After `scan(line)`, `inFence` says whether
 * that line was fenced code (a code line or the closing fence), and `fence` is
 * the fence still open, if any.
 */
export class BlockScanner {
  fence: OpenFence | null = null;
  inFence = false;

  private readonly containers: Container[] = [];
  /** The innermost container's last block is a paragraph that a line may continue lazily. */
  private paragraph = false;

  // The line being scanned, and how far it has been consumed.
  private text = "";
  /** Index of the next character. */
  private pos = 0;
  /** Column consumed so far; past `charColumn` inside a tab that is partly consumed. */
  private column = 0;
  /** Column where `text[pos]` starts. */
  private charColumn = 0;
  /**
   * Where the innermost matched blockquote's content starts (the line start
   * outside blockquotes): its column, the index of the character there, and
   * that character's own column, which is smaller when the space after `>`
   * was taken from a tab.
   */
  private quoteStart = 0;
  private quoteIndex = 0;
  private quoteCharColumn = 0;
  // The whitespace run around `pos`: `wsFrom` to `wsEnd`, which starts at column `wsColumn`.
  private wsFrom = -1;
  private wsEnd = 0;
  private wsColumn = 0;
  /** A thematic break of `breakChar` cannot start before `breakFail` on this line. */
  private breakChar = "";
  private breakFail = 0;

  /**
   * Scan the next line. Returns the index where the line's own text starts:
   * before it are container markers and indentation (inside fenced code, only
   * the indentation the fence removes from its code lines), whose tabs can be
   * expanded without changing what the line means.
   */
  scan(text: string): number {
    this.text = text;
    this.pos = this.column = this.charColumn = 0;
    this.quoteStart = this.quoteIndex = this.quoteCharColumn = 0;
    this.wsFrom = -1;
    this.breakFail = 0;
    const containers = this.containers;

    // 1. Continue the open containers.
    let matched = 0;
    for (; matched < containers.length; matched++) {
      const container = containers[matched];
      this.whitespace();
      const blank = this.wsEnd === text.length;
      if (container.quote) {
        // Like markdown-it, a blockquote continues at a `>` indented any amount.
        if (blank || text[this.wsEnd] !== ">") break;
        this.passQuoteMarker();
      } else if (blank) {
        if (container.empty) break;
      } else {
        container.empty = false;
        if (this.wsColumn - this.column < container.width) break;
        this.consume(container.width);
      }
    }
    const allMatched = matched === containers.length;

    // 2. A line inside every container of an open fence is code or closes it.
    // Any other line ends the fence: code has no lazy continuation lines.
    if (this.fence) {
      if (allMatched) {
        this.inFence = true;
        this.whitespace();
        if (closesFence(text, this.wsEnd, this.fence)) {
          // A closing fence indented 4+ columns is code. Its indentation is
          // what keeps it code, so its tabs count as indentation too.
          if (this.wsColumn - this.column < 4) this.fence = null;
          return this.wsEnd;
        }
        return this.codeStart(this.fence.indent);
      }
      this.fence = null;
    }
    this.inFence = false;

    // 3. Containers the line does not continue close, unless it continues a paragraph lazily.
    if (!allMatched) {
      if (this.paragraph && !this.endsLazyParagraph(matched)) return this.wsEnd;
      containers.length = matched;
      this.paragraph = false;
    }

    // 4. New containers.
    while (containers.length < MAX_CONTAINERS) {
      this.whitespace();
      const index = this.wsEnd;
      if (index === text.length || this.wsColumn - this.column >= 4) break;
      if (text[index] === ">") {
        this.passQuoteMarker();
        containers.push({ quote: true, width: 0, empty: false });
        this.paragraph = false;
        continue;
      }
      const marker = listMarkerAt(text, index);
      if (!marker || this.isBreakAfterMarkers(index)) break;
      let contentEnd = marker.end;
      while (isSpaceOrTab(text[contentEnd])) contentEnd++;
      const empty = contentEnd === text.length;
      // A list may interrupt a paragraph only with a bullet or the number 1, and not empty.
      if (this.paragraph && (empty || !marker.interrupts)) break;
      const markerColumn = this.wsColumn + (marker.end - index);
      let contentColumn = markerColumn;
      for (let i = marker.end; i < contentEnd; i++) contentColumn = advance(contentColumn, text[i]);
      // One space after the marker when there is no content or 5+ columns of it (the rest is indentation).
      const spaces = empty || contentColumn - markerColumn > 4 ? 1 : contentColumn - markerColumn;
      containers.push({ quote: false, width: markerColumn - this.column + spaces, empty });
      this.paragraph = false;
      this.pos = marker.end;
      this.column = this.charColumn = markerColumn;
      if (empty) break;
      this.consume(spaces);
    }

    // 5. The leaf block.
    this.whitespace();
    const index = this.wsEnd;
    if (index === text.length) {
      this.paragraph = false;
      return index;
    }
    const indent = this.wsColumn - this.column;
    if (indent < 4) {
      const fence = fenceAt(text, index);
      if (fence) {
        this.fence = { ...fence, indent: this.wsColumn - this.quoteStart, closePrefix: closePrefixOf(text, index) };
        this.paragraph = false;
        return index;
      }
      if (isThematicBreak(text, index) || isHeading(text, index)) {
        this.paragraph = false;
        return index;
      }
    }
    // A paragraph takes in a line indented 4+ columns as text, even a tag.
    if (!(this.paragraph && indent >= 4) && isTagLine(text, index)) {
      this.paragraph = false;
      return index;
    }
    this.paragraph = true;
    return index;
  }

  /**
   * Whether the rest of the line ends the containers from `first` on, which it
   * does not continue, instead of continuing their paragraph lazily: it is
   * blank, or starts a block. As in markdown-it, the first of those
   * containers that is a blockquote decides (the paragraph, with none), and
   * may disregard a block that is indented 4+ columns: any block when that
   * blockquote comes first, a list when one list item comes before it. Every
   * further blockquote decides again, disregarding nothing.
   */
  private endsLazyParagraph(first: number): boolean {
    this.whitespace();
    const text = this.text;
    const index = this.wsEnd;
    if (index === text.length || isTagLine(text, index)) return true;
    const containers = this.containers;
    let decider = first;
    while (decider < containers.length && !containers[decider].quote) decider++;
    let again = false;
    for (let i = decider + 1; i < containers.length && !again; i++) again = containers[i].quote;
    const indented = !again && this.wsColumn - this.column >= 4;
    if (indented && decider === first) return false;
    return (
      text[index] === ">" ||
      fenceAt(text, index) !== null ||
      isThematicBreak(text, index) ||
      isHeading(text, index) ||
      (!(indented && decider - first === 1) && listMarkerAt(text, index) !== null)
    );
  }

  /**
   * `isThematicBreak` for list markers opened one after another on a line
   * (`- - - x`): a scan that fails remembers where, so the markers after it do
   * not scan the rest of the line again.
   */
  private isBreakAfterMarkers(index: number): boolean {
    const text = this.text;
    const char = text[index];
    if (char === this.breakChar && index < this.breakFail) return false;
    if (char !== "*" && char !== "-") return false;
    let count = 0;
    for (let i = index; i < text.length; i++) {
      if (text[i] === char) count++;
      else if (!isSpaceOrTab(text[i])) {
        this.breakChar = char;
        this.breakFail = i;
        return false;
      }
    }
    return count >= 3;
  }

  /** Find the end of the whitespace run at `pos` (cached while `pos` stays inside it). */
  private whitespace(): void {
    if (this.wsFrom !== -1 && this.wsFrom <= this.pos && this.pos <= this.wsEnd) return;
    let index = this.pos;
    let column = this.charColumn;
    while (index < this.text.length && isSpaceOrTab(this.text[index])) {
      column = advance(column, this.text[index]);
      index++;
    }
    this.wsFrom = this.pos;
    this.wsEnd = index;
    this.wsColumn = column;
  }

  /** Consume up to `columns` columns of whitespace; a tab may be consumed in part. */
  private consume(columns: number): void {
    const text = this.text;
    while (columns > 0 && isSpaceOrTab(text[this.pos])) {
      const end = advance(this.charColumn, text[this.pos]);
      if (end - this.column > columns) {
        this.column += columns;
        return;
      }
      columns -= end - this.column;
      this.column = this.charColumn = end;
      this.pos++;
    }
  }

  /** Move past the `>` at the end of the current whitespace run, and the one optional space after it. */
  private passQuoteMarker(): void {
    this.pos = this.wsEnd + 1;
    this.column = this.charColumn = this.wsColumn + 1;
    if (isSpaceOrTab(this.text[this.pos])) this.consume(1);
    this.quoteStart = this.column;
    this.quoteIndex = this.pos;
    this.quoteCharColumn = this.charColumn;
  }

  /**
   * Where a code line's text starts. Like markdown-it, start from the
   * innermost blockquote's content and take up to the fence's `indent`
   * columns of indentation, which includes any list item markers' widths. A
   * tab that reaches past that point is indentation too: the code keeps the
   * columns it reaches past as spaces. With nothing to take, a tab that gave
   * the space after `>` stays in the code.
   */
  private codeStart(indent: number): number {
    const text = this.text;
    let index = this.quoteIndex;
    let column = this.quoteStart;
    let charColumn = this.quoteCharColumn;
    while (column - this.quoteStart < indent && isSpaceOrTab(text[index])) {
      column = charColumn = advance(charColumn, text[index]);
      index++;
    }
    return index;
  }
}
