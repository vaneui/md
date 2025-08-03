import React from "react";
import { Card } from "@vaneui/ui";

export const MdBlockquote: React.FC<React.PropsWithChildren> = (props) => {
  const { children, ...rest } = props as { children: React.ReactNode } & Record<string, unknown>;
  return (
    <Card {...rest} style={{ borderLeft: '4px solid #d1d5db', paddingLeft: '1rem' }}>
      {children}
    </Card>
  );
};