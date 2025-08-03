import React from "react";
import { Divider } from "@vaneui/ui";

export const MdHr: React.FC<unknown> = (props) => {
  return <Divider {...(props as Record<string, unknown>)} />;
};