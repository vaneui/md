import React from "react";
import { Card, Text } from "@vaneui/ui";

export const MdError: React.FC<React.PropsWithChildren> = (props) => {
  const { children, ...rest } = props as { children: React.ReactNode } & Record<string, unknown>;
  return (
    <Card {...rest} style={{ backgroundColor: '#fef2f2', borderColor: '#fecaca', color: '#dc2626', margin: '1rem 0' }}>
      <Text bold>Error:</Text> {children}
    </Card>
  );
};