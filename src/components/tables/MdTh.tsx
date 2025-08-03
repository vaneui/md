import React from "react";

export const MdTh: React.FC<React.PropsWithChildren> = (props) => {
  const { children, align, width, ...rest } = props as { 
    children: React.ReactNode; 
    align?: string; 
    width?: string | number 
  } & Record<string, unknown>;
  
  return (
    <th 
      {...rest} 
      style={{ textAlign: align as any, width }}
    >
      {children}
    </th>
  );
};