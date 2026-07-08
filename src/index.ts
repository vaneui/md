// Main component export
export { Md } from "./components/md";

// Export all individual components
export * from "./components/md-components";

// Export configuration
export { defaultNodesConfig, defaultComponents } from "./config/default-config";

// Spec rendering primitives (registry is on the @vaneui/md/registry subpath
// so consumers who don't use vaneui fences pay zero bundle cost).
export { renderSpec, expandShorthand, collapseShorthand } from "./spec";
export type { ComponentSpec, ComponentRegistry } from "./spec";
export { RegistryContext, ParserContext, HighlightContext } from "./context";
export type { FrontmatterParser, HighlightFn } from "./context";

// Post-transform hook + helpers.
export { visit, composeTransforms, headingAnchors, rewriteLinks } from "./transform";
export type { MdTransform } from "./transform";

// Sanitize policy for untrusted vaneui-fence content.
export { SanitizeContext, strictSanitizePolicy } from "./sanitize";
export type { SanitizePolicy } from "./sanitize";

// Presets and the createMd() builder.
export { createMd } from "./createMd";
export type { MdBuilder } from "./createMd";
export { mergePresets, untrustedPreset } from "./preset";
export type { MdPreset } from "./preset";

// Per-renderer visual defaults — one slot per Md* renderer. Override via
// <Md rendererTheme={...}> or wrap children in <RendererThemeContext.Provider>.
export {
  RendererThemeContext,
  defaultRendererTheme,
  mergeRendererTheme,
} from "./rendererTheme";
export type { MdRendererTheme, MdRendererProps } from "./rendererTheme";

// Export types
export * from "./types";
