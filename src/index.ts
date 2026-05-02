// Main component export
export { Md } from "./components/md";

// Export all individual components
export * from "./components/md-components";

// Export configuration
export { defaultNodesConfig, defaultComponents } from "./config/default-config";

// Spec rendering primitives (registry is on the @vaneui/md/registry subpath
// so consumers who don't use vaneui fences pay zero bundle cost).
export { renderSpec, expandShorthand } from "./spec";
export type { ComponentSpec, ComponentRegistry } from "./spec";
export { RegistryContext, ParserContext } from "./context";
export type { FrontmatterParser } from "./context";

// Export types
export * from "./types";
