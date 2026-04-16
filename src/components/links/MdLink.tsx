import React from "react";
import { Link } from "@vaneui/ui";

/**
 * Markdown link renderer.
 *
 * Inherits font-size and line-height from the nearest typography ancestor so
 * links inside `# Heading [text](url)` render at the heading's size instead of
 * Link's own default. We can't rely on VaneUI's `inherit` appearance here
 * because that also inherits text color — we want links to keep their
 * link-blue color regardless of context. Inline styles are the simplest way
 * to scope the inheritance to font metrics only.
 */
export const MdLink: React.FC<React.PropsWithChildren> = (props) => {
  const { href, title, children, style, ...rest } = props as {
    href: string;
    title?: string;
    children: React.ReactNode;
    style?: React.CSSProperties;
  } & Record<string, unknown>;
  return (
    <Link
      {...rest}
      href={href}
      title={title}
      style={{ fontSize: 'inherit', lineHeight: 'inherit', ...style }}
    >
      {children}
    </Link>
  );
};