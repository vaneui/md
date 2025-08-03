import React from "react";
import { Col } from "@vaneui/ui";

export const MdDocument: React.FC<React.PropsWithChildren> = (props) => {
  return <Col {...(props as Record<string, unknown>)} />;
};