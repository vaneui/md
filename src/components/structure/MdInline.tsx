import React from "react";

export const MdInline: React.FC<React.PropsWithChildren> = (props) => {
  const { children, ...rest } = props as { children: React.ReactNode } & Record<string, unknown>;
  return <span {...rest}>{children}</span>;
};