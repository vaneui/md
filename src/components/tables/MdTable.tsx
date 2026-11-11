import React from "react";
import { Col, Table } from "@vaneui/ui";
import { rendererThemeOf, type MdRenderContext, type MdRendererBaseProps } from "../../renderContext";

export const MdTable: React.FC<MdRendererBaseProps> = (props) => {
  const { children, mdContext, ...rest } = props as { children: React.ReactNode; mdContext?: MdRenderContext } & Record<string, unknown>;
  const theme = rendererThemeOf(mdContext);
  // Col wrapper scrolls the table horizontally on narrow screens.
  return (
    <Col overflowXAuto className="my-4">
      <Table {...theme.mdTable} {...rest}>
        {children}
      </Table>
    </Col>
  );
};
