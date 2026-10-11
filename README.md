# @vaneui/md

A React Markdown renderer that parses Markdown with Markdoc and renders every node as a [`@vaneui/ui`](https://vaneui.com) component (`# heading` becomes `Title`, `> quote` becomes `Card`, `` `code` `` becomes `Code`, and so on).

`@vaneui/ui` is a peer dependency; this package does not render standalone.

## Installation

```bash
npm install @vaneui/md @vaneui/ui
```

`yaml` is an optional peer dependency, needed only if you use the frontmatter parser or `vaneui` fences (see below).

## Basic usage

```tsx
import { Md } from "@vaneui/md";

export default function Page() {
  return (
    <Md
      content={`
# Hello world

This is a **Markdown** document rendered with VaneUI components.

- Item one
- Item two

> A blockquote.
`}
    />
  );
}
```

The host app must wrap this content in `@vaneui/ui`'s `ThemeProvider` and import one `@vaneui/ui` stylesheet (`import "@vaneui/ui/css"`), otherwise the output renders unstyled.

To get the document prose rhythm, import the styles once in your app (alongside your `@vaneui/ui` CSS):

```ts
import "@vaneui/md/styles";
```

## Props

| Prop | Type | Description |
|---|---|---|
| `content` | `string` | The Markdown source to render. Required. |
| `frontmatter` | `Record<string, unknown>` | Pre-parsed frontmatter. Wins over `parseFrontmatter`. Exposed in Markdown as `$markdoc.frontmatter`. |
| `parseFrontmatter` | `(raw: string) => Record<string, unknown>` | Parser for the raw YAML between `---` markers. Also parses `vaneui` fences. Throwing routes to an inline error. |
| `components` | `Record<string, React.ComponentType>` | String to component map used to resolve names in `vaneui` fences. Use `defaultRegistry` from `@vaneui/md/registry`, or supply your own. |
| `rendererTheme` | `MdRendererTheme` | Per-renderer visual defaults (one slot per `Md*` renderer). |
| `config` | `MdConfig` | Override Markdoc `nodes`, `components`, `tags`, `functions`, or `variables`, and register named `partials` for the `{% partial %}` tag. |

## Frontmatter

`<Md>` does not parse YAML by default. Pass already-parsed data via `frontmatter`, or a parser via `parseFrontmatter`. Both expose data at `$markdoc.frontmatter` for interpolation. The raw string is always available at `$markdoc.frontmatterRaw`.

```tsx
import { Md } from "@vaneui/md";
import { parseYamlFrontmatter } from "@vaneui/md/yaml";

// Auto-parse YAML
<Md content={md} parseFrontmatter={parseYamlFrontmatter} />

// Bring your own parser
<Md content={md} parseFrontmatter={(raw) => myParser(raw)} />

// Pre-parsed (skips parseFrontmatter)
<Md content={md} frontmatter={{ title: "Hello" }} />
```

Resolution order: `frontmatter` prop, then `parseFrontmatter(rawFrontmatter)`, then `undefined`. Malformed YAML renders an inline error above the body and never throws.

## Including other files

`@vaneui/md/include` expands include tags in Markdown source text before it reaches `<Md>`, so one `.md` file can pull in another by relative path (similar to GitBook includes or VitePress `<!--@include: -->`). It reads from the file system, so it is Node only: run it on the server or in a build step, never in the browser. Because the expansion happens on the raw text, everything else that reads that text (a table of contents, a search index, `llms.txt`, demo extraction) sees the full page too.

```md
# Guide

{% include "parts/intro.md" %}

{% include file="/shared/footer.md" /%}
```

```tsx
import { readFileSync } from "node:fs";
import { Md } from "@vaneui/md";
import { resolveIncludes } from "@vaneui/md/include";

const filePath = "docs/guide/page.md";
const content = resolveIncludes(readFileSync(filePath, "utf8"), {
  filePath,      // relative includes resolve against this file's directory
  root: "docs",  // includes must stay inside this directory
});

<Md content={content} />
```

How it works:

- A tag must be alone on its line. Indentation and blockquote markers (`> `, nested `> > `) before it are fine; a tag with anything else on its line, such as a list marker (`- {% include "x.md" %}`), is left untouched. These forms are recognized, with double or single quotes: `{% include "x.md" %}`, `{% include "x.md" /%}`, `{% include file="x.md" %}` and `{% include file="x.md" /%}`.
- Inline tags, other tags (Markdoc's render-time `{% partial %}` tag is left alone) and anything inside a fenced code block are not touched, so docs can still show the syntax itself. Fences are found the way Markdoc reads them, inside blockquotes and list items too: a fence indented 4 or more columns is text, `2.` cannot start a list in the middle of a paragraph, and a fence ends with the list item or blockquote it is in. Tables, link reference definitions and tags spanning several lines are read as plain paragraph text, and a tab after a second `>` on a line is measured from the line start (markdown-it measures it from the enclosing blockquote), so in such rare input a fence can be found where Markdoc sees none, or the other way round.
- Relative paths resolve against the file containing the tag, including inside nested includes. A leading `/` (or `\`) resolves from `root`.
- Every include must resolve inside `root`, and only `.md`, `.mdoc` and `.markdown` files can be included unless you change `extensions`, so a tag like `{% include "/.env" %}` cannot inline a secret. With the default reader, symlinks are resolved: the real path of each include must be inside the real path of `root`, a loop through a symlink is reported as a cycle, and the file is read from the real path that was checked.
- An included file loses its frontmatter, BOM and trailing newlines. Each of its lines gets the tag's prefix, so an include inside a list item stays in that item and an include in a blockquote stays in the quote. Empty lines get the prefix without trailing spaces (`>` in a blockquote) so the quote stays continuous.
- Under a prefix, tabs in an included line's container markers and indentation become spaces (tab stop 4), so its lists and blocks keep their shape; tabs in fenced code are kept as written. The one exception is a code line that looks like a closing fence but is indented 4 or more columns: its indentation is written as spaces, since that is what keeps it code. After a prefix ending in `>`, a line that starts with whitespace gets one extra space, because Markdown reads the first space after `>` as part of the marker.
- If an included file ends inside an unclosed code fence, a closing fence is added, so the rest of the page does not turn into code.
- The entry file loses its BOM and keeps its own frontmatter as written; tags inside that frontmatter are not expanded.
- An empty included file removes the tag line entirely.
- A file included several times is read once per call.
- The result always uses LF line endings.

| Option | Description |
|---|---|
| `filePath` | Path of the file `source` was read from. Required. |
| `root` | Includes must resolve to files inside this directory, and a leading `/` or `\` resolves from here. Default: `process.cwd()`. |
| `maxDepth` | Maximum nesting depth, where the entry file is depth 0. Default: `16`. |
| `maxIncludes` | Maximum number of successful includes in one call, counting a file each time it is included. Stops include trees that fan out exponentially. Default: `1000`. |
| `maxOutputLength` | Maximum length of the result, in characters. The source's own text counts from the start and each included line counts, with its prefix, as it is added, so the include that would make the result longer raises a `"limit"` error before the long text is built. That error is always thrown, without calling `onError`. A source with no includes is returned whatever its length. Default: `10_000_000`. |
| `extensions` | Extensions an include may target, compared case-insensitively. `false` allows any file. Default: `[".md", ".mdoc", ".markdown"]`. |
| `checkRealPaths` | Resolve symlinks and check real paths as described above. Default: `true` with the default reader, `false` with a custom `readFile`. Set it to `true` when your `readFile` wraps the file system (a cache, for example) to keep the symlink check. |
| `readFile` | `(absolutePath) => string`. Default: read UTF-8 from disk. Supply one to serve virtual files; throw an error with `code: "ENOENT"` for a missing file. |
| `onError` | `(error: IncludeError) => string`. The returned text replaces the failed tag (prefixed like included content; `""` removes the line). It must return a string synchronously; anything else, a promise included, throws a `TypeError`. Default: throw the error. |
| `onInclude` | `(absolutePath, fromPath) => void`. Called each time a file is included, in document order, for example to collect dependencies for a file watcher or a cache key. It is not called for an include that fails, such as a missing target; `error.file` in `onError` gives that path, so a watcher can still pick up the file once it is created. |

Failures raise an `IncludeError` with a `code` (`"not-found"`, `"cycle"`, `"max-depth"`, `"limit"`, `"outside-root"`, `"extension"` or `"read-failed"`), the `target` as written, the resolved `file`, the including file `from`, the 1-based `line` and the include `chain`. Messages name the tag and its location, for example `Include "parts/x.md" not found (in guide/page.md:12)`, `Include cycle: a.md -> b.md -> a.md (in b.md:3)` or `Include "parts/x.md" exceeds the output limit of 10000000 characters (in guide/page.md:12)`. An error thrown by `onError` or `onInclude` propagates unchanged. `instanceof IncludeError` also recognizes errors from the other build (CommonJS or ES module) of the package, should both be loaded: it accepts an `Error` whose own `Symbol.for("@vaneui/md/IncludeError")` property is `true`, read without calling a getter, and returns `false` rather than throwing for a revoked `Proxy`.

Invalid options throw before any file is read: a `TypeError` for a wrong type (for example a non-string `source` or an empty `filePath`) and a `RangeError` for a negative or `NaN` `maxDepth`, `maxIncludes` or `maxOutputLength`.

`resolveIncludesAsync` takes the same options and reads files asynchronously (its `readFile` may return a promise):

```ts
import { readFile } from "node:fs/promises";
import { resolveIncludesAsync } from "@vaneui/md/include";

const file = "docs/guide/page.md";
const dependencies = new Set<string>();
const content = await resolveIncludesAsync(await readFile(file, "utf8"), {
  filePath: file,
  root: "docs",
  onInclude: (path) => dependencies.add(path),
  onError: (error) => {
    if (error.file) dependencies.add(error.file); // rebuild once a missing file appears
    return `> Missing include: ${error.target}`;
  },
});
```

## The `vaneui` fence

A fenced code block tagged `vaneui` is parsed as YAML and rendered as a real VaneUI component tree at that spot in the document. No JSX and no build step are involved. Two things must be supplied to `<Md>`: `parseFrontmatter` (the YAML parser) and `components` (the name-to-component registry).

```tsx
import { Md } from "@vaneui/md";
import { parseYamlFrontmatter } from "@vaneui/md/yaml";
import { defaultRegistry } from "@vaneui/md/registry";

<Md
  content={source}
  parseFrontmatter={parseYamlFrontmatter}
  components={defaultRegistry}
/>
```

### Shorthand form

The component name and boolean flags go in the YAML key. The value is read by shape.

````md
```vaneui
Card primary filled:
  - Title xl: Welcome
  - Text: Everything you need to ship.
```
````

| Value shape | Becomes |
|---|---|
| empty | leaf with no children |
| string | `children` |
| list | `children` (expanded recursively) |
| map | props (`href`, `src`, explicit `children`, and so on) |

For non-boolean props, use the map form:

````md
```vaneui
Button primary filled:
  href: /get-started
  text: Get started
```
````

Component names must start with an uppercase letter. That is how a component spec is told apart from a plain prop map, so lowercase keys are left as data.

### Verbose form

Both forms compose in the same tree. Use the verbose form when you want the explicit `component` key.

````md
```vaneui
component: Card
primary: true
children:
  - component: Title
    xl: true
    text: Welcome
```
````

### Registry safety

`defaultRegistry` (`@vaneui/md/registry`) is a curated allowlist of presentational components. A name not in the registry renders nothing rather than throwing, and stateful or callback components (modals, popups, inputs, and similar) are excluded. Supply your own map to widen or narrow the set. Recursion is capped to keep deeply nested specs bounded.

## Per-renderer visual defaults: `rendererTheme`

Each `Md*` renderer has a slot in `MdRendererTheme`. A slot holds boolean props that the renderer spreads onto its underlying VaneUI element, so two renderers that share a primitive (for example `MdBlockquote` and `MdFence` both render `Card`) can be styled independently.

```tsx
<Md
  content={md}
  rendererTheme={{
    mdBlockquote: { primary: true },   // appearance only, keeps the left bar
    mdCode:       { success: true },
    mdFence:      { tertiary: true },  // code-block wrapper, separate from blockquote
  }}
/>
```

Slot keys mirror the renderer file names (`MdBlockquote` -> `mdBlockquote`, `MdFence` -> `mdFence`). You can also share a theme across instances with `RendererThemeContext.Provider`. The `rendererTheme` prop wins over an outer provider.

The merge is group-aware for VaneUI's mutually-exclusive categories (size, appearance, variant, shape, border, and so on): setting any key in a group drops the package defaults for that group, so your intent wins over the built-in defaults.

## Customizing renderers: `config`

Override any part of the default configuration. The merge is shallow per key.

```tsx
<Md
  content={md}
  config={{
    components: { MdHeading: CustomHeading },  // swap a renderer
    nodes: { fence: customFenceNode },          // change a node's Markdoc config
    tags: { callout: calloutTag },              // add a Markdoc {% callout %} tag
  }}
/>
```

`config` accepts `nodes`, `components`, `tags`, `functions`, `variables`, and `partials` (see [Partials](#partials)), all passed through to Markdoc.

## Partials

Markdoc's `{% partial %}` tag reuses a named snippet. Register snippets under `config.partials`, keyed by the name the tag's `file` attribute uses. A value can be Markdown source, a document from `Markdoc.parse`, or an array of parsed documents rendered in order.

```tsx
const partials = {
  "support.md": "Questions? Ask in **{% $channel %}**.",
};

<Md
  content={'# Setup\n\n{% partial file="support.md" variables={channel: "#help"} /%}'}
  config={{ partials }}
/>
```

A Markdown source is parsed the first time a render uses it and kept in a small cache shared by all renders (the 100 most recently used sources, up to 2,000,000 characters of source in total), so re-renders and `MdStream` updates do not parse an unchanged partial again. A source over 250,000 characters is parsed on every render instead of being cached. Rendering never modifies a parsed partial, so the same AST can be shared across renders and pages.

A partial renders with the page's variables (including `$markdoc.frontmatter`) plus anything passed in its `variables` attribute, and it can use other partials, itself included. Recursion works while the variables change, for example a navigation tree guarded by `{% if %}`:

```md
{% $node.title %}

{% if $node.child %}
{% partial file="nav.md" variables={node: $node.child} /%}
{% /if %}
```

Unlike Markdoc's built-in tag, a missing name renders an error instead of nothing, and a partial that comes back with the same variables while it is still rendering, directly or through other partials, renders an error naming the cycle (for example `Partial cycle: a.md -> b.md -> a.md`). Variables count as the same when their content is equal: arrays and plain objects compare by value, even when they link back to themselves (tree nodes that point to their parent), and anything else compares by identity. Any other nesting is capped at 16 levels.

One render handles at most 1000 partial tags, counting the ones that render an error, so a partial that uses itself more than once cannot multiply into millions of renders within those 16 levels. The first tag over the limit renders an error and later partial tags render nothing. Each `MdStream` block is a render of its own.

All of these errors render in place instead of throwing, and the rest of the page still renders.

Where Markdoc parses the tag as inline (next to text in a paragraph, heading, table cell or list item, or in link text), a partial contributes the inline content of its paragraphs, so `Built with {% partial file="brand.md" /%}.` stays a single paragraph. A partial with other block content (a list, a heading, a code block) used inline renders an error instead. A tag alone on its line, in a list item too, renders the partial in full.

Links cannot nest, so in link text such as `[see {% partial file="name.md" /%}](/docs)` a partial whose content has a Markdown link renders an error instead. The default `link` node marks link text for this check; a `config.nodes.link` override keeps it as long as it spreads `defaultNodesConfig.link`.

Errors render through `MdError`, a card styled by `rendererTheme.mdError`. Errors where the tag is inline render through `MdErrorInline`, a `<span>` styled by `rendererTheme.mdErrorInline`, so the DOM stays valid. Swap either one in `config.components`.

`partial` and `include` never take children. `<Md>` parses `{% partial file="a.md" %}` as if it were written `{% partial file="a.md" /%}` and ignores closing `{% /partial %}` and `{% /include %}` tags, so neither tag can swallow the content after it. The rule applies only while these tags are the library's own: a `partial` or `include` tag you pass in `config.tags` or through a preset parses with Markdoc's normal rules.

`Markdoc.validate(ast, { tags: defaultTagsConfig, partials })` reports a `file` that is not in `partials`, as Markdoc's built-in tag does.

Presets can contribute `partials` as well. An explicit `config.partials` entry wins over a preset entry with the same name.

Partials are named snippets you hand to `<Md>`, which never reads files. To pull in another file by relative path, as with GitBook's `{% include "../shared/note.md" %}`, expand includes before rendering with `resolveIncludes` from `@vaneui/md/include` (see [Including other files](#including-other-files)). Include syntax that reaches `<Md>` unexpanded renders an error pointing there, and the content after it still renders.

Both tags are ordinary Markdoc tag schemas, exported together as `defaultTagsConfig`. Pass your own `partial` or `include` in `config.tags` to replace either one.

## Syntax highlighting

Code fences render as a plain `<pre>` by default. Pass a `highlight` hook to render highlighted code. Two engines ship as optional subpaths; install the one you use.

```tsx
import { Md } from "@vaneui/md";
import { prismHighlighter } from "@vaneui/md/prism";

<Md content={md} highlight={prismHighlighter()} />
```

Shiki uses a synchronous core, so you import the languages and themes you need and pass them in:

```tsx
import { shikiHighlighter } from "@vaneui/md/shiki";
import tsx from "shiki/langs/tsx.mjs";
import githubDark from "shiki/themes/github-dark.mjs";

<Md content={md} highlight={shikiHighlighter({ langs: [tsx], themes: [githubDark] })} />
```

The hook signature is `(code, language, meta?) => ReactNode`, so any function of that shape works as a custom engine.

## Presets and createMd()

A preset bundles renderer configuration: `nodes`, `tags`, `functions`, `variables`, `partials`, renderer swaps (`components`), vaneui-fence allowlist entries (`registry`), `rendererTheme`, `highlight`, `transform`, `sanitize`, and co-shipped `styles`. Compose presets with `createMd().use(...)`:

```tsx
import { createMd } from "@vaneui/md";
import { shikiPreset } from "@vaneui/md/shiki";

const Doc = createMd().use(shikiPreset({ langs, themes }));
<Doc content={md} />
```

Or fold presets on a single render with the `presets` prop:

```tsx
<Md content={md} presets={[shikiPreset({ langs, themes })]} />
```

Presets merge left to right. Two presets that define the same `tags`, `components`, `functions`, `partials`, or `registry` key log a development warning and the last one wins. Explicit `<Md>` props win over preset-supplied values.

## Safe rendering of untrusted content

The `vaneui` fence resolves component names through the registry allowlist, and props are always sanitized: `dangerouslySetInnerHTML`, event handlers, and `ref` are stripped, and `javascript:`, `vbscript:`, and non-image `data:` URLs are dropped from `href`/`src`. To tighten further for user- or AI-authored content, pass a `sanitize` policy or use `untrustedPreset`:

```tsx
import { Md, untrustedPreset } from "@vaneui/md";

<Md content={userMarkdown} presets={[untrustedPreset]} parseFrontmatter={parseYamlFrontmatter} components={registry} />
```

A `SanitizePolicy` can set `allowedProtocols`, `blockedProps`, and `allowComponents`.

## Post-transform hook

The `transform` prop runs on Markdoc's renderable tree after transform and before render, so it can rewrite nodes. Built-in helpers: `headingAnchors(options?)` and `rewriteLinks(fn)`.

```tsx
import { Md, headingAnchors } from "@vaneui/md";

<Md content={md} transform={headingAnchors()} />
```

`headingAnchors` accepts `{ slug, link, name }`. Pass `slug` to match your own anchor convention (for example a docs site whose table of contents computes ids a specific way), `link: true` to wrap each heading in a plain `<a href="#id">`, and `name` when you render headings under a non-default component name.

```tsx
<Md content={md} transform={headingAnchors({ slug: myToId, link: true })} />
```

## Streaming

`MdStream` renders growing markdown (for example token-by-token LLM output) by splitting it into fence-aware blocks and memoizing each, so only the changed trailing block re-parses:

```tsx
import { MdStream } from "@vaneui/md";

<MdStream content={streamingText} highlight={prismHighlighter()} />
```

## Exports

- `@vaneui/md` — `Md`, `MdStream`, `createMd`, all `Md*` renderers, `mergePresets`, `untrustedPreset`, `useMdStream`, `renderSpec`, `expandShorthand`, `collapseShorthand`, `visit`, `headingAnchors`, `rewriteLinks`, `defaultNodesConfig`, `defaultComponents`, `defaultTagsConfig`, `defaultRendererTheme`, `mergeRendererTheme`, `strictSanitizePolicy`, the contexts (`RegistryContext`, `ParserContext`, `HighlightContext`, `RendererThemeContext`, `SanitizeContext`), and the types (`MdPreset`, `MdPartial`, `MdTransform`, `HighlightFn`, `SanitizePolicy`, and more).
- `@vaneui/md/shiki` — `shikiHighlighter`, `shikiPreset`. `shiki` is an optional peer dependency.
- `@vaneui/md/prism` — `prismHighlighter`, `prismPreset`. `prism-react-renderer` is an optional peer dependency.
- `@vaneui/md/yaml` — `parseYamlFrontmatter`, a thin wrapper over `yaml.parse`. `yaml` is an optional peer dependency.
- `@vaneui/md/registry` — `defaultRegistry`, the safe component allowlist. Imported only when used, so consumers who do not render `vaneui` fences pay no bundle cost.
- `@vaneui/md/include` (Node only) exports `resolveIncludes`, `resolveIncludesAsync` and `IncludeError` for expanding `{% include %}` tags at load time, plus the option and error-code types.
- `@vaneui/md/styles` — the `.vaneui-md` prose-rhythm layer. It adds spacing rules built on VaneUI tokens; it does not re-bundle `@vaneui/ui` CSS. Import it alongside your VaneUI CSS.

## Development

```bash
npm install
npm run type-check   # tsc --noEmit
npm test             # type-check + jest
npm run build        # clean + rollup (CJS + ESM) + postcss
npm run playground   # install + run the playground dev server
```

## License

[MIT](./LICENSE)
