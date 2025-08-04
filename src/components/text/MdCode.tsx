import React from "react";
import { Badge, Code } from "@vaneui/ui";

export const MdCode: React.FC<React.PropsWithChildren> = (props) => {
  const { content, children, ...rest } = props as { content?: string; children?: React.ReactNode } & Record<string, unknown>;
  return <Code secondary {...rest}>{content || children}</Code>;
};