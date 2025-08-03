import React from "react";
import { Text } from "@vaneui/ui";

export const MdParagraph: React.FC<React.PropsWithChildren> = (props) => {
  const { children, ...rest } = props as { children: React.ReactNode } & Record<string, unknown>;
  return <Text {...rest} tag="p">{children}</Text>;
};