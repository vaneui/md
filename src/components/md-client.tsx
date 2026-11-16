import React, { useContext } from "react";
import type { MdProps } from "../types";
import { renderMd } from "./md";
import type { MdRenderContext } from "../renderContext";
import { createMdFor } from "../createMd";
import {
  HighlightContext,
  ParserContext,
  RegistryContext,
  RendererThemeContext,
  SanitizeContext,
} from "../context";

/** Provides what `<Md>` resolved to the five contexts that custom renderers read. */
export const withProviders = (body: React.ReactNode, mdContext: MdRenderContext): React.ReactNode => (
  <RegistryContext.Provider value={mdContext.registry}>
    <ParserContext.Provider value={mdContext.parseFrontmatter}>
      <HighlightContext.Provider value={mdContext.highlight}>
        <SanitizeContext.Provider value={mdContext.sanitize}>
          <RendererThemeContext.Provider value={mdContext.theme}>
            {body}
          </RendererThemeContext.Provider>
        </SanitizeContext.Provider>
      </HighlightContext.Provider>
    </ParserContext.Provider>
  </RegistryContext.Provider>
);

/** `<Md>` for client components: inherits a parent `RendererThemeContext` and provides all five contexts. */
export const Md: React.FC<MdProps> = (props) => {
  const inheritedTheme = useContext(RendererThemeContext);
  return renderMd(props, inheritedTheme, withProviders);
};

/** `createMd` whose builders inherit a parent `RendererThemeContext`, like the client `Md`. */
export const createMd = createMdFor(Md);
