import React from "react";
import { ComponentRegistry } from "./spec";

export type FrontmatterParser = (raw: string) => Record<string, unknown>;

export const RegistryContext = React.createContext<ComponentRegistry>({});

export const ParserContext = React.createContext<FrontmatterParser | undefined>(undefined);
