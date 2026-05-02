# CLAUDE.md — @vaneui/md

## What This Is

`@vaneui/md` is a React markdown renderer that parses Markdown via Markdoc and renders the output using `@vaneui/ui` components. It's a thin layer: Markdoc handles parsing/transformation, and each markdown node is mapped to a VaneUI component (e.g., `# heading` → `Title`, `> quote` → `Card`, `` `code` `` → `Code`).

Peer dependency on `@vaneui/ui` — this project does not work standalone.

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
│   └── errors/              # MdError
├── config/
│   └── default-config.ts    # Markdoc node config + default component mapping
├── styles/
│   └── index.css            # PostCSS source, bundled to dist/styles/index.css
├── tests/                   # Jest tests (md.test, theme tests, node tests)
├── types/                   # MdProps, MdConfig, theme types
├── context.ts               # RegistryContext + ParserContext (used by MdFence)
├── spec.ts                  # ComponentSpec, renderSpec, expandShorthand
├── registry.ts              # defaultRegistry — safe VaneUI component allowlist (subpath: @vaneui/md/registry)
├── yaml.ts                  # parseYamlFrontmatter (subpath: @vaneui/md/yaml)
├── setupTests.ts
└── index.ts                 # Public barrel export
```

## Key Architectural Patterns

### Rendering pipeline

1. `Md` receives `content: string`, optional `frontmatter`, `parseFrontmatter`, `components`, `config`
2. `Markdoc.parse(content)` → AST. The raw frontmatter string lives at `ast.attributes.frontmatter`.
3. Resolve effective frontmatter: `frontmatter` prop wins; else if `parseFrontmatter` is supplied, parse `ast.attributes.frontmatter`. On parse error, capture the message and surface via `<MdError>`.
4. `mergeConfig` merges user config over defaults (nodes, components, variables, tags, functions). The resolved frontmatter is exposed in markdown as `$markdoc.frontmatter`; the raw string at `$markdoc.frontmatterRaw`.
5. `Markdoc.transform(ast, config)` → transformed tree
6. `Markdoc.renderers.react(transformed, React, { components })` → React element tree
7. The output is wrapped in `<RegistryContext.Provider>` and `<ParserContext.Provider>` so `MdFence` can render `vaneui` spec fences without prop drilling.

Every markdown node is rendered via a VaneUI-wrapped component (e.g., `MdHeading` wraps `Title`).

### Configuration merging

Users can override any part of the default config via the `config` prop. The merge is shallow-per-key:

```tsx
<Md
  content={markdown}
  config={{
    components: { heading: CustomHeading },  // replaces MdHeading
    nodes: { fence: customFenceNode },       // replaces fence handler
  }}
/>
```

Defaults live in `src/config/default-config.ts` (`defaultNodesConfig`, `defaultComponents`).

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

- `src/spec.ts` — `expandShorthand(node)` walks the parsed YAML and converts shorthand maps to verbose `ComponentSpec` shape. `renderSpec(spec, registry)` materializes the spec into React elements. Depth capped at 16 levels.
- `src/components/code/MdFence.tsx` — branches on `language === "vaneui"`. Reads parser + registry from React context. Catches parse errors and routes to `<MdError>` + code-block fallback.
- `src/registry.ts` — exports `defaultRegistry`, a 33-entry map of safe presentational VaneUI components. Excludes anything requiring callbacks (Modal, Popup, Menu, Input, Checkbox, Overlay, IconButton-as-button).

## Exports

- `@vaneui/md` — `Md`, all `Md*` renderers, `defaultNodesConfig`, `defaultComponents`, `renderSpec`, `expandShorthand`, `RegistryContext`, `ParserContext`, types
- `@vaneui/md/yaml` — `parseYamlFrontmatter` (one-line wrapper over `yaml.parse`). `yaml` is an optional peer dependency.
- `@vaneui/md/registry` — `defaultRegistry`, the safe VaneUI component allowlist (~33 components). Pulled in only when imported, so consumers who don't render `vaneui` fences pay zero bundle cost.
- `@vaneui/md/styles` — Pre-built CSS (`dist/styles/index.css`)

## Testing

Tests live in `src/tests/`:

**Md component & integration:**
- `md.test.tsx` — main rendering, frontmatter parsing, `vaneui` fence rendering, `expandShorthand` integration, fence edge cases, context isolation between instances, rich frontmatter types
- `md-nodes.test.tsx` — individual node renderers
- `md.theme-defaults.test.tsx` — default theme behavior
- `md.theme-extraClasses.test.tsx` — extraClasses prop propagation
- `md.theme-override.test.tsx` — themeOverride behavior
- `md.theme-structure.test.tsx` — theme structure validation

**Module-level units:**
- `yaml.test.tsx` — `parseYamlFrontmatter` direct: normal/empty/null/string/array/number/malformed inputs
- `registry.test.tsx` — `defaultRegistry` allowlist: safe components present, callback-required components absent, every entry is a valid component type
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
- Tests should cover: default rendering, config override behavior, theme propagation
- For `vaneui` fence examples in docs and tests, prefer the **shorthand form** (`Card primary: …`) over the verbose form (`component: Card`, `primary: true`, …). Show the verbose form only when illustrating the `component`-key escape hatch or when a feature genuinely requires it.

## Agent Delegation (REQUIRED)

When a task matches below, you **MUST** delegate to the matching root agent:

| Task Pattern | Agent | Why |
|-------------|-------|-----|
| Modifying Markdoc config or adding new markdown element renderers | `frontend-developer` | Markdoc AST transformation, React component mapping, VaneUI integration |
| Reviewing completed changes or PR | `code-reviewer` | Cross-layer review (config → component → test), VaneUI consistency |

**Exception:** Do not delegate tasks completable in 1-2 tool calls (reading a file, small inline edit).
