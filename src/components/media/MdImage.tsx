import React, { useContext } from "react";
import { Img } from "@vaneui/ui";
import { RendererThemeContext } from "../../rendererTheme";

export const MdImage: React.FC<unknown> = (props) => {
  const {src, alt, title, ...rest} = props as { src: string; alt?: string; title?: string } & Record<string, unknown>;
  const theme = useContext(RendererThemeContext);
  return (
    <Img {...theme.image} {...rest} title={title} src={src} alt={alt || ""}/>
  );
};
