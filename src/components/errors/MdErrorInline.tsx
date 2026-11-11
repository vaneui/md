import React from "react";
import { Text } from "@vaneui/ui";
import { rendererThemeOf, type MdRenderContext, type MdRendererBaseProps } from "../../renderContext";

/**
 * Error raised where a tag is inline: next to text in a paragraph, heading,
 * table cell or list item, or in link text (for example a missing partial used
 * inline). Renders phrasing content, a `<span>`, so the DOM stays valid inside
 * a `<p>`, `<h1>` or `<a>`. Block-level errors render through `MdError`.
 */
export const MdErrorInline: React.FC<MdRendererBaseProps> = (props) => {
  const { children, mdContext, ...rest } = props as { children: React.ReactNode; mdContext?: MdRenderContext } & Record<string, unknown>;
  const theme = rendererThemeOf(mdContext);
  return (
    <Text {...theme.mdErrorInline} {...rest} tag="span">
      <Text tag="span" fontBold>Error:</Text> {children}
    </Text>
  );
};
