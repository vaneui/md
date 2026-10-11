/**
 * Load-time file includes for Markdown source text. Node only: this module
 * reads from the file system, so import it from a server or a build step,
 * never from browser code. It is a separate subpath (`@vaneui/md/include`) so
 * the main entry stays browser-safe.
 *
 * `resolveIncludes` and `resolveIncludesAsync` share one core: a generator
 * (`expandLines` / `includeFile`) that does all parsing, path resolution and
 * error handling, and yields an I/O request whenever it needs a file read or
 * a real path. The sync and async drivers only perform that I/O and feed the
 * result back in.
 *
 * Lines go straight into the result, each with the prefixes of every include
 * tag above it, so the length of the result is known (and checked against
 * `maxOutputLength`) before a line is built.
 */
import * as fs from "node:fs";
import * as path from "node:path";
import { BlockScanner, expandTabs, type OpenFence } from "./include-blocks";
import { isInside, resolveIncludePath } from "./include-paths";

export type IncludeErrorCode =
  | "not-found"
  | "cycle"
  | "max-depth"
  | "outside-root"
  | "extension"
  | "limit"
  | "read-failed";

/**
 * Global brand on every IncludeError, so `instanceof` also recognizes errors
 * created by another copy of this module (for example the CommonJS and ES
 * module builds loaded side by side).
 */
const INCLUDE_ERROR_BRAND = Symbol.for("@vaneui/md/IncludeError");

/** Thrown (or passed to `onError`) when an include tag cannot be expanded. */
export class IncludeError extends Error {
  /**
   * `instanceof IncludeError` accepts real instances and any `Error` with the
   * `Symbol.for("@vaneui/md/IncludeError")` brand as an own property.
   * Subclasses only accept their own instances. A value whose prototype
   * cannot be read (a revoked Proxy) is not an IncludeError.
   */
  static [Symbol.hasInstance](value: unknown): value is IncludeError {
    const hasInstance = Function.prototype[Symbol.hasInstance];
    try {
      if (hasInstance.call(this, value)) return true;
      return (
        this === IncludeError &&
        hasInstance.call(Error, value) &&
        Object.getOwnPropertyDescriptor(value, INCLUDE_ERROR_BRAND)?.value === true
      );
    } catch {
      return false;
    }
  }

  readonly code: IncludeErrorCode;
  /** The path exactly as written in the tag. */
  readonly target: string;
  /** Resolved absolute path of the target, when it could be resolved. */
  readonly file: string | undefined;
  /** Absolute path of the file containing the tag. */
  readonly from: string;
  /** 1-based line number of the tag within `from`. */
  readonly line: number;
  /**
   * Absolute paths of the include stack, outermost first: the entry file
   * first and `from` last.
   */
  readonly chain: readonly string[];
  /** The underlying error, set for `read-failed`. */
  declare readonly cause?: unknown;

  constructor(
    message: string,
    details: {
      code: IncludeErrorCode;
      target: string;
      file: string | undefined;
      from: string;
      line: number;
      chain: readonly string[];
      cause?: unknown;
    },
  ) {
    super(message);
    Object.defineProperty(this, INCLUDE_ERROR_BRAND, { value: true });
    this.name = "IncludeError";
    this.code = details.code;
    this.target = details.target;
    this.file = details.file;
    this.from = details.from;
    this.line = details.line;
    this.chain = details.chain;
    if ("cause" in details) {
      Object.defineProperty(this, "cause", {
        value: details.cause,
        writable: true,
        configurable: true,
        enumerable: false,
      });
    }
  }
}

export interface ResolveIncludesOptions {
  /** Path of the file `source` was read from. Relative include paths resolve against its directory. Required. */
  filePath: string;
  /** Includes must resolve to files inside this directory. A leading `/` (or `\`) in an include path resolves from here. Default: process.cwd(). */
  root?: string;
  /** Maximum nesting depth (entry file = depth 0). Default: 16. */
  maxDepth?: number;
  /**
   * Maximum number of successful includes in one call, counting a file each
   * time it is included. Exceeding it raises an IncludeError with code
   * "limit", which stops include trees that fan out exponentially.
   * Default: 1000.
   */
  maxIncludes?: number;
  /**
   * Maximum length of the result, in characters. The source's own text counts
   * from the start, and included lines count, with their prefixes, as they are
   * added: the include whose content would make the result longer raises an
   * IncludeError with code "limit". That error is always thrown, without
   * calling `onError`. Only included content raises it, so a source with no
   * includes is returned whatever its length. Default: 10_000_000.
   */
  maxOutputLength?: number;
  /**
   * File extensions an include may target, compared case-insensitively
   * (a leading dot is optional). Anything else raises an IncludeError with
   * code "extension", so `{% include "/.env" %}` cannot inline a secret.
   * `false` allows any file. Default: [".md", ".mdoc", ".markdown"].
   */
  extensions?: readonly string[] | false;
  /**
   * Resolve symlinks: every include must have a real path inside the real
   * path of `root`, cycles are detected by real path, and files are read from
   * the real path that was checked. Default: true with the default reader,
   * false with a custom `readFile` (whose files may be virtual). Set it to
   * true for a `readFile` that wraps the file system, such as a cache.
   */
  checkRealPaths?: boolean;
  /**
   * Read a file as UTF-8 text. Default: fs.readFileSync(path, "utf8").
   * To report a missing file, throw an error whose `code` is "ENOENT".
   */
  readFile?: (absolutePath: string) => string;
  /**
   * Called for each failed include; the string it returns replaces the tag
   * line (prefixed like included content; an empty string removes the line).
   * It must return a string synchronously. Default: throw the IncludeError.
   */
  onError?: (error: IncludeError) => string;
  /**
   * Called after each file is included, e.g. to collect dependencies for a
   * file watcher or cache key. Called once per successful include (so twice
   * for a file included twice), in document order, right after the file is
   * read and before its own includes are expanded. Not called for a failed
   * include; `error.file` in `onError` has the path a watcher needs.
   */
  onInclude?: (absolutePath: string, fromPath: string) => void;
}

export interface ResolveIncludesAsyncOptions extends Omit<ResolveIncludesOptions, "readFile"> {
  /** Default: fs.promises.readFile(path, "utf8"). */
  readFile?: (absolutePath: string) => string | Promise<string>;
}

const DEFAULT_MAX_DEPTH = 16;
const DEFAULT_MAX_INCLUDES = 1000;
const DEFAULT_MAX_OUTPUT_LENGTH = 10_000_000;
const DEFAULT_EXTENSIONS: readonly string[] = [".md", ".mdoc", ".markdown"];

/**
 * Expand `{% include "path" %}` tags in Markdown source text, synchronously.
 * Returns the expanded text with LF line endings.
 */
export function resolveIncludes(source: string, options: ResolveIncludesOptions): string {
  const session = createSession("resolveIncludes", source, options);
  const read = options.readFile ?? ((file: string) => fs.readFileSync(file, "utf8"));
  const run = expandEntry(source, session);
  let step = run.next();
  while (!step.done) {
    const request = step.value;
    let result: IoResult;
    try {
      result = {
        ok: true,
        value: request.op === "read" ? read(request.path) : fs.realpathSync.native(request.path),
      };
    } catch (error) {
      result = { ok: false, error };
    }
    step = run.next(result);
  }
  return step.value;
}

/**
 * Expand `{% include "path" %}` tags in Markdown source text, reading files
 * asynchronously. Same behaviour as `resolveIncludes`.
 */
export async function resolveIncludesAsync(
  source: string,
  options: ResolveIncludesAsyncOptions,
): Promise<string> {
  const session = createSession("resolveIncludesAsync", source, options);
  const read = options.readFile ?? ((file: string) => fs.promises.readFile(file, "utf8"));
  const run = expandEntry(source, session);
  let step = run.next();
  while (!step.done) {
    const request = step.value;
    let result: IoResult;
    try {
      result = {
        ok: true,
        value: await (request.op === "read" ? read(request.path) : fs.promises.realpath(request.path)),
      };
    } catch (error) {
      result = { ok: false, error };
    }
    step = run.next(result);
  }
  return step.value;
}

// ---------------------------------------------------------------------------
// Options
// ---------------------------------------------------------------------------

type IoRequest = { op: "read" | "realpath"; path: string };
type IoResult = { ok: true; value: unknown } | { ok: false; error: unknown };
type Expansion<T> = Generator<IoRequest, T, IoResult>;

/** One file on the include stack. */
interface Frame {
  /** Absolute path as resolved from the tags (used in errors and callbacks). */
  file: string;
  /** Identity for cycle detection: the real path when real paths are checked, else `file`. */
  key: string;
}

/** An include tag, for errors about it. */
interface IncludeSite {
  target: string;
  file: string | undefined;
  from: string;
  line: number;
  chain: readonly string[];
}

/** Where the lines of one file (or of `onError`'s replacement text) go in the result. */
interface Sink {
  /**
   * Text before each non-empty line: the prefixes of the include tags above,
   * outermost first. All but the outermost have their tabs expanded, since
   * they no longer start at column 0. Empty when the lines go in unchanged.
   */
  prefix: readonly string[];
  prefixLength: number;
  /** What an empty line becomes: the prefixes, the innermost cut after its last `>`. */
  emptyLine: readonly string[];
  emptyLineLength: number;
  /** The include the lines come from; undefined for the entry, whose text is counted up front. */
  site: IncludeSite | undefined;
  /**
   * An included file loses its trailing blank lines, so its blank lines wait
   * here (text and text start) until a non-blank line follows. Null for text
   * whose blank lines are kept.
   */
  blanks: Array<[string, number]> | null;
}

interface Session {
  api: string;
  root: string;
  maxDepth: number;
  maxIncludes: number;
  maxOutputLength: number;
  /** Lowercased allowed extensions; null allows any file. */
  extensions: readonly string[] | null;
  checkRealPaths: boolean;
  /** Real path of `root`, computed (with the entry's) before the first include when real paths are checked. */
  realRoot: string | undefined;
  onError: (error: IncludeError) => unknown;
  onInclude: ((absolutePath: string, fromPath: string) => void) | undefined;
  entry: Frame;
  /** Successful includes so far. */
  includes: number;
  /** Per-call caches, keyed by the path the request was made for. */
  realPaths: Map<string, IoResult>;
  reads: Map<string, IoResult>;
  /** The result's lines so far. */
  out: string[];
  /** Length of the result, plus one: the entry's own text, then each included line as it is added. */
  length: number;
  /** The sinks being written to, outermost (the entry's) first. */
  sinks: Sink[];
  /** Blank lines waiting in `sinks`. */
  waitingBlanks: number;
}

function createSession(
  api: string,
  source: unknown,
  options: ResolveIncludesOptions | ResolveIncludesAsyncOptions,
): Session {
  if (typeof source !== "string") {
    throw new TypeError(`${api}: source must be a string, got ${describeValue(source)}`);
  }
  if (typeof options !== "object" || options === null) {
    throw new TypeError(`${api}: options must be an object with a filePath`);
  }
  if (typeof options.filePath !== "string" || options.filePath === "") {
    throw new TypeError(`${api}: options.filePath must be a non-empty string`);
  }
  if (options.root !== undefined && typeof options.root !== "string") {
    throw new TypeError(`${api}: options.root must be a string`);
  }
  for (const name of ["readFile", "onError", "onInclude"] as const) {
    if (options[name] !== undefined && typeof options[name] !== "function") {
      throw new TypeError(`${api}: options.${name} must be a function`);
    }
  }
  if (options.checkRealPaths !== undefined && typeof options.checkRealPaths !== "boolean") {
    throw new TypeError(`${api}: options.checkRealPaths must be a boolean`);
  }
  const entry = path.resolve(options.filePath);
  return {
    api,
    root: path.resolve(options.root ?? process.cwd()),
    maxDepth: countOption(api, "maxDepth", options.maxDepth, DEFAULT_MAX_DEPTH),
    maxIncludes: countOption(api, "maxIncludes", options.maxIncludes, DEFAULT_MAX_INCLUDES),
    maxOutputLength: countOption(api, "maxOutputLength", options.maxOutputLength, DEFAULT_MAX_OUTPUT_LENGTH),
    extensions: extensionsOption(api, options.extensions),
    checkRealPaths: options.checkRealPaths ?? options.readFile === undefined,
    realRoot: undefined,
    onError:
      options.onError ??
      ((error) => {
        throw error;
      }),
    onInclude: options.onInclude,
    entry: { file: entry, key: entry },
    includes: 0,
    realPaths: new Map(),
    reads: new Map(),
    out: [],
    length: 0,
    sinks: [],
    waitingBlanks: 0,
  };
}

function countOption(api: string, name: string, value: unknown, fallback: number): number {
  if (value === undefined) return fallback;
  if (typeof value !== "number") throw new TypeError(`${api}: options.${name} must be a number`);
  if (!(value >= 0)) throw new RangeError(`${api}: options.${name} must be a number >= 0`);
  return value;
}

function extensionsOption(api: string, value: unknown): readonly string[] | null {
  if (value === undefined) return DEFAULT_EXTENSIONS;
  if (value === false) return null;
  if (!Array.isArray(value) || value.some((extension) => typeof extension !== "string")) {
    throw new TypeError(`${api}: options.extensions must be an array of strings or false`);
  }
  return (value as string[]).map((extension) =>
    (extension === "" || extension.startsWith(".") ? extension : "." + extension).toLowerCase(),
  );
}

// ---------------------------------------------------------------------------
// Core (shared by both drivers)
// ---------------------------------------------------------------------------

function* expandEntry(source: string, session: Session): Expansion<string> {
  const lines = toLines(source);
  // The entry keeps its frontmatter as written; tags and fences inside it are not looked at.
  const body = frontmatterEnd(lines);
  const scanned = scanLines(lines, body, true);
  // The entry's own text is in the result whatever the includes add, so it counts from the start.
  for (let i = 0; i < lines.length; i++) {
    if (i < body || scanned.tags[i - body] === null) session.length += lines[i].length + 1;
  }
  for (let i = 0; i < body; i++) session.out.push(lines[i]);
  const sink: Sink = { prefix: [], prefixLength: 0, emptyLine: [], emptyLineLength: 0, site: undefined, blanks: null };
  session.sinks.push(sink);
  yield* expandLines(lines, body, scanned, [session.entry], sink, session);
  return session.out.join("\n");
}

/** Expand include tags in `lines[start..]` of the file on top of `stack`, writing its lines to `sink`. */
function* expandLines(
  lines: readonly string[],
  start: number,
  scanned: ScannedLines,
  stack: readonly Frame[],
  sink: Sink,
  session: Session,
): Expansion<void> {
  for (let i = start; i < lines.length; i++) {
    const tag = scanned.tags[i - start];
    if (tag) yield* includeFile(tag, i + 1, stack, sink, session);
    else emit(session, sink, lines[i], scanned.starts[i - start]);
  }
}

/** Resolve, check, read and expand one include tag, writing its content (or onError's text) in its place. */
function* includeFile(
  tag: IncludeTag,
  line: number,
  stack: readonly Frame[],
  parent: Sink,
  session: Session,
): Expansion<void> {
  const target = tag.target;
  const from = stack[stack.length - 1].file;
  const chain = stack.map((frame) => frame.file);
  const fail = (
    code: IncludeErrorCode,
    file: string | undefined,
    extra: { cause?: unknown; real?: string } = {},
  ): void => {
    const message = describeError(code, target, file, from, line, stack, session, extra);
    const site = { target, file, from, line, chain };
    const error = new IncludeError(
      message,
      code === "read-failed" ? { ...site, code, cause: extra.cause } : { ...site, code },
    );
    emitReplacement(session.onError(error), childSink(parent, tag.prefix, site, false), session);
  };

  if (session.checkRealPaths && session.realRoot === undefined) {
    const realRoot = yield* realpathOf(session.root, session);
    session.realRoot = realRoot.ok ? String(realRoot.value) : session.root;
    const realEntry = yield* realpathOf(session.entry.file, session);
    if (realEntry.ok) session.entry.key = String(realEntry.value);
  }

  if (target.trim() === "") return fail("not-found", undefined);

  const file = resolveIncludePath(path, session.root, from, target);
  if (!hasAllowedExtension(file, session)) return fail("extension", file);

  let key = file;
  if (session.checkRealPaths) {
    const realRoot = session.realRoot!;
    const real = yield* realpathOf(file, session);
    if (!real.ok) {
      // Do not reveal whether a path outside root exists.
      if (!isInside(path, session.root, file) && !isInside(path, realRoot, file)) {
        return fail("outside-root", file);
      }
      return isMissing(real.error)
        ? fail("not-found", file)
        : fail("read-failed", file, { cause: real.error });
    }
    key = String(real.value);
    if (!isInside(path, realRoot, key)) return fail("outside-root", file);
    if (!hasAllowedExtension(key, session)) return fail("extension", file, { real: key });
  } else if (!isInside(path, session.root, file)) {
    return fail("outside-root", file);
  }

  if (stack.some((frame) => frame.key === key)) return fail("cycle", file);
  if (stack.length > session.maxDepth) return fail("max-depth", file);
  if (session.includes >= session.maxIncludes) return fail("limit", file);

  // With real paths checked, read the real path that passed the checks.
  const read = yield* readOf(key, session);
  if (!read.ok) {
    return isMissing(read.error)
      ? fail("not-found", file)
      : fail("read-failed", file, { cause: read.error });
  }
  if (typeof read.value !== "string") {
    return fail("read-failed", file, {
      cause: new TypeError(`readFile returned ${describeValue(read.value)}, expected a string`),
    });
  }

  session.includes++;
  session.onInclude?.(file, from);

  const lines = toLines(read.value);
  const start = bodyStart(lines);
  const scanned = scanLines(lines, start, true);
  const sink = childSink(parent, tag.prefix, { target, file, from, line, chain }, true);
  session.sinks.push(sink);
  yield* expandLines(lines, start, scanned, [...stack, { file, key }], sink, session);
  // Drop the file's trailing blank lines.
  session.waitingBlanks -= sink.blanks!.length;
  sink.blanks = [];
  // Close a fence the file leaves open, so the including page does not turn into code.
  const fence = scanned.fence;
  if (fence) emit(session, sink, fence.closePrefix + fence.char.repeat(fence.length), fence.closePrefix.length);
  session.sinks.pop();
}

function* realpathOf(file: string, session: Session): Expansion<IoResult> {
  let result = session.realPaths.get(file);
  if (result === undefined) {
    result = yield { op: "realpath", path: file };
    session.realPaths.set(file, result);
  }
  return result;
}

function* readOf(file: string, session: Session): Expansion<IoResult> {
  let result = session.reads.get(file);
  if (result === undefined) {
    result = yield { op: "read", path: file };
    session.reads.set(file, result);
  }
  return result;
}

/** Write `onError`'s return value in place of the failed tag, like included content. */
function emitReplacement(value: unknown, sink: Sink, session: Session): void {
  if (typeof value !== "string") {
    const isPromise = typeof (value as { then?: unknown } | null)?.then === "function";
    throw new TypeError(
      `${session.api}: options.onError must return a string (the replacement text), got ${describeValue(value)}` +
        (isPromise ? "; it cannot be async" : ""),
    );
  }
  const lines = trimTrailingBlankLines(normalizeNewlines(value).split("\n"));
  const scanned = scanLines(lines, 0, false);
  session.sinks.push(sink);
  lines.forEach((text, i) => emit(session, sink, text, scanned.starts[i]));
  session.sinks.pop();
}

function hasAllowedExtension(file: string, session: Session): boolean {
  return session.extensions === null || session.extensions.indexOf(path.extname(file).toLowerCase()) !== -1;
}

// ---------------------------------------------------------------------------
// Output
// ---------------------------------------------------------------------------

/** One file's lines from `start`, read by `BlockScanner`. */
interface ScannedLines {
  /** Where each line's own text starts (see `BlockScanner.scan`); before it, tabs may be expanded. */
  starts: number[];
  /** The include tag on each line, or null. Tags in fenced code are left alone. */
  tags: Array<IncludeTag | null>;
  /** The fence the file leaves open, if any. */
  fence: OpenFence | null;
}

function scanLines(lines: readonly string[], start: number, findTags: boolean): ScannedLines {
  const scanner = new BlockScanner();
  const starts: number[] = [];
  const tags: Array<IncludeTag | null> = [];
  for (let i = start; i < lines.length; i++) {
    starts.push(scanner.scan(lines[i]));
    tags.push(findTags && !scanner.inFence ? matchIncludeTag(lines[i]) : null);
  }
  return { starts, tags, fence: scanner.fence };
}

/**
 * The sink for the content of an include tag whose prefix (indentation and
 * blockquote markers) is `prefix`, inside `parent`.
 */
function childSink(parent: Sink, prefix: string, site: IncludeSite, trimBlanks: boolean): Sink {
  const sink: Sink = { ...parent, site, blanks: trimBlanks ? [] : null };
  if (prefix === "") return sink;
  // An empty line gets the prefix without trailing whitespace, so a blockquote stays continuous.
  const quoted = prefix.slice(0, prefix.lastIndexOf(">") + 1);
  if (parent.prefix.length === 0) {
    sink.prefix = [prefix];
    sink.prefixLength = prefix.length;
    if (quoted !== "") {
      sink.emptyLine = [quoted];
      sink.emptyLineLength = quoted.length;
    }
    return sink;
  }
  const expanded = expandTabs(prefix, prefix.length);
  sink.prefix = [...parent.prefix, expanded];
  sink.prefixLength = parent.prefixLength + expanded.length;
  if (quoted !== "") {
    const expandedQuoted = expandTabs(quoted, quoted.length);
    sink.emptyLine = [...parent.prefix, expandedQuoted];
    sink.emptyLineLength = parent.prefixLength + expandedQuoted.length;
  }
  return sink;
}

/** Add a line (whose own text starts at `start`) to the result through `sink`. */
function emit(session: Session, sink: Sink, text: string, start: number): void {
  if (sink.blanks !== null && isBlank(text)) {
    sink.blanks.push([text, start]);
    session.waitingBlanks++;
    return;
  }
  // Blank lines waiting before this line are not trailing after all.
  if (session.waitingBlanks > 0) {
    for (const waiting of session.sinks) {
      const blanks = waiting.blanks;
      if (blanks === null || blanks.length === 0) continue;
      waiting.blanks = [];
      session.waitingBlanks -= blanks.length;
      for (const [blank, blankStart] of blanks) write(session, waiting, blank, blankStart);
    }
  }
  write(session, sink, text, start);
}

/**
 * Put the line under the sink's prefixes. The tabs before its own text become
 * spaces, so its container markers and indentation keep their width under the
 * prefix; the rest, such as code in a fence, is kept as written.
 */
function write(session: Session, sink: Sink, text: string, start: number): void {
  if (sink.site === undefined) {
    session.out.push(text);
    return;
  }
  let head = "";
  let length: number;
  if (text === "") length = sink.emptyLineLength;
  else if (sink.prefix.length === 0) length = text.length;
  else {
    head = expandTabs(text, start);
    // Markdown reads one space (or one column of a tab) after `>` as part of
    // the marker. So that a line keeps all of its indentation and code:
    // - after a prefix ending in `>`, write that space before a line that
    //   starts with whitespace;
    // - a code line can start with a tab that gave part of its width as the
    //   space after its own `>` (`>\tcode` in a fence). Under the prefix that
    //   tab can shrink to one column and become the space, so write it out.
    const innermost = sink.prefix[sink.prefix.length - 1];
    if (innermost.endsWith(">") && isSpaceOrTab(head === "" ? text[start] : head[0])) head = " " + head;
    if (text[start] === "\t" && text[start - 1] === ">") head += " ";
    length = sink.prefixLength + head.length + text.length - start;
  }
  session.length += length + 1;
  if (session.length - 1 > session.maxOutputLength) throw outputLimitError(sink.site, session);
  session.out.push(
    text === ""
      ? sink.emptyLine.join("")
      : sink.prefix.length === 0
        ? text
        : sink.prefix.join("") + head + text.slice(start),
  );
}

function isSpaceOrTab(char: string | undefined): boolean {
  return char === " " || char === "\t";
}

// ---------------------------------------------------------------------------
// Syntax
//
// Every pattern here runs on untrusted lines, so each is written to match in
// linear time: no whitespace run can be split between two quantifiers, and no
// pattern ends in `.*$`.
// ---------------------------------------------------------------------------

/** Blockquote markers and indentation before a tag, e.g. "  ", "> ", ">> ", " > >  ". */
const QUOTE_PREFIX = /^(?:[ \t]*>)*[ \t]*/;

/**
 * A block-level include tag after its prefix. Accepts `{% include "x" %}`,
 * `{% include "x" /%}`, `{% include file="x" %}` and
 * `{% include file="x" /%}`, with single or double quotes.
 */
const INCLUDE_TAG = /^\{%\s*include(?:\s+file\s*=\s*|\s*)(?:"([^"]*)"|'([^']*)')\s*(?:\/\s*)?%\}\s*$/;

/** An include tag alone on its line. */
interface IncludeTag {
  /** Indentation and blockquote markers before the tag; included lines get it too. */
  prefix: string;
  /** The path as written in the tag. */
  target: string;
}

/**
 * An include tag alone on its line, after optional indentation or blockquote
 * markers (the prefix). A tag after a list marker is not matched.
 */
function matchIncludeTag(line: string): IncludeTag | null {
  if (line.indexOf("{%") === -1) return null;
  const prefix = QUOTE_PREFIX.exec(line)![0];
  const match = INCLUDE_TAG.exec(line.slice(prefix.length));
  if (!match) return null;
  return { prefix, target: match[1] ?? match[2] };
}

// ---------------------------------------------------------------------------
// Text helpers
// ---------------------------------------------------------------------------

function normalizeNewlines(text: string): string {
  return text.replace(/\r\n?/g, "\n");
}

/** Strip a UTF-8 BOM, normalize line endings, split into lines. */
function toLines(text: string): string[] {
  const withoutBom = text.charCodeAt(0) === 0xfeff ? text.slice(1) : text;
  return normalizeNewlines(withoutBom).split("\n");
}

/**
 * Index of the line after a leading YAML frontmatter block (same rule as
 * Markdoc: first line `---`, closed by the next `---` line, surrounding
 * whitespace ignored). 0 when there is none.
 */
function frontmatterEnd(lines: readonly string[]): number {
  if (lines.length === 0 || lines[0].trim() !== "---") return 0;
  for (let close = 1; close < lines.length; close++) {
    if (lines[close].trim() === "---") return close + 1;
  }
  return 0;
}

/** Index of the first body line of an included file: after its frontmatter and the blank lines that follow it. */
function bodyStart(lines: readonly string[]): number {
  let start = frontmatterEnd(lines);
  if (start === 0) return 0;
  while (start < lines.length && isBlank(lines[start])) start++;
  return start;
}

function isBlank(line: string): boolean {
  return line.trim() === "";
}

function trimTrailingBlankLines(lines: string[]): string[] {
  let end = lines.length;
  while (end > 0 && isBlank(lines[end - 1])) end--;
  return lines.slice(0, end);
}

// ---------------------------------------------------------------------------
// Errors
// ---------------------------------------------------------------------------

function isMissing(error: unknown): boolean {
  const code = (error as { code?: unknown } | null)?.code;
  return code === "ENOENT" || code === "ENOTDIR" || code === "EISDIR";
}

function describeValue(value: unknown): string {
  if (value === null) return "null";
  if (value === undefined) return "undefined";
  if (typeof (value as { then?: unknown }).then === "function") return "a promise";
  if (Array.isArray(value)) return "an array";
  return typeof value === "object" ? "an object" : `a ${typeof value}`;
}

/** A path for messages: relative to root (or its real path), with `/` separators, when inside it. */
function displayPath(file: string, session: Session): string {
  for (const base of [session.root, session.realRoot]) {
    if (base !== undefined && isInside(path, base, file)) {
      return path.relative(base, file).split(path.sep).join("/");
    }
  }
  return file;
}

/** "a", "a or b", "a, b or c". */
function listOf(items: readonly string[]): string {
  if (items.length <= 1) return items.join("");
  return `${items.slice(0, -1).join(", ")} or ${items[items.length - 1]}`;
}

function describeError(
  code: IncludeErrorCode,
  target: string,
  file: string | undefined,
  from: string,
  line: number,
  stack: readonly Frame[],
  session: Session,
  extra: { cause?: unknown; real?: string },
): string {
  const where = `(in ${displayPath(from, session)}:${line})`;
  switch (code) {
    case "not-found":
      return `Include "${target}" not found ${where}`;
    case "outside-root":
      return `Include "${target}" resolves outside the root directory ${where}`;
    case "extension": {
      const allowed = session.extensions ?? [];
      const expected = allowed.length > 0 ? `expected ${listOf(allowed)}` : "no extensions are allowed";
      const subject =
        extra.real === undefined
          ? `Include "${target}" is`
          : `Include "${target}" resolves to "${displayPath(extra.real, session)}", which is`;
      return `${subject} not an allowed file type, ${expected} ${where}`;
    }
    case "cycle": {
      const chain = [...stack.map((frame) => frame.file), file ?? target].map((entry) =>
        displayPath(entry, session),
      );
      return `Include cycle: ${chain.join(" -> ")} ${where}`;
    }
    case "max-depth":
      return `Include "${target}" exceeds the maximum include depth of ${session.maxDepth} ${where}`;
    case "limit":
      return `Include "${target}" exceeds the limit of ${session.maxIncludes} includes ${where}`;
    case "read-failed": {
      const reason = extra.cause instanceof Error ? extra.cause.message : String(extra.cause);
      return `Include "${target}" could not be read: ${reason} ${where}`;
    }
  }
}

/** The error for an include whose content would make the result longer than `maxOutputLength`. */
function outputLimitError(site: IncludeSite, session: Session): IncludeError {
  return new IncludeError(
    `Include "${site.target}" exceeds the output limit of ${session.maxOutputLength} characters ` +
      `(in ${displayPath(site.from, session)}:${site.line})`,
    { ...site, code: "limit" },
  );
}
