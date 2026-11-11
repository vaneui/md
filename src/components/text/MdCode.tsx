import React from "react";
import { Code } from "@vaneui/ui";
import { rendererThemeOf, type MdRenderContext, type MdRendererBaseProps } from "../../renderContext";

export const MdCode: React.FC<MdRendererBaseProps> = (props) => {
  const { content, children, mdContext, ...rest } = props as { content?: string; children?: React.ReactNode; mdContext?: MdRenderContext } & Record<string, unknown>;
  const theme = rendererThemeOf(mdContext);
  return <Code {...theme.mdCode} {...rest}>{content || children}</Code>;
};
