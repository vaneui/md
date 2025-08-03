import React from "react";
import { Title } from "@vaneui/ui";

export const MdHeading: React.FC<React.PropsWithChildren> = (props) => {
  const { level, children, ...rest } = props as { level: number; children: React.ReactNode } & Record<string, unknown>;
  const tag = `h${level}`;
  let size: { xs?: boolean; sm?: boolean; md?: boolean; lg?: boolean; xl?: boolean } = {};
  switch (level) {
    case 1:
      size = { xl: true };
      break;
    case 2:
      size = { lg: true };
      break;
    case 3:
      size = { md: true };
      break;
    case 4:
      size = { sm: true };
      break;
    case 5:
    case 6:
      size = { xs: true };
      break;
  }

  return <Title {...rest} {...size} tag={tag}>{children}</Title>;
};