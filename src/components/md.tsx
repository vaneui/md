import Markdoc from "@markdoc/markdoc";
import React from "react";
import { MdProps, MdConfig } from "../types";
import { defaultNodesConfig, defaultComponents } from "../config/default-config";
import { MdError } from "./errors/MdError";
import { ParserContext, RegistryContext } from "../context";

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

export const Md: React.FC<MdProps> = ({content, frontmatter, parseFrontmatter, components, config: userConfig}) => {
  const ast = Markdoc.parse(content);

  // Markdoc stores raw frontmatter on the document node; type cast because
  // @markdoc/markdoc does not surface this attribute on its public Node type.
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
      variables: {markdoc: {frontmatter: resolvedFrontmatter, frontmatterRaw: rawFrontmatter}},
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
  const rendered = Markdoc.renderers.react(transformed, React, {
    components: mergedConfig.components as any,
  });

  const body = parseError ? (
    <>
      <MdError>{`Frontmatter parse error: ${parseError}`}</MdError>
      {rendered}
    </>
  ) : rendered;

  return (
    <RegistryContext.Provider value={components ?? {}}>
      <ParserContext.Provider value={parseFrontmatter}>
        {body as React.ReactNode}
      </ParserContext.Provider>
    </RegistryContext.Provider>
  );
};
