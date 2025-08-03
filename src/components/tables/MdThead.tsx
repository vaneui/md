import React from "react";

export const MdThead: React.FC<React.PropsWithChildren> = (props) => {
  const { children, ...rest } = props as { children: React.ReactNode } & Record<string, unknown>;
  return <thead {...rest}>{children}</thead>;
};