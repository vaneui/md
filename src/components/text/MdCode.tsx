import React from "react";
import { Badge } from "@vaneui/ui";

export const MdCode: React.FC<React.PropsWithChildren> = (props) => {
  const { content, children, ...rest } = props as { content?: string; children?: React.ReactNode } & Record<string, unknown>;
  return <Badge {...rest}>{content || children}</Badge>;
};