import React from "react";

export const MdTd: React.FC<React.PropsWithChildren> = (props) => {
  const { children, align, colspan, rowspan, ...rest } = props as { 
    children: React.ReactNode; 
    align?: string; 
    colspan?: number; 
    rowspan?: number 
  } & Record<string, unknown>;
  
  return (
    <td 
      {...rest} 
      style={{ textAlign: align as any }}
      colSpan={colspan}
      rowSpan={rowspan}
    >
      {children}
    </td>
  );
};