import React from "react";

export const MdImage: React.FC<unknown> = (props) => {
  const { src, alt, title, ...rest } = props as { src: string; alt?: string; title?: string } & Record<string, unknown>;
  return (
    <img {...rest} title={title} src={src} alt={alt || ""} style={{ display: 'block', maxWidth: '100%', height: 'auto', borderRadius: '0.5rem' }} />
  );
};