import React, { useContext } from "react";
import type { MdProps } from "../types";
import { renderMd } from "./md";
import { createMdFor } from "../createMd";
import {
  HighlightContext,
  ParserContext,
  RegistryContext,
  RendererThemeContext,
  SanitizeContext,
} from "../context";

/** `<Md>` for client components: inherits a parent `RendererThemeContext` and provides all five contexts. */
export const Md: React.FC<MdProps> = (props) => {
  const inheritedTheme = useContext(RendererThemeContext);
  return renderMd(props, inheritedTheme, (body, mdContext) => (
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
  ));
};

/** `createMd` whose builders inherit a parent `RendererThemeContext`, like the client `Md`. */
export const createMd = createMdFor(Md);
