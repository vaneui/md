import React from "react";
import { Card } from "@vaneui/ui";

export const MdTable: React.FC<React.PropsWithChildren> = (props) => {
  const { children, ...rest } = props as { children: React.ReactNode } & Record<string, unknown>;
  return (
    <Card style={{ overflow: 'auto', margin: '1rem 0' }}>
      <table {...rest} style={{ width: '100%', borderCollapse: 'collapse' }}>
        {children}
      </table>
    </Card>
  );
};