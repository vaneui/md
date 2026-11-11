import type React from "react";
import { defaultRendererTheme, type MdRendererTheme } from "./rendererTheme";
import type { ComponentRegistry } from "./spec";
import type { SanitizePolicy } from "./sanitize";

export type FrontmatterParser = (raw: string) => Record<string, unknown>;

/** Synchronous code-fence highlighter: returns the node placed inside the fence surface. */
export type HighlightFn = (
  code: string,
  language: string | undefined,
  meta?: string,
) => React.ReactNode;

/** Settings `<Md>` resolves once per instance and passes to its own renderers as the `mdContext` prop. */
export interface MdRenderContext {
  theme: MdRendererTheme;
  registry: ComponentRegistry;
  parseFrontmatter?: FrontmatterParser;
  highlight?: HighlightFn;
  sanitize?: SanitizePolicy;
}

/** Props every built-in renderer accepts besides its Markdoc attributes. */
export type MdRendererBaseProps = React.PropsWithChildren<{ mdContext?: MdRenderContext }>;

/** The theme from `<Md>`, or the package defaults when a renderer is used on its own. */
export const rendererThemeOf = (mdContext: MdRenderContext | undefined): MdRendererTheme =>
  mdContext?.theme ?? defaultRendererTheme;
