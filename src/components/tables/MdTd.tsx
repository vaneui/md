import React from "react";
import { Td } from "@vaneui/ui";
import { rendererThemeOf, type MdRenderContext, type MdRendererBaseProps } from "../../renderContext";

// Markdown column alignment -> VaneUI text-align prop (Td defaults to textLeft).
const alignProps = (align?: string) =>
  align === "center" ? { textCenter: true } :
  align === "right" ? { textRight: true } :
  align === "left" ? { textLeft: true } : {};

export const MdTd: React.FC<MdRendererBaseProps> = (props) => {
  const { children, align, colspan, rowspan, mdContext, ...rest } = props as {
    children: React.ReactNode;
    align?: string;
    colspan?: number;
    rowspan?: number;
    mdContext?: MdRenderContext;
  } & Record<string, unknown>;
  const theme = rendererThemeOf(mdContext);
  return (
    <Td {...theme.mdTd} {...alignProps(align)} colSpan={colspan} rowSpan={rowspan} {...rest}>
      {children}
    </Td>
  );
};
