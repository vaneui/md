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
│   ├── md.tsx               # Main <Md> component (parses + renders)
│   ├── md-components.tsx    # Barrel exports all MdXxx components
│   ├── structure/           # MdDocument, MdInline
│   ├── headings/            # MdHeading
│   ├── text/                # MdParagraph, MdText, MdStrong, MdEm, MdS, MdCode
│   ├── links/               # MdLink
│   ├── media/               # MdImage
│   ├── lists/               # MdList, MdItem
│   ├── blocks/              # MdBlockquote, MdHr
│   ├── code/                # MdFence (code blocks)
│   ├── tables/              # MdTable, MdThead, MdTbody, MdTr, MdTd, MdTh
│   ├── breaks/              # MdHardbreak, MdSoftbreak
│   └── errors/              # MdError
├── config/
│   └── default-config.ts    # Markdoc node config + default component mapping
├── styles/
│   └── index.css            # PostCSS source, bundled to dist/styles/index.css
├── tests/                   # Jest tests (md.test, theme tests, node tests)
├── types/                   # MdProps, MdConfig, theme types
├── setupTests.ts
└── index.ts                 # Public barrel export
```

## Key Architectural Patterns

### Rendering pipeline

1. `Md` component receives `content: string`, optional `frontmatter`, optional `config`
2. `Markdoc.parse(content)` → AST
3. `mergeConfig` merges user config over defaults (nodes, components, variables, tags, functions)
4. `Markdoc.transform(ast, config)` → transformed tree
5. `Markdoc.renderers.react(transformed, React, { components })` → React element tree

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

## Exports

- `@vaneui/md` — `Md` component, all `Md*` renderers, `defaultNodesConfig`, `defaultComponents`, types
- `@vaneui/md/styles` — Pre-built CSS (`dist/styles/index.css`)

## Testing

Tests live in `src/tests/`:
- `md.test.tsx` — main component rendering
- `md-nodes.test.tsx` — individual node renderers
- `md.theme-defaults.test.tsx` — default theme behavior
- `md.theme-extraClasses.test.tsx` — extraClasses prop propagation
- `md.theme-override.test.tsx` — themeOverride behavior
- `md.theme-structure.test.tsx` — theme structure validation

Run with `npm test` (includes `type-check` as a prerequisite).

## Relationship to Other Projects

- **`@vaneui/ui`** (`C:/GitHub/vaneui/`) — peer dependency. Any VaneUI component API change may affect this project. See `C:/GitHub/vaneui/CLAUDE.md` for VaneUI conventions (boolean props, theme system, sentence case, etc.).
- **`vaneui-web`** (`C:/GitHub/vaneui-web/`) — consumer. Uses `@vaneui/md` to render documentation markdown. When adding new node renderers, check if vaneui-web exposes them via `DocsMarkdown.tsx`.

## Conventions

- Follow VaneUI boolean props API in component implementations — use `<Card>` not `<div>`, `<Text>` not `<p>`, etc.
- Custom renderers should be thin — delegate to VaneUI components for styling
- Keep Markdoc node configs simple; push complexity to the React component
- Tests should cover: default rendering, config override behavior, theme propagation

## Agent Delegation (REQUIRED)

When a task matches below, you **MUST** delegate to the matching root agent:

| Task Pattern | Agent | Why |
|-------------|-------|-----|
| Modifying Markdoc config or adding new markdown element renderers | `frontend-developer` | Markdoc AST transformation, React component mapping, VaneUI integration |
| Reviewing completed changes or PR | `code-reviewer` | Cross-layer review (config → component → test), VaneUI consistency |

**Exception:** Do not delegate tasks completable in 1-2 tool calls (reading a file, small inline edit).
