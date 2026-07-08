import React from "react";
import { ComponentRegistry } from "./spec";

export type FrontmatterParser = (raw: string) => Record<string, unknown>;

/**
 * Syntax-highlighting hook for code fences. Called during render (must be
 * synchronous) with the fence body, its language, and any info-string meta.
 * Return the highlighted node to place inside the fence surface. When no
 * hook is provided, MdFence falls back to a plain <pre>.
 */
export type HighlightFn = (
  code: string,
  language: string | undefined,
  meta?: string,
) => React.ReactNode;

export const RegistryContext = React.createContext<ComponentRegistry>({});

export const ParserContext = React.createContext<FrontmatterParser | undefined>(undefined);

export const HighlightContext = React.createContext<HighlightFn | undefined>(undefined);
