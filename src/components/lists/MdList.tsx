import React from "react";
import { List } from "@vaneui/ui";
import { rendererThemeOf, type MdRenderContext, type MdRendererBaseProps } from "../../renderContext";

export const MdList: React.FC<MdRendererBaseProps> = (props) => {
  const { children, ordered, mdContext, ...rest } = props as {
    children: React.ReactNode;
    ordered?: boolean;
    mdContext?: MdRenderContext;
  } & Record<string, unknown>;
  const theme = rendererThemeOf(mdContext);

  // Use the ordered attribute to determine list type
  const listProps = ordered
    ? { listDecimal: true }
    : { listDisc: true };

  return <List {...theme.mdList} {...rest} {...listProps}>{children}</List>;
};
