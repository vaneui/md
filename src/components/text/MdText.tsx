import React from "react";
import { Text } from "@vaneui/ui";

export const MdText: React.FC<React.PropsWithChildren> = (props) => {
  const { content, children, ...rest } = props as { content?: string; children?: React.ReactNode } & Record<string, unknown>;
  return <Text {...rest} tag="span">{content || children}</Text>;
};