import React from "react";
import { Link } from "@vaneui/ui";

export const MdLink: React.FC<React.PropsWithChildren> = (props) => {
  const { href, title, children, ...rest } = props as { href: string; title?: string; children: React.ReactNode } & Record<string, unknown>;
  return <Link {...rest} href={href} title={title}>{children}</Link>;
};