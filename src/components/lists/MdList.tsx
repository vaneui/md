import React, { useContext } from "react";
import { List } from "@vaneui/ui";
import { RendererThemeContext } from "../../rendererTheme";

export const MdList: React.FC<React.PropsWithChildren> = (props) => {
  const { children, ordered, ...rest } = props as {
    children: React.ReactNode;
    ordered?: boolean;
  } & Record<string, unknown>;
  const theme = useContext(RendererThemeContext);

  // Use the ordered attribute to determine list type
  const listProps = ordered
    ? { decimal: true }
    : { disc: true };

  return <List {...theme.mdList} {...rest} {...listProps}>{children}</List>;
};
