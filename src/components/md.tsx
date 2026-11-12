import Markdoc, { type Config, type RenderableTreeNodes } from "@markdoc/markdoc";
import React from "react";
import { MdProps, MdConfig } from "../types";
import { defaultNodesConfig, defaultComponents, defaultTagsConfig } from "../config/default-config";
import { parseMarkdown, preparePartials, selfClosingTagNames } from "../tags";
import { MdError } from "./errors/MdError";
import { mergePresets, applyPresetProps } from "../preset";
import { defaultRendererTheme, mergeRendererTheme, type MdRendererTheme } from "../rendererTheme";
import type { MdRenderContext } from "../renderContext";

// Only the package's own renderers receive `mdContext`, so custom components never see an unknown prop.
const builtInRenderers = new Set<unknown>(Object.values(defaultComponents));

/**
 * Plain data that Markdoc left in the tree as a child: the value of a variable
 * that holds an object (`{% $markdoc %}`), or of a name every object inherits
 * (`{% $__proto__ %}`). React throws on such a child, so it renders as nothing,
 * as it does in Markdoc's own HTML renderer. React's own objects (elements,
 * portals) carry a symbol and are left alone.
 */
export function isPlainData(child: unknown): boolean {
  if (typeof child !== "object" || child === null || Array.isArray(child)) return false;
  if (typeof (child as { $$typeof?: unknown }).$$typeof === "symbol") return false;
  const proto: unknown = Object.getPrototypeOf(child);
  return proto === Object.prototype || proto === null;
}

// The React object Markdoc renders with: adds `mdContext` to built-in renderers, keeping their component types stable,
// and drops children React cannot render.
const reactWith = (mdContext: MdRenderContext) => ({
  Fragment: React.Fragment,
  createElement: ((type: React.ElementType, props: Record<string, unknown> | null, ...children: React.ReactNode[]) =>
    React.createElement(
      type,
      builtInRenderers.has(type) ? { ...props, mdContext } : props,
      ...(children.some(isPlainData) ? children.map((child) => (isPlainData(child) ? null : child)) : children),
    )) as typeof React.createElement,
});

// Helper function to merge configurations
function mergeConfig(defaultConfig: MdConfig, userConfig?: MdConfig): MdConfig {
  if (!userConfig) return defaultConfig;

  return {
    nodes: {...defaultConfig.nodes, ...userConfig.nodes},
    components: {...defaultConfig.components, ...userConfig.components},
    variables: {...defaultConfig.variables, ...userConfig.variables},
    tags: {...defaultConfig.tags, ...userConfig.tags},
    functions: {...defaultConfig.functions, ...userConfig.functions},
    partials: {...defaultConfig.partials, ...userConfig.partials},
  };
}

/** What `<Md>` works out from its props before React renders anything. */
export interface PreparedMd {
  /** The transformed document, after the `transform` hook. */
  tree: RenderableTreeNodes;
  /** What the built-in renderers read: theme, fence registry, parser, highlighter, sanitize policy. */
  mdContext: MdRenderContext;
  /** The renderer components by name: `config.components` over the defaults. */
  components: Record<string, unknown>;
  /** The message of a frontmatter parse error, shown above the document. */
  parseError?: string;
  /** Style sheets the presets contribute. */
  styles: readonly string[];
}

/** Parses and transforms `content` the way `<Md>` does: presets, frontmatter, config merge, the `transform` hook. */
export function prepareMd(rawProps: MdProps, baseTheme: MdRendererTheme): PreparedMd {
  const resolvedPreset = rawProps.presets && rawProps.presets.length
    ? mergePresets(...rawProps.presets)
    : undefined;
  const {content, frontmatter, parseFrontmatter, components, rendererTheme, highlight, transform, sanitize, tagSyntax, config: userConfig} =
    resolvedPreset ? applyPresetProps(resolvedPreset, rawProps) : rawProps;

  // `include`/`partial` parse as self-closing only while they are the library's own tags.
  const tags = {...defaultTagsConfig, ...userConfig?.tags};
  const selfClosingTags = selfClosingTagNames(tags);
  const ast = parseMarkdown(content, {selfClosingTags, tagSyntax});

  // Markdoc's public Node type does not declare the raw frontmatter attribute.
  const rawFrontmatter = (ast as { attributes?: { frontmatter?: string } }).attributes?.frontmatter;

  let resolvedFrontmatter = frontmatter;
  let parseError: string | undefined;
  if (!resolvedFrontmatter && rawFrontmatter && parseFrontmatter) {
    try {
      resolvedFrontmatter = parseFrontmatter(rawFrontmatter);
    } catch (e) {
      parseError = e instanceof Error ? e.message : String(e);
    }
  }

  // Merge user config with defaults
  const mergedConfig = mergeConfig(
    {
      nodes: defaultNodesConfig,
      components: defaultComponents,
      tags,
      variables: {markdoc: {frontmatter: resolvedFrontmatter, frontmatterRaw: rawFrontmatter}},
    },
    userConfig
  );

  // Create Markdoc config. `MdConfig` types node children as plain strings, Markdoc as node type names.
  const markdocConfig = {
    nodes: mergedConfig.nodes,
    tags: mergedConfig.tags,
    functions: mergedConfig.functions,
    variables: mergedConfig.variables,
    // String partials are parsed on first use, through a cache shared across renders.
    partials: preparePartials(mergedConfig.partials, selfClosingTags),
  } as Config;

  const mdContext: MdRenderContext = {
    theme: mergeRendererTheme(baseTheme, rendererTheme),
    registry: components ?? {},
    parseFrontmatter,
    highlight,
    sanitize,
  };

  const transformed = Markdoc.transform(ast, markdocConfig);
  return {
    tree: transform ? transform(transformed) : transformed,
    mdContext,
    components: mergedConfig.components ?? {},
    parseError,
    styles: resolvedPreset?.styles ?? [],
  };
}

/** Renders a transformed tree, or one block of it, to React elements the way `<Md>` does. */
export function renderTree(
  tree: RenderableTreeNodes,
  mdContext: MdRenderContext,
  components: Record<string, unknown>,
): React.ReactNode {
  return Markdoc.renderers.react(tree, reactWith(mdContext), {components: components as any});
}

/**
 * Puts what goes around the rendered document: a frontmatter error above it,
 * the client entry's providers (`wrap`), and the presets' style sheets.
 */
export function finishMd(
  prepared: PreparedMd,
  rendered: React.ReactNode,
  wrap?: (body: React.ReactNode, mdContext: MdRenderContext) => React.ReactNode,
): React.ReactNode {
  const {mdContext, parseError, styles} = prepared;
  const body = parseError ? (
    <>
      <MdError mdContext={mdContext}>{`Frontmatter parse error: ${parseError}`}</MdError>
      {rendered}
    </>
  ) : rendered;

  const tree = wrap ? wrap(body, mdContext) : body;

  if (styles.length > 0) {
    return (
      <>
        <style>{styles.join("\n")}</style>
        {tree}
      </>
    );
  }
  return tree;
}

/** Renders `<Md>` over `baseTheme`; `wrap` lets the client entry put its providers around the body. */
export function renderMd(
  rawProps: MdProps,
  baseTheme: MdRendererTheme,
  wrap?: (body: React.ReactNode, mdContext: MdRenderContext) => React.ReactNode,
): React.ReactNode {
  const prepared = prepareMd(rawProps, baseTheme);
  return finishMd(prepared, renderTree(prepared.tree, prepared.mdContext, prepared.components), wrap);
}

/** Renders Markdown into VaneUI components. Uses no React context, so it works in Server Components. */
export const Md: React.FC<MdProps> = (props) => renderMd(props, defaultRendererTheme);
