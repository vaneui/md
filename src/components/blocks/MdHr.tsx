import React, { useContext } from "react";
import { Divider } from "@vaneui/ui";
import { RendererThemeContext } from "../../rendererTheme";

export const MdHr: React.FC<unknown> = (props) => {
  const theme = useContext(RendererThemeContext);
  return <Divider {...theme.mdHr} {...(props as Record<string, unknown>)} />;
};
