import React, { useContext } from "react";
import { Td } from "@vaneui/ui";
import { RendererThemeContext } from "../../rendererTheme";

// Markdown column alignment -> VaneUI text-align prop (Td defaults to textLeft).
const alignProps = (align?: string) =>
  align === "center" ? { textCenter: true } :
  align === "right" ? { textRight: true } :
  align === "left" ? { textLeft: true } : {};

export const MdTd: React.FC<React.PropsWithChildren> = (props) => {
  const { children, align, colspan, rowspan, ...rest } = props as {
    children: React.ReactNode;
    align?: string;
    colspan?: number;
    rowspan?: number;
  } & Record<string, unknown>;
  const theme = useContext(RendererThemeContext);
  return (
    <Td {...theme.mdTd} {...alignProps(align)} colSpan={colspan} rowSpan={rowspan} {...rest}>
      {children}
    </Td>
  );
};
