import React, { useContext } from "react";
import { Card } from "@vaneui/ui";
import { RendererThemeContext } from "../../rendererTheme";

export const MdTable: React.FC<React.PropsWithChildren> = (props) => {
  const { children, ...rest } = props as { children: React.ReactNode } & Record<string, unknown>;
  const theme = useContext(RendererThemeContext);
  return (
    <Card {...theme.table} className="my-4">
      <table {...rest} style={{ width: '100%', borderCollapse: 'collapse' }}>
        {children}
      </table>
    </Card>
  );
};
