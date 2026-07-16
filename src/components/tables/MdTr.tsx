import React, { useContext } from "react";
import { Tr } from "@vaneui/ui";
import { RendererThemeContext } from "../../rendererTheme";

export const MdTr: React.FC<React.PropsWithChildren> = (props) => {
  const { children, ...rest } = props as { children: React.ReactNode } & Record<string, unknown>;
  const theme = useContext(RendererThemeContext);
  return <Tr {...theme.mdTr} {...rest}>{children}</Tr>;
};
