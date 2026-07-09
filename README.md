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
| `config` | `MdConfig` | Override Markdoc `nodes`, `components`, `tags`, `functions`, or `variables`. |

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

`config` accepts `nodes`, `components`, `tags`, `functions`, and `variables`, all passed through to Markdoc.

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

A preset bundles renderer configuration: `nodes`, `tags`, `functions`, `variables`, renderer swaps (`components`), vaneui-fence allowlist entries (`registry`), `rendererTheme`, `highlight`, `transform`, `sanitize`, and co-shipped `styles`. Compose presets with `createMd().use(...)`:

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

Presets merge left to right. Two presets that define the same `tags`, `components`, `functions`, or `registry` key log a development warning and the last one wins. Explicit `<Md>` props win over preset-supplied values.

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

- `@vaneui/md` — `Md`, `MdStream`, `createMd`, all `Md*` renderers, `mergePresets`, `untrustedPreset`, `useMdStream`, `renderSpec`, `expandShorthand`, `collapseShorthand`, `visit`, `headingAnchors`, `rewriteLinks`, `defaultNodesConfig`, `defaultComponents`, `defaultRendererTheme`, `mergeRendererTheme`, `strictSanitizePolicy`, the contexts (`RegistryContext`, `ParserContext`, `HighlightContext`, `RendererThemeContext`, `SanitizeContext`), and the types (`MdPreset`, `MdTransform`, `HighlightFn`, `SanitizePolicy`, and more).
- `@vaneui/md/shiki` — `shikiHighlighter`, `shikiPreset`. `shiki` is an optional peer dependency.
- `@vaneui/md/prism` — `prismHighlighter`, `prismPreset`. `prism-react-renderer` is an optional peer dependency.
- `@vaneui/md/yaml` — `parseYamlFrontmatter`, a thin wrapper over `yaml.parse`. `yaml` is an optional peer dependency.
- `@vaneui/md/registry` — `defaultRegistry`, the safe component allowlist. Imported only when used, so consumers who do not render `vaneui` fences pay no bundle cost.
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

ISC
