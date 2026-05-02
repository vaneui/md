import React, { useContext } from "react";
import { Code } from "@vaneui/ui";
import { RendererThemeContext } from "../../rendererTheme";

export const MdCode: React.FC<React.PropsWithChildren> = (props) => {
  const { content, children, ...rest } = props as { content?: string; children?: React.ReactNode } & Record<string, unknown>;
  const theme = useContext(RendererThemeContext);
  return <Code {...theme.mdCode} {...rest}>{content || children}</Code>;
};
