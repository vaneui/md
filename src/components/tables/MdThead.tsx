import React, { useContext } from "react";
import { Thead } from "@vaneui/ui";
import { RendererThemeContext } from "../../rendererTheme";

export const MdThead: React.FC<React.PropsWithChildren> = (props) => {
  const { children, ...rest } = props as { children: React.ReactNode } & Record<string, unknown>;
  const theme = useContext(RendererThemeContext);
  return <Thead {...theme.mdThead} {...rest}>{children}</Thead>;
};
