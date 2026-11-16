# Changelog

All notable changes to `@vaneui/md` are recorded here.

The format follows [Keep a Changelog](https://keepachangelog.com/en/1.1.0/). The entries for
1.3.0 and earlier were written afterwards from the commit history, and each date is the date of
the release commit.

## Unreleased

Fixes from a review of 1.3.0. A `vaneui` fence or Markdoc syntax in untrusted Markdown can no
longer run script or stop the render, `MdStream` renders the same document as `<Md>`, and the
published package installs on older Node releases and resolves its types under TypeScript's
`node16` resolution. Some of the fixes change what existing documents render; those are under
Changed.

### Security

- A `vaneui` fence can no longer render `script`, `iframe`, `style`, `meta`, `base` or `form`
  elements. Before, `tag`, `srcDoc`, `httpEquiv` and `style` went straight to the component,
  with or without a sanitize policy, so `Text: {tag: script}` put a real `<script>` in server
  HTML. `tag` is now honoured only for inert elements, and `dangerouslySetInnerHTML`, `ref`,
  `srcDoc`, `httpEquiv` and every prop whose name starts with `on` are dropped in any spelling.
  No policy switches this off.
- The URL check on fence props reads the scheme the way a browser does. Before, a tab or a
  control character inside or before `javascript:` made the value pass as a relative URL. The
  check now covers every URL-bearing prop (`href`, `src`, `srcSet`, `poster`, `action`,
  `formAction`, `xlinkHref`, `ping`, `cite`, `background`, `data` and the like) in any
  spelling, where it covered five prop names.
- A paragraph with about 100 unclosed inline tags, such as `{% a %}` repeated 101 times, no
  longer hangs `<Md>`, `MdStream` and Markdown-string partials. The Markdoc dependency starts
  at 0.5.11, the first release without the endless loop, and unclosed tags past the 99th in
  one run of inline content stay as text with any Markdoc release.
- `component: constructor` in a fence (or `__proto__`, `valueOf`, `hasOwnProperty`), and a
  variable that holds an object such as `{% $markdoc %}`, no longer crash the render. They
  render nothing.

### Changed

- `strictSanitizePolicy`, and so `untrustedPreset`, is now a prop allow-list. Only the
  `@vaneui/ui` boolean props, `children`, `text`, `href`, `src`, `alt`, `title`, `value`,
  `max`, `aria-*` and a short list of inert attributes pass, with string, number or boolean
  values. `tag`, `style`, `className`, `id` and the props of your own registry components are
  dropped unless the policy lists them in `allowedProps` or `allowedTags`.
- Without a policy, a fence `tag` outside the inert element list (for example `button`,
  `input` or `form`) is dropped, and so is every fence prop whose name starts with `on`,
  including such props of your own registry components. A policy's `allowedTags` can add
  elements that do not run script or embed documents.
- `MdStream` parses and transforms the whole source on every update, and React renders again
  only the top-level blocks whose content changed. Before, it parsed each blank-line chunk by
  itself. For long outputs, update once per animation frame.
- `splitBlocks` and `useMdStream` return the top-level blocks as `<Md>` parses them: a
  whole list, blockquote, table or code fence, or a block tag with its content, each an exact
  slice of the source. Before, they returned the chunks between blank lines.
- `headingAnchors` ids change for headings with inline code, letters outside ASCII or a
  repeated text (see Fixed). A heading with nothing left to slug gets no `id` attribute, and
  repeats of an id a custom `slug` function returns are numbered too. Headings made of ASCII
  letters, digits and punctuation keep their ids.
- A tag left open inside a paragraph, a code fence, a list item or a blockquote ends where
  that container ends. A block tag left open at the top level still takes the rest of the
  document.
- `@markdoc/markdoc` is loaded from the installed dependency. Before, a copy was bundled into
  `dist`, so updating the dependency changed nothing. `dist` is about a fifth of its former
  size.
- The `react` and `react-dom` peer range is `^18.0.0 || ^19.0.0`, the range `@vaneui/ui`
  supports. It also listed 16.8 and 17.
- The package no longer sets `engines`. It was `node: 24.x`, so installing on another Node
  release warned (npm, pnpm) or failed (Yarn classic), although `dist` does not need Node 24.

### Added

- `tagSyntax` prop on `<Md>` and `MdStream`, also a preset field. `false` leaves `{% ... %}`
  in the text as written, for technical or model-written prose that is not meant as Markdoc
  tags. The default is `true`.
- `SanitizePolicy.knownPropsOnly` turns on the prop allow-list, `allowedProps` lets named
  props pass it, and `allowedTags` sets the elements `tag` may take.
- Type declarations for both module systems. Every entry has `import` and `require` conditions
  with their own types (`.d.mts` and `.d.cts`), so the types resolve under `node16` and
  `nodenext` as well as `bundler`. Before, they resolved only under `bundler`.

### Fixed

- `MdStream` renders the same output as `<Md>` for the same source. Before, a loose ordered
  list became several lists that each started at 1, the content of a false `{% if %}` was
  shown, reference links and frontmatter variables stopped working after the first blank
  line, and every chunk had its own wrapper, so the block spacing of `@vaneui/md/styles`
  never applied.
- Tag syntax the parser cannot read, such as `{% foo bar= %}`, renders an error with the
  parser's message. Before, it rendered an empty error card, and inside a paragraph that card
  was a block element in phrasing content.
- An unclosed tag inside a code fence no longer drops every block after the fence, and one
  inside a paragraph, a list item or a blockquote no longer nests the following blocks inside
  an empty copy of it.
- An ordered list keeps its start number: `3. three` renders `<ol start="3">`. Before, every
  ordered list started at 1.
- `headingAnchors` includes the text of inline code in the id, keeps the letters and digits
  of every script (a Cyrillic heading became `-`, a CJK heading an empty id), and numbers
  repeated ids `-1`, `-2` and so on, counting the ids the document sets itself.
- The Prism and Shiki adapters trim the line breaks at the end of a code block in linear
  time. A fence that ended in tens of thousands of blank lines took seconds.

## 1.3.0

`2026-11-11`

`<Md>` renders in React Server Components. The main entry no longer creates or reads React
context, and everything that needs context or hooks moved to a new client entry. Code that
imports the moved names from `@vaneui/md` has to change the import; see "Upgrading from 1.2"
in the README.

### Added

- `@vaneui/md/client`, a client entry built with a `"use client"` banner. Its `Md` inherits a
  parent `RendererThemeContext.Provider` and provides the five contexts to custom renderers,
  and its `createMd` builds on that `Md`.
- `MdRenderContext` type: what `<Md>` resolves once per instance (theme, registry, frontmatter
  parser, highlight hook, sanitize policy) and passes to its own renderers as the `mdContext`
  prop.

### Changed

- `MdStream`, `useMdStream`, `RegistryContext`, `ParserContext`, `HighlightContext`,
  `SanitizeContext` and `RendererThemeContext` are exported from `@vaneui/md/client` and no
  longer from `@vaneui/md`. `splitBlocks` stays on the main entry.
- `Md` and `createMd` from `@vaneui/md` no longer read a `RendererThemeContext.Provider` and
  no longer provide the contexts. Import them from `@vaneui/md/client` to keep both.
- A built-in renderer rendered outside `<Md>`'s own output (inside a custom component, or
  through the `vaneui` fence registry) renders with `defaultRendererTheme`, no highlighter and
  no fence parser.

## 1.2.3

`2026-10-31`

Requires `@vaneui/ui` 1.5.0.

## 1.2.2

`2026-10-29`

Requires `@vaneui/ui` 1.4.6.

## 1.2.1

`2026-10-29`

Requires `@vaneui/ui` 1.4.5.

### Added

- `Progress` in the default registry, so `vaneui` fences can render it.

### Changed

- The package is licensed under MIT and ships a `LICENSE` file. It said ISC before.

## 1.2.0

`2026-10-11`

Markdown includes at load time and partials at render time.

### Added

- `@vaneui/md/include`, a Node-only entry. `resolveIncludes` and `resolveIncludesAsync` expand
  block-level `{% include "file.md" %}` tags in raw Markdown before `<Md>` renders it. Paths
  resolve relative to the including file, must stay inside a root directory and end in a
  Markdown extension. Failures raise an `IncludeError` with a code, unless `onError` supplies
  replacement text.
- `config.partials` (Markdown strings or parsed ASTs) for the `{% partial file="name" /%}`
  tag. A missing partial, a cycle, nesting deeper than 16 or more than 1000 partial tags in
  one render shows an error in place instead of throwing. Presets can contribute partials.
- `MdErrorInline` renderer and its `mdErrorInline` theme slot, for errors inside a paragraph
  or another inline position.

### Fixed

- An `{% include %}` tag that reaches `<Md>` unexpanded renders an error that points at
  `resolveIncludes`. Before, it swallowed the rest of the page.

## 1.1.2

`2026-10-11`

Requires `@vaneui/ui` 1.4.4.

## 1.1.1

`2026-09-30`

Requires `@vaneui/ui` 1.4.3.

## 1.1.0

`2026-08-18`

Requires `@vaneui/ui` 1.1.0.

### Added

- `Alert` and `Spinner` in the default registry, so `vaneui` fences can render them.

## 1.0.0

`2026-08-16`

First release on the 1.0.0 line shared with `@vaneui/ui`. Requires the stable `@vaneui/ui`
1.0.0 instead of a prerelease.
