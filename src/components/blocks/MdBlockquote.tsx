import React, { useContext } from "react";
import { Card } from "@vaneui/ui";
import { RendererThemeContext } from "../../rendererTheme";

export const MdBlockquote: React.FC<React.PropsWithChildren> = (props) => {
  const { children, ...rest } = props as { children: React.ReactNode } & Record<string, unknown>;
  const theme = useContext(RendererThemeContext);
  return (
    <Card {...theme.mdBlockquote} {...rest}>
      {children}
    </Card>
  );
};
