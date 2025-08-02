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
  frontmatter?: Record<string, unknown>;
  config?: MdConfig;
}