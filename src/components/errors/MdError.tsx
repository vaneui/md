import React from "react";
import { Card, Text } from "@vaneui/ui";
import { rendererThemeOf, type MdRenderContext, type MdRendererBaseProps } from "../../renderContext";

export const MdError: React.FC<MdRendererBaseProps> = (props) => {
  const { children, mdContext, ...rest } = props as { children: React.ReactNode; mdContext?: MdRenderContext } & Record<string, unknown>;
  const theme = rendererThemeOf(mdContext);
  return (
    <Card {...theme.mdError} {...rest} className="my-4">
      <Text fontBold>Error:</Text> {children}
    </Card>
  );
};
