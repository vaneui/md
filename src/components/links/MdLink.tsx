import React, { useContext } from "react";
import { Link } from "@vaneui/ui";
import { RendererThemeContext } from "../../rendererTheme";

export const MdLink: React.FC<React.PropsWithChildren> = (props) => {
  const { href, title, children, ...rest } = props as { href: string; title?: string; children: React.ReactNode } & Record<string, unknown>;
  const theme = useContext(RendererThemeContext);
  return <Link {...theme.link} {...rest} href={href} title={title}>{children}</Link>;
};
