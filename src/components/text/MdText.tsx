import React from "react";
import { Text } from "@vaneui/ui";
import { rendererThemeOf, type MdRenderContext, type MdRendererBaseProps } from "../../renderContext";

export const MdText: React.FC<MdRendererBaseProps> = (props) => {
  const { content, children, mdContext, ...rest } = props as { content?: string; children?: React.ReactNode; mdContext?: MdRenderContext } & Record<string, unknown>;
  const theme = rendererThemeOf(mdContext);
  return <Text {...theme.mdText} tag="span" {...rest}>{content || children}</Text>;
};
