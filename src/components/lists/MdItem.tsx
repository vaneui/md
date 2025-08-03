import React from "react";
import { ListItem } from "@vaneui/ui";

export const MdItem: React.FC<React.PropsWithChildren> = (props) => {
  const { children, ...rest } = props as { children: React.ReactNode } & Record<string, unknown>;
  return <ListItem {...rest}>{children}</ListItem>;
};