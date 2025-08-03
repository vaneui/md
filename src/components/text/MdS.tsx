import React from "react";
import { Text } from "@vaneui/ui";

export const MdS: React.FC<React.PropsWithChildren> = (props) => {
  const { children, ...rest } = props as { children: React.ReactNode } & Record<string, unknown>;
  return <Text {...rest} tag="s" style={{ textDecoration: 'line-through' }}>{children}</Text>;
};