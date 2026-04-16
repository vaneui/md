import React from "react";
import { Card, Text } from "@vaneui/ui";

export const MdError: React.FC<React.PropsWithChildren> = (props) => {
  const { children, ...rest } = props as { children: React.ReactNode } & Record<string, unknown>;
  return (
    <Card {...rest} danger className="my-4">
      <Text bold>Error:</Text> {children}
    </Card>
  );
};