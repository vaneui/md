import Markdoc from "@markdoc/markdoc";
import React from "react";
import { MdProps, MdConfig } from "../types";
import { defaultNodesConfig, defaultComponents } from "../config/default-config";

// Helper function to merge configurations
function mergeConfig(defaultConfig: MdConfig, userConfig?: MdConfig): MdConfig {
  if (!userConfig) return defaultConfig;

  return {
    nodes: {...defaultConfig.nodes, ...userConfig.nodes},
    components: {...defaultConfig.components, ...userConfig.components},
    variables: {...defaultConfig.variables, ...userConfig.variables},
    tags: {...defaultConfig.tags, ...userConfig.tags},
    functions: {...defaultConfig.functions, ...userConfig.functions},
  };
}

export const Md: React.FC<MdProps> = ({content, frontmatter, config: userConfig}) => {
  const ast = Markdoc.parse(content);

  // Merge user config with defaults
  const mergedConfig = mergeConfig(
    {
      nodes: defaultNodesConfig,
      components: defaultComponents,
      variables: {markdoc: {frontmatter}},
    },
    userConfig
  );

  // Create Markdoc config
  const markdocConfig = {
    nodes: mergedConfig.nodes,
    tags: mergedConfig.tags,
    functions: mergedConfig.functions,
    variables: mergedConfig.variables,
  };

  const transformed = Markdoc.transform(ast, markdocConfig);

  return Markdoc.renderers.react(transformed, React, {
    components: mergedConfig.components as any,
  });
};
