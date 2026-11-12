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

/**
 * The rules Markdoc adds to the Markdown parser for `{% %}` syntax: block tags
 * plus fence annotations and tags inside fences (`annotations`, a block rule
 * and a core rule), and inline tags, variables and annotations (`containers`).
 */
const TAG_RULES = ["annotations", TAG_RULE];

/** Token types that only tag syntax produces. */
const TAG_TOKEN = /^(?:tag|tag_open|tag_close|annotation|error)$/;

const hasTagTokens = (tokens: Token[]): boolean =>
  tokens.some((token) => TAG_TOKEN.test(token.type) || (Array.isArray(token.children) && hasTagTokens(token.children)));

/**
 * Turns `{% %}` syntax off in a tokenizer, so it reads plain Markdown and
 * leaves `{% ... %}` in the text. Returns false when the tokenizer does not
 * have the shape this relies on (the Markdown parser's `disable`) or still
 * produces tag tokens afterwards.
 */
function disableTagSyntax(tokenizer: Tokenizer): boolean {
  try {
    const parser = (tokenizer as unknown as { parser?: { disable?(names: string[], ignoreInvalid: boolean): unknown } }).parser;
    if (!parser || typeof parser.disable !== "function") return false;
    parser.disable(TAG_RULES, true);
    return !hasTagTokens(tokenizer.tokenize('{% a %}\n\ntext {% $b %} {% c d= %}\n\n```js {% e=1 %}\n{% f %}\n```\n'));
  } catch {
    return false;
  }
}

export interface TokenizeOptions {
  /** `false` reads `{% ... %}` as plain text: no tags, variables, functions or annotations. Default `true`. */
  tagSyntax?: boolean;
}

let tokenizer: Tokenizer | undefined;
let plainTokenizer: Tokenizer | undefined;

/** Tokenizes Markdown with the package's shared, guarded Markdoc tokenizer (one with tag syntax, one without). */
export function tokenize(source: string, options: TokenizeOptions = {}): Token[] {
  tokenizer ??= guardInlineNesting(new Markdoc.Tokenizer());
  if (options.tagSyntax !== false) return tokenizer.tokenize(source);
  if (!plainTokenizer) {
    const plain = new Markdoc.Tokenizer();
    if (disableTagSyntax(plain)) {
      plainTokenizer = plain;
    } else {
      // eslint-disable-next-line no-console
      console.warn("[@vaneui/md] tagSyntax: false is not supported by the installed @markdoc/markdoc; tags stay on.");
      plainTokenizer = tokenizer;
    }
  }
  return plainTokenizer.tokenize(source);
}
