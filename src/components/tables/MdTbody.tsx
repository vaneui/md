import React from "react";

export const MdTbody: React.FC<React.PropsWithChildren> = (props) => {
  const { children, ...rest } = props as { children: React.ReactNode } & Record<string, unknown>;
  return <tbody {...rest}>{children}</tbody>;
};