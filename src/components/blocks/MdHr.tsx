import React from "react";
import { Divider } from "@vaneui/ui";
import { rendererThemeOf, type MdRenderContext } from "../../renderContext";

export const MdHr: React.FC<unknown> = (props) => {
  const { mdContext, ...rest } = props as { mdContext?: MdRenderContext } & Record<string, unknown>;
  const theme = rendererThemeOf(mdContext);
  return <Divider {...theme.mdHr} {...rest} />;
};
