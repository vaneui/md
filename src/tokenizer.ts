import Markdoc from "@markdoc/markdoc";

type Tokenizer = InstanceType<typeof Markdoc.Tokenizer>;

/** A Markdown token as the Markdoc tokenizer returns it. */
export type Token = ReturnType<Tokenizer["tokenize"]>[number];

/** The parts of the Markdown tokenizer's inline state that the guard reads. */
interface InlineState {
  src: string;
  pos: number;
  level: number;
  md?: { options?: { maxNesting?: number } };
}

type InlineRule = (state: InlineState, silent: boolean) => boolean;

interface NamedRule {
  name?: unknown;
  fn?: unknown;
}

interface InlineRuler {
  __rules__?: NamedRule[];
  at?(name: string, fn: InlineRule): void;
}

/** The name Markdoc registers its inline tag rule under. */
const TAG_RULE = "containers";

/** The tokenizer's default nesting limit, used when the options do not carry one. */
const DEFAULT_MAX_NESTING = 100;

/** `{% /name %}`: a closing tag, which lowers the nesting level. */
const CLOSING_TAG = /\{%\s*\//y;

/**
 * Keeps unclosed inline tags from reaching the tokenizer's nesting limit.
 *
 * Every opening tag in a paragraph (`{% a %}`) raises the inline nesting
 * level, and nothing lowers it until the tag is closed. Markdoc releases
 * before 0.5.11 carry a tokenizer whose inline loop never ends once the level
 * reaches the limit (100) with text still to read, so about a hundred unclosed
 * tags in one paragraph hung the parse. The dependency range starts at a fixed
 * release; this guard covers an install that still resolves an older one, and
 * makes every release behave the same.
 *
 * The tag rule is wrapped so that it declines one level below the limit. From
 * there on tag syntax in that run of inline content is left as text, except
 * closing tags, which only lower the level. The rest of the document, and the
 * other inline rules in that run, keep working.
 *
 * The wrapper reaches into the tokenizer's Markdown parser, which Markdoc does
 * not document. If a release changes that shape the tokenizer is returned
 * unguarded; such a release is newer than the fix.
 */
export function guardInlineNesting<T extends object>(tokenizer: T): T {
  try {
    const ruler = (tokenizer as { parser?: { inline?: { ruler?: InlineRuler } } }).parser?.inline?.ruler;
    const original = ruler?.__rules__?.find((rule) => rule?.name === TAG_RULE)?.fn;
    if (!ruler || typeof ruler.at !== "function" || typeof original !== "function") return tokenizer;
    const tagRule = original as InlineRule;
    ruler.at(TAG_RULE, (state, silent) => {
      const limit = state.md?.options?.maxNesting ?? DEFAULT_MAX_NESTING;
      // A silent call only measures the tag, and the parser raises the level by one around it.
      const level = silent ? state.level - 1 : state.level;
      if (level >= limit - 1) {
        CLOSING_TAG.lastIndex = state.pos;
        if (!CLOSING_TAG.test(state.src)) return false;
      }
      return tagRule(state, silent);
    });
  } catch {
    // Not the parser shape this guard knows: leave the tokenizer as it is.
  }
  return tokenizer;
}

let tokenizer: Tokenizer | undefined;

/** Tokenizes Markdown with the package's one shared, guarded Markdoc tokenizer. */
export function tokenize(source: string): Token[] {
  tokenizer ??= guardInlineNesting(new Markdoc.Tokenizer());
  return tokenizer.tokenize(source);
}
