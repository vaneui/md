import React, { useContext } from "react";
import { Tbody } from "@vaneui/ui";
import { RendererThemeContext } from "../../rendererTheme";

export const MdTbody: React.FC<React.PropsWithChildren> = (props) => {
  const { children, ...rest } = props as { children: React.ReactNode } & Record<string, unknown>;
  const theme = useContext(RendererThemeContext);
  return <Tbody {...theme.mdTbody} {...rest}>{children}</Tbody>;
};
