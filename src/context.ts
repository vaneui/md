import React from "react";
import type { ComponentRegistry } from "./spec";
import { defaultRendererTheme, type MdRendererTheme } from "./rendererTheme";
import type { FrontmatterParser, HighlightFn } from "./renderContext";
import type { SanitizePolicy } from "./sanitize";

// Client entry only (@vaneui/md/client): the main entry must stay free of createContext.
export const RegistryContext = React.createContext<ComponentRegistry>({});

export const ParserContext = React.createContext<FrontmatterParser | undefined>(undefined);

export const HighlightContext = React.createContext<HighlightFn | undefined>(undefined);

export const SanitizeContext = React.createContext<SanitizePolicy | undefined>(undefined);

export const RendererThemeContext = React.createContext<MdRendererTheme>(defaultRendererTheme);
