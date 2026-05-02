import React, { useContext } from "react";
import { Card, Text } from "@vaneui/ui";
import { RendererThemeContext } from "../../rendererTheme";

export const MdError: React.FC<React.PropsWithChildren> = (props) => {
  const { children, ...rest } = props as { children: React.ReactNode } & Record<string, unknown>;
  const theme = useContext(RendererThemeContext);
  return (
    <Card {...theme.error} {...rest} className="my-4">
      <Text bold>Error:</Text> {children}
    </Card>
  );
};
