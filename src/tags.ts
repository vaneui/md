import Markdoc, {
  Tag,
  type Config,
  type Node,
  type RenderableTreeNodes,
  type Schema,
  type ValidationError,
} from "@markdoc/markdoc";
import type { MdPartial } from "./types";

// Variables keys for the partial tag's own state. Markdown cannot read them
// (Markdoc variable names only allow letters, digits, `_` and `-`), and the tag
// drops them from a `variables` attribute, so Markdown cannot set them either.

/** The chain of partials being rendered, outermost first. */
const PARTIAL_CHAIN = "$$vaneui:partialChain";
/** The partial budget of the transform, shared by every partial on every chain. */
const PARTIAL_BUDGET = "$$vaneui:partialBudget";
/** Set while link text is transformed, so a partial there cannot nest a second link. */
const IN_LINK = "$$vaneui:inLink";
/** The current partial's name, as Markdoc's built-in tag sets it. */
const PARTIAL_FILENAME = "$$partial:filename";
const RESERVED_VARIABLES: ReadonlySet<string> = new Set([PARTIAL_CHAIN, PARTIAL_BUDGET, IN_LINK, PARTIAL_FILENAME]);

/** Maximum partial nesting depth, matching the `vaneui` fence spec depth cap. */
const MAX_PARTIAL_DEPTH = 16;

/**
 * Partial tags one transform handles (rendered or turned into an error), so a
 * partial that uses itself several times cannot fan out exponentially within
 * the depth cap. Matches the include resolver's default `maxIncludes`.
 */
const MAX_PARTIALS = 1000;

/** Tags that are self-closing by definition, so the parse treats them that way. */
const SELF_CLOSING_TAGS: readonly string[] = ["include", "partial"];

/** Number of parsed Markdown-string partials kept across renders. */
const PARSE_CACHE_ENTRIES = 100;

/**
 * Most characters the cached partials may add up to, counting each name plus
 * its source (`string.length`). A parsed AST takes many times its source in
 * memory, so the cache is bounded by size as well as by entry count.
 */
const PARSE_CACHE_SIZE = 2_000_000;

/** A partial whose name and source are longer than this is parsed on every use, never cached. */
const PARSE_CACHE_ENTRY_SIZE = 250_000;

/** One partial on the render chain. */
interface PartialChainEntry {
  file: string;
  /** Every variable the partials on the chain have set so far, this one's last. */
  variables: Record<string, unknown>;
}

type Token = ReturnType<InstanceType<typeof Markdoc.Tokenizer>["tokenize"]>[number];

let tokenizer: InstanceType<typeof Markdoc.Tokenizer> | undefined;

/**
 * `include` and `partial` never take children. Markdoc still pairs an opening
 * tag with a later closing tag, so `{% include "x.md" %}` (GitBook style, never
 * closed) would make the rest of the document its children, and a stray
 * `{% /include %}` would parse as a second tag. Turn every opening tag named in
 * `names` into a self-closing one and drop the closing tags, in nested tokens
 * too (inline content, fence content). Returns `tokens` itself when no token
 * was dropped.
 */
function selfCloseTags(tokens: Token[], names: ReadonlySet<string>): Token[] {
  let result: Token[] | undefined;
  tokens.forEach((token, index) => {
    if (token.children) token.children = selfCloseTags(token.children, names);
    const tag: unknown = token.meta?.tag;
    const named = typeof tag === "string" && names.has(tag);
    if (named && token.type === "tag_close") {
      result ??= tokens.slice(0, index);
      return;
    }
    if (named && token.type === "tag_open") {
      token.type = "tag";
      token.nesting = 0;
    }
    result?.push(token);
  });
  return result ?? tokens;
}

export interface ParseMarkdownOptions {
  /** File name recorded in node locations (`Markdoc.parse`'s `file`). */
  file?: string;
  /**
   * Tag names parsed as self-closing (opening tags never take children,
   * closing tags are dropped). Defaults to `include` and `partial`. `<Md>`
   * passes only the names whose schema is still the library's own.
   */
  selfClosingTags?: readonly string[];
}

/**
 * `Markdoc.parse`, except that the `include` and `partial` tags (or the
 * `selfClosingTags` given) are always parsed as self-closing. A document
 * without those tags parses exactly as with `Markdoc.parse`.
 */
export function parseMarkdown(source: string, options: ParseMarkdownOptions = {}): Node {
  const { file, selfClosingTags = SELF_CLOSING_TAGS } = options;
  tokenizer ??= new Markdoc.Tokenizer();
  let tokens = tokenizer.tokenize(source);
  if (selfClosingTags.length > 0) tokens = selfCloseTags(tokens, new Set(selfClosingTags));
  return Markdoc.parse(tokens, file);
}

/**
 * The tag names in `tags` that should be parsed as self-closing: `include` and
 * `partial` while they are this library's own schemas. A replacement from
 * `config.tags` or a preset parses with Markdoc's normal rules.
 */
export function selfClosingTagNames(tags: Record<string, unknown> | undefined): string[] {
  const names: string[] = [];
  if (tags?.include === includeTag) names.push("include");
  if (tags?.partial === partialTag) names.push("partial");
  return names;
}

interface CachedPartial {
  ast: Node;
  /** Name length plus source length, counted against `PARSE_CACHE_SIZE`. */
  size: number;
}

/**
 * Parsed Markdown-string partials, least recently used first, keyed by the
 * JSON of `[name, source, self-closing tag names]` so no two inputs share a
 * key. Markdoc's `resolve` and `transform` build new nodes and never modify the
 * AST they read, so a parsed partial is safe to share between renders.
 */
const parseCache = new Map<string, CachedPartial>();
let parseCacheSize = 0;

function parsePartial(name: string, source: string, selfClosingTags: readonly string[]): Node {
  const size = name.length + source.length;
  if (size > PARSE_CACHE_ENTRY_SIZE) return parseMarkdown(source, { file: name, selfClosingTags });
  const key = JSON.stringify([name, source, [...selfClosingTags].sort()]);
  const cached = parseCache.get(key);
  if (cached) {
    parseCache.delete(key);
    parseCache.set(key, cached);
    return cached.ast;
  }
  const ast = parseMarkdown(source, { file: name, selfClosingTags });
  parseCache.set(key, { ast, size });
  parseCacheSize += size;
  // Evict least recently used entries. The new entry is last and fits on its
  // own, so it is never evicted here.
  for (const [oldest, entry] of parseCache) {
    if (parseCache.size <= PARSE_CACHE_ENTRIES && parseCacheSize <= PARSE_CACHE_SIZE) break;
    parseCache.delete(oldest);
    parseCacheSize -= entry.size;
  }
  return ast;
}

function defineValue(target: object, key: string, value: unknown): void {
  // defineProperty, not assignment, so a name like `__proto__` stays a plain key.
  Object.defineProperty(target, key, { value, enumerable: true, writable: true, configurable: true });
}

/**
 * Prepare `config.partials` for one render. A Markdown-string entry is parsed
 * on first access (through a small cache shared across renders, so an
 * unchanged partial is not parsed again) and then stored as a plain value, so
 * a partial used several times in a render is looked up once and an unused
 * one is never parsed. Entries stay writable for custom tags.
 */
export function preparePartials(
  partials: Record<string, MdPartial> | undefined,
  selfClosingTags: readonly string[] = SELF_CLOSING_TAGS,
): Record<string, MdPartial> | undefined {
  if (!partials) return undefined;
  const prepared: Record<string, MdPartial> = {};
  for (const [name, value] of Object.entries(partials)) {
    if (typeof value !== "string") {
      defineValue(prepared, name, value);
      continue;
    }
    Object.defineProperty(prepared, name, {
      enumerable: true,
      configurable: true,
      get() {
        const parsed = parsePartial(name, value, selfClosingTags);
        defineValue(prepared, name, parsed);
        return parsed;
      },
      set(next: unknown) {
        defineValue(prepared, name, next);
      },
    });
  }
  return prepared;
}

/**
 * An error tag: `MdErrorInline` where Markdoc parsed the tag as inline (in a
 * paragraph, heading, table cell, list item text or link text), so only
 * phrasing content is valid, `MdError` otherwise.
 */
function errorTag(message: string, inline: boolean): Tag {
  return new Tag(inline ? "MdErrorInline" : "MdError", {}, [message]);
}

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function hasPartial(partials: Record<string, unknown> | undefined, file: string): boolean {
  return !!partials && Object.prototype.hasOwnProperty.call(partials, file) && partials[file] != null;
}

/** Partial tags handled so far in one transform. */
class PartialBudget {
  used = 0;
  /** The limit error has been rendered; later partial tags render nothing. */
  reported = false;
}

/**
 * Budgets for partial tags outside any partial, keyed by the transform's
 * `config.tags`. `Markdoc.transform` builds a new `tags` object on every call,
 * and configs derived from it with a spread (a link's text, a custom tag) keep
 * that object, so every partial tag in one transform shares one budget and the
 * next transform, even of the same AST with the same config, starts a new one.
 * Inside a partial the budget is passed down in the variables. (Calling
 * `node.transform(config)` directly, without `Markdoc.transform`, several times
 * with the same `tags` object shares one budget across those calls; `<Md>`
 * always goes through `Markdoc.transform`.)
 */
const budgets = new WeakMap<object, PartialBudget>();

function budgetFor(config: Config): PartialBudget {
  const inherited: unknown = config.variables?.[PARTIAL_BUDGET];
  if (inherited instanceof PartialBudget) return inherited;
  const key: object = config.tags ?? config;
  let budget = budgets.get(key);
  if (!budget) budgets.set(key, (budget = new PartialBudget()));
  return budget;
}

/** The `variables` attribute without the keys the tag sets itself. */
function ownVariablesOf(value: unknown): Record<string, unknown> | undefined {
  if (!isPlainObject(value)) return undefined;
  const keys = Object.keys(value);
  if (!keys.some((key) => RESERVED_VARIABLES.has(key))) return value;
  const own: Record<string, unknown> = {};
  for (const key of keys) if (!RESERVED_VARIABLES.has(key)) defineValue(own, key, value[key]);
  return own;
}

/** Arrays, and objects whose prototype is `Object.prototype` or `null`: compared by content. */
function isPlainData(value: unknown): value is Record<string, unknown> {
  if (typeof value !== "object" || value === null) return false;
  if (Array.isArray(value)) return true;
  const proto: unknown = Object.getPrototypeOf(value);
  return proto === Object.prototype || proto === null;
}

function sameScalar(a: unknown, b: unknown): boolean {
  return a === b || (Number.isNaN(a) && Number.isNaN(b));
}

/**
 * Whether two sets of partial variables are structurally equal. Arrays and
 * plain objects compare by content (object keys in any order); anything else
 * (functions, class instances, dates) by identity, with `NaN` equal to `NaN`.
 * An identical reference is equal without being walked, so data passed down
 * unchanged (a `$tree` every level shares) costs nothing. A pair of objects
 * already being compared counts as equal, so cyclic data (a tree whose nodes
 * link back to their parent) compares by structure without looping. The walk
 * is iterative, so deep data cannot overflow the stack.
 */
function sameVariables(a: Record<string, unknown>, b: Record<string, unknown>): boolean {
  const compared = new Map<object, Set<object>>();
  const pending: [unknown, unknown][] = [[a, b]];
  for (let pair = pending.pop(); pair; pair = pending.pop()) {
    const [x, y] = pair;
    if (sameScalar(x, y)) continue;
    if (!isPlainData(x) || !isPlainData(y) || Array.isArray(x) !== Array.isArray(y)) return false;
    let partners = compared.get(x);
    if (partners?.has(y)) continue;
    if (!partners) compared.set(x, (partners = new Set()));
    partners.add(y);
    if (Array.isArray(x) && Array.isArray(y) && x.length !== y.length) return false;
    const keys = Object.keys(x);
    if (keys.length !== Object.keys(y).length) return false;
    for (const key of keys) {
      if (!Object.prototype.hasOwnProperty.call(y, key)) return false;
      const xValue = x[key];
      const yValue = y[key];
      if (sameScalar(xValue, yValue)) continue;
      if (!isPlainData(xValue) || !isPlainData(yValue)) return false;
      pending.push([xValue, yValue]);
    }
  }
  return true;
}

/**
 * The same partial is already rendering with the same variables, so rendering
 * it again would repeat forever. Only chain entries for the same file are
 * compared. Variables that cannot be compared (a getter or proxy that throws)
 * count as different: the depth cap and the partial budget still stop the
 * recursion.
 */
function repeats(item: unknown, next: PartialChainEntry): boolean {
  if (!isPlainObject(item) || item.file !== next.file || !isPlainObject(item.variables)) return false;
  try {
    return sameVariables(item.variables, next.variables);
  } catch {
    return false;
  }
}

/** `{% partial %}` used inline: paragraphs unwrap into their inline content. */
function inlineContent(parts: Node[]): Node[] | undefined {
  const content: Node[] = [];
  for (const part of parts) {
    for (const child of part.children) {
      if (child.type !== "paragraph") return undefined;
      if (content.length > 0) content.push(new Markdoc.Ast.Node("softbreak"));
      content.push(...child.children);
    }
  }
  return content;
}

function containsLink(nodes: Node[]): boolean {
  for (const node of nodes) {
    if (node.type === "link") return true;
    for (const child of node.walk()) if (child.type === "link") return true;
  }
  return false;
}

/**
 * `transform` for the `link` node (`defaultNodesConfig.link`): renders the
 * link like a plain `render` schema (`MdLink` by default) and marks its text,
 * so a partial used inside the link text renders an error instead of nesting
 * a second link.
 */
export function transformLink(node: Node, config: Config): RenderableTreeNodes {
  // Markdoc also accepts a variables function, which cannot carry the flag.
  const variables: unknown = config.variables;
  const textConfig =
    typeof variables === "function" ? config : { ...config, variables: { ...config.variables, [IN_LINK]: true } };
  const children = node.transformChildren(textConfig);
  const render = node.findSchema(config)?.render;
  if (!render) return children;
  return new Tag(render, node.transformAttributes(config), children);
}

/**
 * `file` attribute type for the partial tag: like Markdoc's own, it reports a
 * partial that is not in `config.partials` when the document is validated.
 */
class PartialFile {
  validate(file: unknown, config: Config): ValidationError[] {
    if (typeof file === "string" && hasPartial(config.partials, file)) return [];
    return [
      {
        id: "attribute-value-invalid",
        level: "error",
        message: `Partial \`${String(file)}\` not found. The 'file' attribute must be set in \`config.partials\``,
      },
    ];
  }
}

/**
 * Replaces Markdoc's built-in `{% partial file="name" /%}` tag. Same attributes
 * and scoping (`variables` merged over the page variables, `$$partial:filename`
 * set), plus: a missing partial renders an error instead of nothing; a partial
 * that comes back with structurally equal variables while it is still
 * rendering (directly or through others) renders an error naming the cycle
 * instead of overflowing the stack, while recursion with changing variables
 * (for example a tree guarded by `{% if %}`) works; nesting is capped at 16
 * levels; one transform handles at most 1000 partial tags, then renders one
 * error and skips the rest; and used inline, the partial's paragraphs are
 * unwrapped into inline content (with no Markdown link inside link text). A
 * Markdown-string partial is parsed here when the tag is used outside `<Md>`.
 * All of these errors render in place instead of throwing.
 */
export const partialTag: Schema = {
  selfClosing: true,
  attributes: {
    file: { type: PartialFile, render: false, required: true },
    variables: { type: Object, render: false },
  },
  transform(node: Node, config: Config) {
    const { file, variables } = node.attributes;
    const inline = node.inline;

    const budget = budgetFor(config);
    if (budget.used >= MAX_PARTIALS) {
      if (budget.reported) return [];
      budget.reported = true;
      const subject = typeof file === "string" && file !== "" ? `Partial "${file}"` : "Partial tag";
      return errorTag(
        `${subject} exceeds the limit of ${MAX_PARTIALS} partial tags per render. ` +
          `It and any later partial tags are not rendered.`,
        inline,
      );
    }
    budget.used++;

    if (!("file" in node.attributes)) {
      return errorTag("Partial tag is missing its file attribute.", inline);
    }
    if (file == null || file === "") {
      return errorTag("Partial tag has an empty file name.", inline);
    }
    if (typeof file !== "string") {
      return errorTag(`Partial file name must be a string, got ${typeof file}.`, inline);
    }

    const storedChain: unknown = config.variables?.[PARTIAL_CHAIN];
    const parentChain: unknown[] = Array.isArray(storedChain) ? storedChain : [];
    const parent = parentChain[parentChain.length - 1];
    const ownVariables = ownVariablesOf(variables);
    const chainVariables = {
      ...(isPlainObject(parent) && isPlainObject(parent.variables) ? parent.variables : undefined),
      ...ownVariables,
    };
    const entry: PartialChainEntry = { file, variables: chainVariables };
    const chain = [...parentChain, entry];
    const names = () => chain.map((item) => (isPlainObject(item) ? String(item.file) : "?")).join(" -> ");
    if (parentChain.some((item) => repeats(item, entry))) {
      return errorTag(`Partial cycle: ${names()}`, inline);
    }
    if (chain.length > MAX_PARTIAL_DEPTH) {
      return errorTag(`Partial depth limit of ${MAX_PARTIAL_DEPTH} exceeded: ${names()}`, inline);
    }

    const partials: Record<string, MdPartial> | undefined = config.partials;
    if (!hasPartial(partials, file)) {
      return errorTag(`Partial "${file}" not found. Add it to config.partials.`, inline);
    }
    const value = partials![file];
    const partial =
      typeof value === "string" ? parsePartial(file, value, selfClosingTagNames(config.tags)) : value;

    const scopedConfig: Config = {
      ...config,
      variables: {
        ...config.variables,
        ...ownVariables,
        [PARTIAL_FILENAME]: file,
        [PARTIAL_CHAIN]: chain,
        [PARTIAL_BUDGET]: budget,
      },
    };
    const parts = (Array.isArray(partial) ? partial : [partial]).map((part) => part.resolve(scopedConfig));
    if (!inline) return parts.flatMap((part) => part.transformChildren(scopedConfig));

    const content = inlineContent(parts);
    if (!content) {
      return errorTag(`Partial "${file}" contains block content and cannot be used inline.`, true);
    }
    if (config.variables?.[IN_LINK] === true && containsLink(content)) {
      return errorTag(`Partial "${file}" contains a link and cannot be used inside link text.`, true);
    }
    return new Markdoc.Ast.Node("inline", {}, content).transformChildren(scopedConfig);
  },
};

/**
 * Fallback for file-include syntax (`{% include "x.md" %}` or
 * `{% include file="x.md" /%}`) that reached `<Md>` unexpanded. `<Md>` never
 * reads files, so this renders an error pointing at `resolveIncludes`. The tag
 * is self-closing; children only exist in an AST parsed without the
 * self-closing rule (plain `Markdoc.parse`), and they render after the error.
 */
export const includeTag: Schema = {
  selfClosing: true,
  attributes: {
    primary: { type: String, render: false },
    file: { type: String, render: false },
  },
  transform(node: Node, config: Config) {
    const file = node.attributes.file ?? node.attributes.primary;
    const subject = typeof file === "string" && file !== "" ? `Include "${file}"` : "Include tag";
    const message =
      `${subject} was not resolved. Pass the source through resolveIncludes ` +
      `from @vaneui/md/include before rendering it. It expands include tags ` +
      `that sit alone on their line (indentation and blockquote markers are ` +
      `fine), outside code fences.`;
    return [errorTag(message, node.inline), ...node.transformChildren(config)];
  },
};
