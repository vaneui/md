import React from "react";
import { Img } from "@vaneui/ui";

export const MdImage: React.FC<unknown> = (props) => {
  const {src, alt, title, ...rest} = props as { src: string; alt?: string; title?: string } & Record<string, unknown>;
  return (
    <Img {...rest} title={title} src={src} alt={alt || ""}/>
  );
};