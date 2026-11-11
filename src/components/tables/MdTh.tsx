import React from "react";
import { Th } from "@vaneui/ui";
import { rendererThemeOf, type MdRenderContext, type MdRendererBaseProps } from "../../renderContext";

// Markdown column alignment -> VaneUI text-align prop (Th defaults to textLeft).
const alignProps = (align?: string) =>
  align === "center" ? { textCenter: true } :
  align === "right" ? { textRight: true } :
  align === "left" ? { textLeft: true } : {};

export const MdTh: React.FC<MdRendererBaseProps> = (props) => {
  const { children, align, width, mdContext, ...rest } = props as {
    children: React.ReactNode;
    align?: string;
    width?: string | number;
    mdContext?: MdRenderContext;
  } & Record<string, unknown>;
  const theme = rendererThemeOf(mdContext);
  return (
    <Th {...theme.mdTh} {...alignProps(align)} style={width ? { width } : undefined} {...rest}>
      {children}
    </Th>
  );
};
