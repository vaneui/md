import React, { useContext } from "react";
import { ListItem } from "@vaneui/ui";
import { RendererThemeContext } from "../../rendererTheme";

export const MdItem: React.FC<React.PropsWithChildren> = (props) => {
  const { children, ...rest } = props as { children: React.ReactNode } & Record<string, unknown>;
  const theme = useContext(RendererThemeContext);
  return <ListItem {...theme.mdItem} {...rest}>{children}</ListItem>;
};
