import React from "react";
import { Link } from "@vaneui/ui";
import { rendererThemeOf, type MdRenderContext, type MdRendererBaseProps } from "../../renderContext";

export const MdLink: React.FC<MdRendererBaseProps> = (props) => {
  const { href, title, children, mdContext, ...rest } = props as { href: string; title?: string; children: React.ReactNode; mdContext?: MdRenderContext } & Record<string, unknown>;
  const theme = rendererThemeOf(mdContext);
  return <Link {...theme.mdLink} {...rest} href={href} title={title}>{children}</Link>;
};
