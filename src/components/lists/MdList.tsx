import React from "react";
import { List } from "@vaneui/ui";

export const MdList: React.FC<React.PropsWithChildren> = (props) => {
  const { children, ordered, ...rest } = props as { 
    children: React.ReactNode; 
    ordered?: boolean;
  } & Record<string, unknown>;
  
  // Use the ordered attribute to determine list type
  const listProps = ordered 
    ? { decimal: true } 
    : { disc: true };
  
  return <List {...rest} {...listProps}>{children}</List>;
};