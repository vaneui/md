import React from "react";
import { Text } from "@vaneui/ui";
import { rendererThemeOf, type MdRenderContext, type MdRendererBaseProps } from "../../renderContext";

/** Error where a tag is inline (paragraph, heading, cell, item, link text): a `<span>`, so the DOM stays valid. */
export const MdErrorInline: React.FC<MdRendererBaseProps> = (props) => {
  const { children, mdContext, ...rest } = props as { children: React.ReactNode; mdContext?: MdRenderContext } & Record<string, unknown>;
  const theme = rendererThemeOf(mdContext);
  return (
    <Text {...theme.mdErrorInline} {...rest} tag="span">
      <Text tag="span" fontBold>Error:</Text> {children}
    </Text>
  );
};
