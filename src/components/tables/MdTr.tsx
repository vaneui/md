import React from "react";
import { Tr } from "@vaneui/ui";
import { rendererThemeOf, type MdRenderContext, type MdRendererBaseProps } from "../../renderContext";

export const MdTr: React.FC<MdRendererBaseProps> = (props) => {
  const { children, mdContext, ...rest } = props as { children: React.ReactNode; mdContext?: MdRenderContext } & Record<string, unknown>;
  const theme = rendererThemeOf(mdContext);
  return <Tr {...theme.mdTr} {...rest}>{children}</Tr>;
};
