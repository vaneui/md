import React, { useContext } from "react";
import { Text } from "@vaneui/ui";
import { RendererThemeContext } from "../../rendererTheme";

export const MdText: React.FC<React.PropsWithChildren> = (props) => {
  const { content, children, ...rest } = props as { content?: string; children?: React.ReactNode } & Record<string, unknown>;
  const theme = useContext(RendererThemeContext);
  return <Text {...theme.text} tag="span" {...rest}>{content || children}</Text>;
};
