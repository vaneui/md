# CLAUDE.md — @vaneui/md

## What This Is

`@vaneui/md` is a React markdown renderer that parses Markdown via Markdoc and renders the output using `@vaneui/ui` components. It's a thin layer: Markdoc handles parsing/transformation, and each markdown node is mapped to a VaneUI component (e.g., `# heading` → `Title`, `> quote` → `Card`, `` `code` `` → `Code`).

Peer dependency on `@vaneui/ui` — this project does not work standalone.

For styled output, the host app must render `<Md>` inside `@vaneui/ui`'s `ThemeProvider` and import exactly one `@vaneui/ui` stylesheet (`@vaneui/ui/css`, or `@vaneui/ui/vars` if the app runs its own Tailwind v4 build).

## Stack

- TypeScript, React 19 (peer range: 16.8+)
- Markdoc (`@markdoc/markdoc` ^0.5.2) for parsing + AST transformation
- Rollup for JS bundling (CJS + ESM dual output)
- PostCSS for CSS bundling
- Jest + ts-jest + jsdom for testing
- Peer dependency on `@vaneui/ui`

## Commands

```bash
npm run type-check     # tsc --noEmit
npm run build          # clean + build:js (rollup) + build:css (postcss)
npm run build:js       # type-check + rollup (CJS + ESM)
npm run build:css      # PostCSS bundle to dist/styles/index.css
npm test               # type-check + jest
npm run playground     # install + run playground dev server
```

**Always run `npm run build` + `npm test` before reporting work complete.** Both must pass.

## Project Structure

```
src/
├── components/              # All markdown renderers
│   ├── md.tsx               # Main <Md> component (parses + renders + provides contexts)
│   ├── md-components.tsx    # Barrel exports all MdXxx components
│   ├── structure/           # MdDocument, MdInline
│   ├── headings/            # MdHeading
│   ├── text/                # MdParagraph, MdText, MdStrong, MdEm, MdS, MdCode
│   ├── links/               # MdLink
│   ├── media/               # MdImage
│   ├── lists/               # MdList, MdItem
│   ├── blocks/              # MdBlockquote, MdHr
│   ├── code/                # MdFence — handles both code blocks AND `vaneui` spec fences
│   ├── tables/              # MdTable, MdThead, MdTbody, MdTr, MdTd, MdTh
│   ├── breaks/              # MdHardbreak, MdSoftbreak
│   └── errors/              # MdError (block card), MdErrorInline (span for errors where a tag is inline)
├── config/
│   └── default-config.ts    # Markdoc node config + default component mapping
├── styles/
│   └── index.css            # PostCSS source, bundled to dist/styles/index.css
├── tests/                   # Jest tests (md.test, theme tests, node tests)
├── types/                   # MdProps, MdConfig, theme types
├── context.ts               # RegistryContext + ParserContext + HighlightContext (used by MdFence)
├── rendererTheme.ts         # MdRendererTheme, defaultRendererTheme, RendererThemeContext, mergeRendererTheme
├── spec.ts                  # ComponentSpec, renderSpec, expandShorthand, collapseShorthand
├── registry.ts              # defaultRegistry — safe VaneUI component allowlist (subpath: @vaneui/md/registry)
├── yaml.ts                  # parseYamlFrontmatter (subpath: @vaneui/md/yaml)
├── tags.ts                  # partialTag, includeTag (defaultTagsConfig), parseMarkdown, selfClosingTagNames, preparePartials + partial parse cache
├── include.ts               # resolveIncludes / resolveIncludesAsync / IncludeError (Node-only subpath: @vaneui/md/include)
├── include-blocks.ts        # BlockScanner: which lines are fenced code, read like Markdoc (internal to include.ts)
├── setupTests.ts
└── index.ts                 # Public barrel export
```

## Key Architectural Patterns

### Rendering pipeline

1. `Md` receives `content: string`, optional `frontmatter`, `parseFrontmatter`, `components`, `rendererTheme`, `highlight`, `transform`, `sanitize`, `presets`, `config`
2. The effective tags (`defaultTagsConfig` merged with `config.tags`, presets included) are computed first, then `parseMarkdown(content, { selfClosingTags })` (`src/tags.ts`) → AST. It is `Markdoc.parse` except that `include` and `partial`, while they are the library's own schemas (`selfClosingTagNames`), always parse as self-closing: every opening tag takes no children and their closing tags are dropped, so an unexpanded GitBook-style `{% include %}` cannot swallow the content after it. A document without those tags parses exactly as with `Markdoc.parse`. The raw frontmatter string lives at `ast.attributes.frontmatter`.
3. Resolve effective frontmatter: `frontmatter` prop wins; else if `parseFrontmatter` is supplied, parse `ast.attributes.frontmatter`. On parse error, capture the message and surface via `<MdError>`.
4. `mergeConfig` merges user config over defaults (nodes, components, variables, tags, functions, partials). Default tags come from `defaultTagsConfig`. `config.partials` goes through `preparePartials`, which parses Markdown-string partials on first use through a module-level LRU cache (at most 100 entries and 2,000,000 characters of name plus source; a name plus source over 250,000 characters is never cached; keyed by the JSON of `[name, source, self-closing tag names]` so no two inputs collide; shared by `partialTag` outside `<Md>`), so re-renders and `MdStream` updates do not re-parse them. Markdoc's `resolve` / `transform` never mutate an AST, so cached ASTs are safe to share. The resolved frontmatter is exposed in markdown as `$markdoc.frontmatter`; the raw string at `$markdoc.frontmatterRaw`.
5. `Markdoc.transform(ast, config)` → transformed tree
6. The optional `transform` hook runs, then `Markdoc.renderers.react(finalTree, React, { components })` → React element tree
7. The output is wrapped in five React context providers:
   - `RegistryContext` — the spec component registry (used by `MdFence` for `vaneui` fences)
   - `ParserContext` — the YAML parser (used by `MdFence` for `vaneui` fences)
   - `HighlightContext` — the `highlight` hook (used by `MdFence` for code blocks)
   - `SanitizeContext` — the `sanitize` policy (used by `MdFence` for `vaneui` fences)
   - `RendererThemeContext` — per-renderer visual defaults, computed from `mergeRendererTheme(inheritedTheme, rendererTheme)` so consumers can wrap with their own provider OR pass the prop, and the prop wins on conflicts.

Every markdown node is rendered via a VaneUI-wrapped component (e.g., `MdHeading` wraps `Title`). Each renderer reads its own slot from `RendererThemeContext` and spreads the boolean props onto the underlying VaneUI element before any markdown-supplied attributes.

### Configuration merging

Users can override any part of the default config via the `config` prop. The merge is shallow-per-key:

```tsx
<Md
  content={markdown}
  config={{
    components: { MdHeading: CustomHeading },  // replaces MdHeading
    nodes: { fence: customFenceNode },       // replaces fence handler
  }}
/>
```

Defaults live in `src/config/default-config.ts` (`defaultNodesConfig`, `defaultComponents`, `defaultTagsConfig`).

### Component naming

- Files: `Md{NodeName}.tsx` (PascalCase)
- Exported as named exports from each subfolder, re-exported from `md-components.tsx`
- Barrel `index.ts` exports everything public

### Frontmatter parsing

`<Md>` does not parse YAML by default — it accepts already-parsed data via the `frontmatter` prop, or a parser function via `parseFrontmatter`. Both forms expose data at `$markdoc.frontmatter` for in-body interpolation. The raw YAML string (whatever was between the leading `---` markers) is always exposed at `$markdoc.frontmatterRaw`.

```tsx
import { Md } from "@vaneui/md";
import { parseYamlFrontmatter } from "@vaneui/md/yaml";

// Auto-parse YAML
<Md content={md} parseFrontmatter={parseYamlFrontmatter} />

// Bring your own parser
<Md content={md} parseFrontmatter={(raw) => myParser(raw)} />

// Pre-parsed (skips parseFrontmatter even if provided)
<Md content={md} frontmatter={{ title: "Hello" }} />
```

Resolution: `frontmatter` prop > `parseFrontmatter(rawFrontmatter)` > `undefined`. Malformed YAML routes to `<MdError>` above the body — never throws. `yaml` is an optional peer dependency; consumers who never use auto-parse don't need it installed.

### Partials and includes

Two ways to reuse Markdown, at two different times:

- **Load time, by file path: `@vaneui/md/include`** (`src/include.ts`, Node only, never exported from the main entry; path resolution and containment live in `src/include-paths.ts`, which takes the `path` module as a parameter so tests can run it with `path.win32`). `resolveIncludes(source, { filePath, root })` expands block-level `{% include "x.md" %}` / `{% include file="x.md" /%}` tags in the raw text before `<Md>` sees it. A tag must be alone on its line after optional indentation or blockquote markers (that prefix is added to every included line); a tag after a list marker is left alone. Under a prefix, tabs in a line's container markers and indentation become spaces while tabs in fenced code stay (except the indentation of a 4+-indented line that looks like a closing fence), and a line starting with whitespace after a prefix ending in `>` gets an extra space. Paths resolve relative to the including file (a leading `/` or `\` resolves from `root`), must stay inside `root` and, by default, end in `.md`, `.mdoc` or `.markdown`. With `checkRealPaths` (default with the default reader) containment, the extension and cycles are checked on real paths (`fs.realpathSync.native` / `fs.promises.realpath`) and files are read from the checked real path; errors and callbacks still use the paths as resolved from the tags. Fence tracking lives in `src/include-blocks.ts`: `BlockScanner` follows markdown-it's container rules as Markdoc configures them (blockquotes and list items, lazy lines, 4+-column indentation, list interruption rules), and `scan(line)` returns where the line's own text starts, so `include.ts` knows which tabs it may expand. Its known differences from Markdoc (tables, link reference definitions, multi-line tags, tabs after a second `>`) are listed in its header and the README; the fuzz tests in `include.test.ts` compare it with `Markdoc.Tokenizer` and leave those out. An included file that ends inside a fence gets a closing fence. The entry's BOM is stripped and its frontmatter copied unchanged; included files lose their frontmatter. `maxIncludes` (default 1000) caps successful includes per call, and each call caches reads and real paths. `maxOutputLength` (default 10,000,000 characters) caps the result: lines are written top-down through `Sink`s and each line's length is checked before it is built, so prefix amplification stops early; that `limit` error never goes to `onError`. Failures raise `IncludeError` (`not-found`, `cycle`, `max-depth`, `limit`, `outside-root`, `extension`, `read-failed`) unless `onError` returns replacement text (a non-string return throws a `TypeError`). `IncludeError` carries a `Symbol.for("@vaneui/md/IncludeError")` brand that its `Symbol.hasInstance` accepts on an `Error` as an own data property (read with `Object.getOwnPropertyDescriptor`, inside a try/catch for revoked proxies), so CJS and ESM copies recognize each other. The patterns run on untrusted lines, so keep them linear (no whitespace run split between two quantifiers, no trailing `.*$`). `resolveIncludesAsync` shares the same generator core. Because the expansion is textual, a consumer's TOC, search index and fence extraction all see the included content.
- **Render time, by name: `config.partials`** feeds the `{% partial file="name" variables={...} /%}` tag. `partialTag` replaces Markdoc's built-in tag: same scoping and `$$partial:filename`, but a missing partial, a cycle, nesting over 16 or a tag over the render budget renders an error in place instead of throwing. Its private state lives under `$$vaneui:*` variables (unreachable from Markdown; the tag drops them and `$$partial:filename` from the `variables` attribute, so Markdown cannot reset them). The chain lives under `$$vaneui:partialChain` (read with an `Array.isArray` guard) as `{ file, variables }` entries, where `variables` is everything the partials on the chain set. A cycle is the same file with structurally equal variables already on the chain: only same-file entries are compared, lazily, by an iterative walk that short-circuits on `===`, compares arrays and plain objects by content and anything else by identity, and treats a pair already under comparison as equal, so cyclic data (parent links) neither loops nor reports a false cycle, and recursion with changing variables (a nav tree guarded by `{% if %}`) works. The budget (`MAX_PARTIALS`, 1000 partial tags per transform, errors included, mirroring `maxIncludes`) stops exponential fan-out within the depth cap: a `PartialBudget` passes down under `$$vaneui:partialBudget`, and top-level tags share one kept in a `WeakMap` keyed by the transform's `config.tags` (a new object per `Markdoc.transform` call, kept by configs derived with a spread), so it never carries over to another transform. Past it, one error renders and later partial tags render nothing. Used inline (`node.inline`: next to text in a paragraph, heading, table cell or list item, or in link text), the partial's top-level paragraphs unwrap into their inline content (joined by a softbreak); any other block renders an inline error. The default `link` node's `transform` (`transformLink` in `src/tags.ts`) sets `$$vaneui:inLink` for the link text, and an unwrapped partial there that contains a link renders an inline error instead of nesting `<a>`; a `nodes.link` override without that transform loses the check. `file` uses a `PartialFile`-style attribute type, so `Markdoc.validate` reports unknown partials. Presets can contribute `partials` (conflict warning, `__proto__` kept as a plain key); an explicit `config.partials` entry wins per key.
- `includeTag` is the fallback for include syntax that reaches `<Md>` unexpanded: it renders an error pointing at `resolveIncludes`. `<Md>` itself never reads files. Both `includeTag` and `partialTag` are `selfClosing`, and `<Md>` parses them that way (see the pipeline above) unless `config.tags` or a preset replaces them.
- The tags emit `MdError` (block card, `mdError` slot) for block-level errors and `MdErrorInline` (a `Text tag="span"`, `mdErrorInline` slot) for errors where the tag is inline (a paragraph, heading, table cell, list item text or link text), so the DOM stays valid. A custom `components.MdError` is never placed in phrasing content.

### Component spec rendering — `vaneui` fences

A fenced code block tagged ``` ```vaneui ``` is parsed as YAML and materialized as a real VaneUI component tree at body position. Two contexts must be in place (both supplied by `<Md>` via props):

- **`parseFrontmatter`** — the YAML parser (same one used for top-level frontmatter)
- **`components`** — a string→component registry. Use `defaultRegistry` from `@vaneui/md/registry` for the safe VaneUI allowlist, or supply your own.

```tsx
import { defaultRegistry } from "@vaneui/md/registry";
import { parseYamlFrontmatter } from "@vaneui/md/yaml";

<Md
  content={md}
  parseFrontmatter={parseYamlFrontmatter}
  components={defaultRegistry}
/>
```

#### Complete document example

A real `.md` source combining frontmatter, body prose, variable interpolation, and an inline `vaneui` fence:

````md
---
title: Get started
author: Jane
---

# {% $markdoc.frontmatter.title %}

By {% $markdoc.frontmatter.author %}.

```vaneui
Card primary filled:
  - Title xl: Welcome
  - Text: Everything you need to ship.
```

Some intro prose. The card above renders exactly where the fence was placed.

```vaneui
Button primary filled:
  href: /get-started
  text: Get started
```

More body content...
````

Rendered with:

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

Failure modes:

| Condition | Behavior |
|---|---|
| `parseFrontmatter` not provided | Entire fence renders as a normal code block (visible YAML) |
| Malformed YAML in fence | `<MdError>` rendered above the original code block; sibling content unaffected |
| Component name not in registry (incl. empty `{}` registry) | That node renders as nothing (silent no-op); body content after the fence still renders |
| `parseFrontmatter` returns a non-map (string/array/number) | The spec is silently skipped (no component to render) |

#### Shorthand syntax (primary form)

The component name and boolean flags go in the YAML key. The value is interpreted by shape:

| Value shape | Becomes |
|---|---|
| empty | leaf with no content |
| string | `children` |
| list | `children` (recursively expanded) |
| map | additional props (`href`, `src`, explicit `children`, …) |

````md
```vaneui
Card primary filled:
  - Title xl: Welcome
  - Text: Everything you need to ship.
```
````

For components with non-boolean props, use the map form:

````md
```vaneui
Button primary filled:
  href: /get-started
  text: Get started
```
````

For components needing both children AND non-boolean props:

````md
```vaneui
Card primary:
  href: /clickable
  children:
    - Title xl: Welcome
    - Text: Done.
```
````

**Component names must start with an uppercase letter** — that's the disambiguator between shorthand specs and plain prop maps. Lowercase keys (`title`, `author`, etc.) are left as plain data, so frontmatter metadata isn't accidentally interpreted as a component.

#### Verbose form (still supported, both compose freely)

````md
```vaneui
component: Card
primary: true
filled: true
children:
  - component: Title
    xl: true
    text: Welcome
```
````

Both forms work in the same tree. The `expandShorthand` pass runs once at the top of `renderSpec`; verbose subtrees are detected by the presence of a `component` key and passed through unchanged.

#### Internals

- `src/spec.ts` — `expandShorthand(node)` walks the parsed YAML and converts shorthand maps to verbose `ComponentSpec` shape. `renderSpec(spec, registry)` materializes the spec into React elements. Depth capped at 16 levels. `collapseShorthand(spec)` is the inverse of `expandShorthand` — it turns a verbose spec back into the compact shorthand YAML shape so an editor can serialize an edited tree to a `vaneui` fence (`expandShorthand(collapseShorthand(spec))` reproduces the spec).
- **Stable node identity:** a `ComponentSpec` may carry an `id` (string or number). When present it's used as the React `key` (so an editor can reorder / add / remove nodes without remounting subtrees) and is also passed through to the component as an `id` prop. Without an `id`, keys fall back to the positional index.
- `src/components/code/MdFence.tsx` — branches on `language === "vaneui"`. Reads parser + registry from React context. Catches parse errors and routes to `<MdError>` + code-block fallback.
- `src/registry.ts` — exports `defaultRegistry`, a 36-entry map of safe presentational VaneUI components. Excludes anything requiring callbacks (Modal, Popup, Menu, Input, Checkbox, Overlay, IconButton-as-button).

### Per-renderer visual defaults — `rendererTheme`

Each Md renderer (`MdBlockquote`, `MdCode`, `MdEm`, etc.) has its own slot in `MdRendererTheme`. Slots hold boolean props that the renderer spreads onto its underlying VaneUI element. This solves the "shared VaneUI primitive" problem: `MdBlockquote` and `MdFence` both render `<Card>`, but each has its own theme slot, so styling them independently is straightforward.

```ts
// src/rendererTheme.ts — slot keys mirror renderer file names (md + capitalized name)
interface MdRendererTheme {
  mdBlockquote?: MdRendererProps;   // → MdBlockquote spreads on <Card>
  mdFence?: MdRendererProps;        // → MdFence spreads on <Card> (separate from blockquote)
  mdCode?: MdRendererProps;         // → MdCode
  mdEm?: MdRendererProps;           // → MdEm
  mdStrong?: MdRendererProps;       // → MdStrong
  mdS?: MdRendererProps;            // → MdS
  mdParagraph?: MdRendererProps;
  mdText?: MdRendererProps;
  mdHeading?: MdRendererProps;
  mdLink?: MdRendererProps;
  mdList?: MdRendererProps;
  mdItem?: MdRendererProps;
  mdHr?: MdRendererProps;
  mdDocument?: MdRendererProps;
  mdImage?: MdRendererProps;
  mdError?: MdRendererProps;       // → MdError spreads on <Card>
  mdErrorInline?: MdRendererProps; // → MdErrorInline spreads on <Text tag="span"> (errors where a tag is inline)
  mdTable?: MdRendererProps;        // → MdTable spreads on <Table> (inside a scroll wrapper)
  // table cells: mdThead/mdTbody/mdTr/mdTh/mdTd spread on their matching VaneUI Table part
  // ...plus mdInline, mdHardbreak, mdSoftbreak
}
```

`defaultRendererTheme` carries the package's visual signatures:

```ts
{
  mdBlockquote: { secondary: true, borderL: true },
  mdCode:       { secondary: true },
  mdEm:         { italic: true },
  mdStrong:     { fontBold: true },
  mdS:          { lineThrough: true },
  mdError:      { danger: true },
  mdErrorInline: { danger: true },
  // other slots are empty — renderers fall through to VaneUI's own defaults
}
```

#### How a renderer consumes its slot

```tsx
// MdBlockquote.tsx
export const MdBlockquote: React.FC<React.PropsWithChildren> = (props) => {
  const { children, ...rest } = props as { children: React.ReactNode } & Record<string, unknown>;
  const theme = useContext(RendererThemeContext);
  return <Card {...theme.mdBlockquote} {...rest}>{children}</Card>;
};
```

The slot spreads first, then `...rest` from Markdoc, then any hardcoded essential props (semantic `tag`, `src`, `href`). Markdown-supplied attributes always win over theme defaults.

#### Two ways for consumers to customize

**1. Prop on `<Md>`** — most common:

```tsx
<Md
  content={md}
  rendererTheme={{
    mdBlockquote: { primary: true },        // appearance only — keeps left bar
    mdCode:       { success: true },
    mdEm:         { italic: false, fontBold: true },  // bold emphasis instead of italic
    mdFence:      { tertiary: true },        // code-block wrapper — does NOT affect blockquote
  }}
/>
```

**2. Wrap with `RendererThemeContext.Provider`** — to share a theme across multiple `<Md>` instances or override from a layout:

```tsx
import { RendererThemeContext, defaultRendererTheme } from "@vaneui/md";

<RendererThemeContext.Provider value={{ ...defaultRendererTheme, mdCode: { primary: true } }}>
  <Md content={a} />
  <Md content={b} />
</RendererThemeContext.Provider>
```

The `rendererTheme` prop wins over an outer `RendererThemeContext.Provider` (Md inherits the parent context, then layers the prop on top via `mergeRendererTheme`).

#### Group-aware merge

`mergeRendererTheme(defaults, user)` is shallow-per-slot but **group-aware** for vaneui's mutually-exclusive prop categories. The group list is derived directly from `ComponentKeys` (vaneui's exported category map) so it auto-stays in sync with future vaneui categories. The authoritative set is whatever `ComponentKeys` exposes at runtime; the list below is illustrative and non-exhaustive: size, appearance, variant, shape, border, fontWeight, fontStyle, textDecoration, textTransform, gap, padding, ring, shadow, overflow, position, display, flexDirection, items, justify, wrap, listStyle, listPosition, hide, breakpoint, cursor, blur, focusVisible, pointerEvents, transparent, responsiveSizing, transition, whitespace, objectFit, validity, orientation, height, letterSpacing.

When a user sets ANY truthy key in one of those groups for a given slot, all sibling keys from the defaults are dropped before merging. So:

```tsx
// default mdBlockquote = { secondary: true, borderL: true }
rendererTheme={{ mdBlockquote: { primary: true } }}
// final: { primary: true, borderL: true }
//   secondary dropped (appearance group); border-related kept (different group)

rendererTheme={{ mdBlockquote: { border: true } }}
// final: { secondary: true, border: true }
//   borderL dropped (border group); appearance kept

rendererTheme={{ mdBlockquote: { primary: true, border: true } }}
// final: { primary: true, border: true }
//   both groups cleared
```

This is why a consumer's `primary: true` doesn't end up on the JSX alongside the default's `secondary: true` (which would force vaneui's `pickFirstTruthyKeyByCategory` to resolve by ComponentKeys order rather than consumer intent).

#### What's NOT in the renderer theme

Genuinely dynamic per-render logic that can't be expressed as static defaults stays in the renderer:

- `MdHeading` — level (1–6) → size (`xl`–`xs`) mapping
- `MdList` — `ordered` attribute → `decimal` vs `disc`
- `MdImage` — `src`, `alt`, `title` come from Markdoc node attributes
- `MdLink` — `href`, `title` from Markdoc

A consumer can still override the *non-dynamic* visuals on these via `rendererTheme.mdHeading: { fontMono: true }`, `rendererTheme.mdList: { uppercase: true }`, etc.

#### Two-axis customization model

| Customization scope | Where to set it |
|---|---|
| All `<Card>` components in your app should have shadows | vaneui's `<ThemeProvider themeDefaults={{ card: { main: { shadow: true } } }}>` |
| Markdown blockquotes specifically should have a different style | `<Md rendererTheme={{ mdBlockquote: { ... } }}>` |
| Markdown code blocks specifically (not inline code) | `<Md rendererTheme={{ mdFence: { ... } }}>` |
| Inline `code` only | `<Md rendererTheme={{ mdCode: { ... } }}>` |

The two systems compose cleanly: `rendererTheme` sets JSX props on the underlying VaneUI element, and vaneui's `ThemeProvider` continues to fill in any other defaults that aren't set as JSX props.

## Exports

- `@vaneui/md` — `Md`, all `Md*` renderers, `defaultNodesConfig`, `defaultComponents`, `defaultTagsConfig`, `renderSpec`, `expandShorthand`, `collapseShorthand`, `RegistryContext`, `ParserContext`, `RendererThemeContext`, `defaultRendererTheme`, `mergeRendererTheme`, types
- `@vaneui/md/yaml` — `parseYamlFrontmatter` (one-line wrapper over `yaml.parse`). `yaml` is an optional peer dependency.
- `@vaneui/md/include` exports `resolveIncludes`, `resolveIncludesAsync`, `IncludeError` and their option and error-code types. **Node only** (imports `node:fs` / `node:path`, marked external in `rollup.config.mjs`); keep it out of `src/index.ts`, which `include.test.ts` checks by walking the browser entries' import graphs. `src/include-paths.ts` and `src/include-blocks.ts` are internal: not exported from any entry, and `rollup.config.mjs` drops their declaration files (and the tests') from `dist`.
- `@vaneui/md/registry` — `defaultRegistry`, the safe VaneUI component allowlist (36 components). Pulled in only when imported, so consumers who don't render `vaneui` fences pay zero bundle cost.
- `@vaneui/md/styles` — the `.vaneui-md` prose-rhythm layer (`dist/styles/index.css`). **Rules-only**: it does NOT bundle `@vaneui/ui`'s CSS (that is a peer dependency the consumer already loads via `@vaneui/ui/css` or `@vaneui/ui/vars`), it only adds spacing rules that build on VaneUI's tokens (`--spacing`, `--gap`). Import it alongside your vaneui CSS to get the document rhythm; omit it to fall back to the raw block flow.

## Testing

Tests live in `src/tests/`:

**Md component & integration:**
- `md.test.tsx` — main rendering, frontmatter parsing, `vaneui` fence rendering, `expandShorthand` integration, fence edge cases, context isolation between instances, rich frontmatter types
- `partials.test.tsx` — partial sources (string, AST, `Node[]`), scoping and variables, the cross-render parse cache (incl. `MdStream`, no AST mutation, writable `preparePartials` entries, size-based eviction, the large-source skip, collision-free keys), missing / empty-file / cycle / depth errors (incl. reserved keys in `variables`), guarded recursion and structural cycle detection (key order, cyclic data with parent links, deep copies, identity for other objects), the render budget (block and inline fan-out, errors counted, shared across link text, new per transform and per `<Md>`), inline use (paragraph, heading, table cell and list item unwrapping, block-content error, link text without nested links, no DOM nesting warnings), `mdError` / `mdErrorInline` theming and custom `MdError`, validation, presets (incl. `__proto__`), transform and `MdStream` pass-through, the `include` fallback (unclosed, self-closing, closed, stray close, blockquote, inline, list item, code fences, `MdStream`), the self-closing parse rule (no-op for documents without those tags, skipped for overridden tags), and `tags` overrides
- `include.render.test.tsx`: resolved include content rendered through `<Md>`, including an include inside a list item (whose included code keeps its tab), one inside a blockquote, and a closing fence added for an included file left inside a fence
- `md.renderer-theme.test.tsx` — `rendererTheme` prop / `RendererThemeContext` / `mergeRendererTheme`: regression tests for default visuals, per-renderer override coverage (every plumbed slot, including `mdErrorInline` and that `mdError` card props never reach it), group-aware merge for size/appearance/variant/shape/border, multi-instance isolation, prop-vs-context-provider precedence
- `md-nodes.test.tsx` — individual node renderers
- `md.theme-defaults.test.tsx` — default theme behavior
- `md.theme-extraClasses.test.tsx` — extraClasses prop propagation
- `md.theme-override.test.tsx` — themeOverride behavior
- `md.theme-structure.test.tsx` — theme structure validation

**Module-level units:**
- `yaml.test.tsx` — `parseYamlFrontmatter` direct: normal/empty/null/string/array/number/malformed inputs
- `registry.test.tsx` — `defaultRegistry` allowlist: safe components present, callback-required components absent, every entry is a valid component type
- `include.test.ts`: `resolveIncludes` / `resolveIncludesAsync` (node environment): every tag form, blockquote prefixes, relative / nested / root-relative paths, the `include-paths` helpers under `path.win32`, frontmatter, BOM and CRLF, indentation and tab expansion, fences in containers and unclosed fences, fence and lazy-line cases cross-checked with `Markdoc.Tokenizer`, seeded fuzz tests (tag lines outside Markdoc's fences, and the same fenced code in an included file as standalone), tabs in included code, linear-time checks on 100k-character lines, `maxIncludes` and the read cache, `maxOutputLength`, `extensions`, cycles, depth, root and symlink escapes (symlinked roots, real-path cycles, `checkRealPaths`), option validation, `onError` / `onInclude`, the `IncludeError` brand (incl. proxies and getters), and that the browser entries never import `node:` built-ins or `src/include.ts`. Symlink and case-insensitive tests are skipped where the file system lacks them.
- `spec.test.tsx` — `renderSpec` direct: null/undefined/string/missing-component/unknown-component/non-map/depth-cap, children-resolution priority, depth-0-gates-shorthand

Run with `npm test` (includes `type-check` as a prerequisite).

`jest.config.js` sets `testMatch` to `src/tests/**/*.test.[jt]s?(x)` so source files with bare names like `spec.ts` aren't accidentally picked up as tests. It also sets `testEnvironmentOptions.customExportConditions: ['node', 'node-addons']` so jsdom resolves the `yaml` package's Node CJS entry instead of its browser ESM entry (Jest 29 + jsdom can't load the latter).

## Relationship to Other Projects

- **`@vaneui/ui`** (`C:/GitHub/vaneui/`) — peer dependency. Any VaneUI component API change may affect this project. See `C:/GitHub/vaneui/CLAUDE.md` for VaneUI conventions (boolean props, theme system, sentence case, etc.).
- **`vaneui-web`** (`C:/GitHub/vaneui-web/`) — consumer. Uses `@vaneui/md` to render documentation markdown. When adding new node renderers, check if vaneui-web exposes them via `DocsMarkdown.tsx`.

## Conventions

- Follow VaneUI boolean props API in component implementations — use `<Card>` not `<div>`, `<Text>` not `<p>`, etc.
- Custom renderers should be thin — delegate to VaneUI components for styling
- Keep Markdoc node configs simple; push complexity to the React component
- **No hardcoded visual props on Md* renderers.** Visual defaults (size, appearance, variant, shape, border, font-style, etc.) MUST live in `defaultRendererTheme` — never as JSX props on the underlying VaneUI element. Renderers spread `theme.<slot>` from `RendererThemeContext`. Only semantic essentials (`tag` for `<em>`/`<strong>`/`<s>`, `src`/`href` from Markdoc node attributes) and dynamic per-render logic (`MdHeading`'s level→size mapping, `MdList`'s ordered→decimal/disc) belong as JSX props.
- When adding a new Md renderer: add a slot to `MdRendererTheme` named `md{ComponentName}` (e.g., `mdBlockquote` for `MdBlockquote`), decide whether it needs a default in `defaultRendererTheme`, read the slot via `useContext(RendererThemeContext)`, and add a per-renderer override test in `md.renderer-theme.test.tsx`.
- Tests should cover: default rendering, config override behavior, theme propagation, **per-renderer slot override via `rendererTheme`**.
- For `vaneui` fence examples in docs and tests, prefer the **shorthand form** (`Card primary: …`) over the verbose form (`component: Card`, `primary: true`, …). Show the verbose form only when illustrating the `component`-key escape hatch or when a feature genuinely requires it.

## Nothing private in GitHub content

Nothing private goes into anything pushed to or posted on GitHub, in public and private repos alike: code comments, committed files, commit messages, branch names, PR titles and descriptions, PR / issue / review comments, and releases and release notes.

- No personal data: no real names, email addresses or phone numbers of the user or anyone else. GitHub `@handles` are fine, and so are author bylines and credits the repo publishes on purpose.
- PR attribution keeps only the `claude-projects-attribution` marker line. Drop the `_Requested by **<name>**_` line and its project thread link, even when the session's PR instructions include them.
- No claude.ai session, thread, project or artifact links; in a public repo, no links into private repos, dashboards or docs.
- No local paths: no absolute drive or home-directory paths, temp or scratchpad dirs, or Claude project-file paths (`/mnt/project-files/...`). Use repo-relative paths, or `../<repo>` for a sibling checkout.
- Commit messages carry no `Claude-Session:` trailer.

Generic locations such as `~/.claude/` are fine; the rule covers real paths from a contributor's machine.

## Agent Delegation (REQUIRED)

When a task matches below, you **MUST** delegate to the matching root agent:

| Task Pattern | Agent | Why |
|-------------|-------|-----|
| Modifying Markdoc config or adding new markdown element renderers | `frontend-developer` | Markdoc AST transformation, React component mapping, VaneUI integration |
| Reviewing completed changes or PR | `code-reviewer` | Cross-layer review (config → component → test), VaneUI consistency |

**Exception:** Do not delegate tasks completable in 1-2 tool calls (reading a file, small inline edit).
