import React from "react";
import { Card } from "@vaneui/ui";
import { rendererThemeOf, type MdRenderContext, type MdRendererBaseProps } from "../../renderContext";

export const MdBlockquote: React.FC<MdRendererBaseProps> = (props) => {
  const { children, mdContext, ...rest } = props as { children: React.ReactNode; mdContext?: MdRenderContext } & Record<string, unknown>;
  const theme = rendererThemeOf(mdContext);
  return (
    <Card {...theme.mdBlockquote} {...rest}>
      {children}
    </Card>
  );
};
