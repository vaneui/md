import React from "react";
import { Title } from "@vaneui/ui";

export const MdHeading: React.FC<React.PropsWithChildren> = (props) => {
  const { level, children, ...rest } = props as { level: number; children: React.ReactNode } & Record<string, unknown>;
  const tags = ["h1","h2","h3","h4","h5","h6"] as const;
  type HeadingTag = typeof tags[number];
  let tag: HeadingTag = `h1`;
  let size: { xs?: boolean; sm?: boolean; md?: boolean; lg?: boolean; xl?: boolean } = {};
  switch (level) {
    case 1:
      tag = `h1`;
      size = { xl: true };
      break;
    case 2:
      tag = `h2`;
      size = { lg: true };
      break;
    case 3:
      tag = `h3`;
      size = { md: true };
      break;
    case 4:
      tag = `h4`;
      size = { sm: true };
      break;
    case 5:
      tag = `h5`;
      size = { xs: true };
      break;
    case 6:
      tag = `h6`;
      size = { xs: true };
      break;
  }

  return <Title {...rest} {...size} tag={tag}>{children}</Title>;
};