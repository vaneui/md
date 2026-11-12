import React from "react";
import { List } from "@vaneui/ui";
import { rendererThemeOf, type MdRenderContext, type MdRendererBaseProps } from "../../renderContext";

export const MdList: React.FC<MdRendererBaseProps> = (props) => {
  const { children, ordered, start, mdContext, ...rest } = props as {
    children: React.ReactNode;
    ordered?: boolean;
    start?: unknown;
    mdContext?: MdRenderContext;
  } & Record<string, unknown>;
  const theme = rendererThemeOf(mdContext);

  // Use the ordered attribute to determine list type. An ordered list keeps the number it starts at.
  const listProps = ordered
    ? { listDecimal: true, ...(typeof start === "number" && Number.isInteger(start) ? { start } : {}) }
    : { listDisc: true };

  return <List {...theme.mdList} {...rest} {...listProps}>{children}</List>;
};
