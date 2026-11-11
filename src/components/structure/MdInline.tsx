import React from "react";
import type { MdRenderContext, MdRendererBaseProps } from "../../renderContext";

export const MdInline: React.FC<MdRendererBaseProps> = (props) => {
  const { children, mdContext: _mdContext, ...rest } = props as { children: React.ReactNode; mdContext?: MdRenderContext } & Record<string, unknown>;
  return <span {...rest}>{children}</span>;
};