import React, { useContext } from "react";
import { Col, Table } from "@vaneui/ui";
import { RendererThemeContext } from "../../rendererTheme";

export const MdTable: React.FC<React.PropsWithChildren> = (props) => {
  const { children, ...rest } = props as { children: React.ReactNode } & Record<string, unknown>;
  const theme = useContext(RendererThemeContext);
  // Col wrapper scrolls the table horizontally on narrow screens.
  return (
    <Col overflowXAuto className="my-4">
      <Table {...theme.mdTable} {...rest}>
        {children}
      </Table>
    </Col>
  );
};
