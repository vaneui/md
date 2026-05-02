import React, { useContext } from "react";
import { Text } from "@vaneui/ui";
import { RendererThemeContext } from "../../rendererTheme";

export const MdStrong: React.FC<React.PropsWithChildren> = (props) => {
  const { children, ...rest } = props as { children: React.ReactNode } & Record<string, unknown>;
  const theme = useContext(RendererThemeContext);
  return <Text {...theme.mdStrong} tag="strong" {...rest}>{children}</Text>;
};
