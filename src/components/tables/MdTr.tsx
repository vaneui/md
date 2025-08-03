import React from "react";

export const MdTr: React.FC<React.PropsWithChildren> = (props) => {
  const { children, ...rest } = props as { children: React.ReactNode } & Record<string, unknown>;
  return <tr {...rest}>{children}</tr>;
};