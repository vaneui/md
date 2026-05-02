import React, { useContext } from "react";
import { Col } from "@vaneui/ui";
import { RendererThemeContext } from "../../rendererTheme";

export const MdDocument: React.FC<React.PropsWithChildren> = (props) => {
  const theme = useContext(RendererThemeContext);
  return <Col {...theme.document} {...(props as Record<string, unknown>)} />;
};
