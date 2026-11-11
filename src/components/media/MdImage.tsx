import React from "react";
import { Img } from "@vaneui/ui";
import { rendererThemeOf, type MdRenderContext } from "../../renderContext";

export const MdImage: React.FC<unknown> = (props) => {
  const {src, alt, title, mdContext, ...rest} = props as { src: string; alt?: string; title?: string; mdContext?: MdRenderContext } & Record<string, unknown>;
  const theme = rendererThemeOf(mdContext);
  return (
    <Img {...theme.mdImage} {...rest} title={title} src={src} alt={alt || ""}/>
  );
};
