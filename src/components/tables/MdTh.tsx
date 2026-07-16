import React, { useContext } from "react";
import { Th } from "@vaneui/ui";
import { RendererThemeContext } from "../../rendererTheme";

// Markdown column alignment -> VaneUI text-align prop (Th defaults to textLeft).
const alignProps = (align?: string) =>
  align === "center" ? { textCenter: true } :
  align === "right" ? { textRight: true } :
  align === "left" ? { textLeft: true } : {};

export const MdTh: React.FC<React.PropsWithChildren> = (props) => {
  const { children, align, width, ...rest } = props as {
    children: React.ReactNode;
    align?: string;
    width?: string | number;
  } & Record<string, unknown>;
  const theme = useContext(RendererThemeContext);
  return (
    <Th {...theme.mdTh} {...alignProps(align)} style={width ? { width } : undefined} {...rest}>
      {children}
    </Th>
  );
};
