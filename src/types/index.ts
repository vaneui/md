import React from "react";

// Component type for Markdoc nodes
export type MdComponent = React.FC<any>;

// Configuration for each node type
export interface MdNodeConfig {
  render?: string;
  attributes?: Record<string, { type: any; default?: any; required?: boolean }>;
  children?: string[];
  transform?: (node: any, config: any) => any;
}

// Complete configuration for all nodes
export interface MdNodesConfig {
  document?: MdNodeConfig;
  heading?: MdNodeConfig;
  paragraph?: MdNodeConfig;
  hr?: MdNodeConfig;
  image?: MdNodeConfig;
  fence?: MdNodeConfig;
  blockquote?: MdNodeConfig;
  list?: MdNodeConfig;
  item?: MdNodeConfig;
  table?: MdNodeConfig;
  thead?: MdNodeConfig;
  tbody?: MdNodeConfig;
  tr?: MdNodeConfig;
  td?: MdNodeConfig;
  th?: MdNodeConfig;
  inline?: MdNodeConfig;
  strong?: MdNodeConfig;
  em?: MdNodeConfig;
  s?: MdNodeConfig;
  link?: MdNodeConfig;
  code?: MdNodeConfig;
  text?: MdNodeConfig;
  hardbreak?: MdNodeConfig;
  softbreak?: MdNodeConfig;
  error?: MdNodeConfig;
}

// Component map for custom rendering
export interface MdComponents {
  MdDocument?: MdComponent;
  MdHeading?: MdComponent;
  MdParagraph?: MdComponent;
  MdHr?: MdComponent;
  MdImage?: MdComponent;
  MdFence?: MdComponent;
  MdBlockquote?: MdComponent;
  MdList?: MdComponent;
  MdItem?: MdComponent;
  MdTable?: MdComponent;
  MdThead?: MdComponent;
  MdTbody?: MdComponent;
  MdTr?: MdComponent;
  MdTd?: MdComponent;
  MdTh?: MdComponent;
  MdInline?: MdComponent;
  MdStrong?: MdComponent;
  MdEm?: MdComponent;
  MdS?: MdComponent;
  MdLink?: MdComponent;
  MdCode?: MdComponent;
  MdText?: MdComponent;
  MdHardbreak?: MdComponent;
  MdSoftbreak?: MdComponent;
  MdError?: MdComponent;
  [key: string]: MdComponent | undefined;
}

// Complete configuration object
export interface MdConfig {
  nodes?: MdNodesConfig;
  components?: MdComponents;
  variables?: Record<string, any>;
  tags?: Record<string, any>;
  functions?: Record<string, any>;
}

// Props for the main Md component
export interface MdProps {
  content: string;
  /**
   * Pre-parsed frontmatter. Wins over `parseFrontmatter` when both are
   * supplied. Exposed inside markdown as `$markdoc.frontmatter`.
   */
  frontmatter?: Record<string, unknown>;
  /**
   * Optional parser invoked with the raw YAML string between `---`
   * markers when `frontmatter` is not supplied. Returns the object
   * exposed as `$markdoc.frontmatter`. Throwing routes to MdError.
   * Pass `parseYamlFrontmatter` from `@vaneui/md/yaml` for the default.
   * Also used to parse `vaneui` fenced code blocks at body position.
   */
  parseFrontmatter?: (raw: string) => Record<string, unknown>;
  /**
   * String -> component map used to resolve component names in
   * `vaneui` fenced code blocks. Pass `defaultRegistry` from
   * `@vaneui/md/registry` for the safe VaneUI allowlist, or supply
   * a custom map. Defaults to an empty registry when omitted, in
   * which case `vaneui` fences fall back to plain code rendering.
   */
  components?: Record<string, React.ComponentType<any>>;
  /**
   * Per-renderer visual defaults for Md* renderers. Each slot
   * (blockquote, code, em, strong, ...) holds boolean props that get
   * spread onto the underlying VaneUI element. Merges over
   * `defaultRendererTheme` with awareness of mutually-exclusive prop
   * categories (size/appearance/variant/shape/border) so consumer
   * intent wins over package defaults.
   */
  rendererTheme?: import("../rendererTheme").MdRendererTheme;
  config?: MdConfig;
}