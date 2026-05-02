import React from "react";
import { ComponentKeys } from "@vaneui/ui";

/**
 * Boolean (and a few string) props applied to the underlying VaneUI element
 * by an Md renderer. Kept as a generic record so consumers don't need to
 * import per-component prop types.
 */
export type MdRendererProps = Record<string, unknown>;

/**
 * One slot per Md renderer. Each slot's props are spread onto the underlying
 * VaneUI element, before any markdown-supplied attribute props.
 */
export interface MdRendererTheme {
  blockquote?: MdRendererProps;
  fence?: MdRendererProps;
  code?: MdRendererProps;
  em?: MdRendererProps;
  strong?: MdRendererProps;
  s?: MdRendererProps;
  paragraph?: MdRendererProps;
  text?: MdRendererProps;
  heading?: MdRendererProps;
  link?: MdRendererProps;
  list?: MdRendererProps;
  item?: MdRendererProps;
  hr?: MdRendererProps;
  document?: MdRendererProps;
  inline?: MdRendererProps;
  image?: MdRendererProps;
  hardbreak?: MdRendererProps;
  softbreak?: MdRendererProps;
  table?: MdRendererProps;
  thead?: MdRendererProps;
  tbody?: MdRendererProps;
  tr?: MdRendererProps;
  td?: MdRendererProps;
  th?: MdRendererProps;
  error?: MdRendererProps;
}

/**
 * Mirrors the visual signatures previously hardcoded as JSX props on the
 * Md* renderers. Consumers can override per-renderer via <Md rendererTheme>.
 */
export const defaultRendererTheme: MdRendererTheme = {
  blockquote: { secondary: true, noBorder: true, borderL: true },
  code: { secondary: true },
  em: { italic: true },
  strong: { bold: true },
  s: { lineThrough: true },
  error: { danger: true },
  table: { overflowAuto: true },
};

/**
 * VaneUI's mutually-exclusive prop categories, derived directly from
 * `ComponentKeys` so this list automatically picks up new categories as
 * vaneui evolves (fontWeight, fontStyle, textDecoration, etc.).
 *
 * When a consumer sets ANY key in one of these groups, all sibling keys
 * from the package defaults are dropped before merging — otherwise both
 * would land truthy on the JSX element and the underlying VaneUI component
 * would resolve them by ComponentKeys iteration order rather than consumer
 * intent.
 */
const MUTUALLY_EXCLUSIVE_GROUPS: readonly (readonly string[])[] = Object.values(
  ComponentKeys,
) as readonly (readonly string[])[];

function mergeRendererProps(
  defaults: MdRendererProps | undefined,
  user: MdRendererProps | undefined,
): MdRendererProps {
  if (!user) return defaults ?? {};
  if (!defaults) return user;

  let cleaned: MdRendererProps = defaults;
  for (const group of MUTUALLY_EXCLUSIVE_GROUPS) {
    if (group.some((k) => Boolean(user[k]))) {
      cleaned = { ...cleaned };
      for (const k of group) delete (cleaned as Record<string, unknown>)[k];
    }
  }
  return { ...cleaned, ...user };
}

/**
 * Merge a user-supplied rendererTheme over the package defaults. For each
 * renderer slot the merge is group-aware (see mergeRendererProps) so the
 * consumer's intent on mutually-exclusive props always wins.
 */
export function mergeRendererTheme(
  defaults: MdRendererTheme,
  user: MdRendererTheme | undefined,
): MdRendererTheme {
  if (!user) return defaults;
  const result: MdRendererTheme = { ...defaults };
  for (const key of Object.keys(user) as (keyof MdRendererTheme)[]) {
    result[key] = mergeRendererProps(defaults[key], user[key]);
  }
  return result;
}

export const RendererThemeContext = React.createContext<MdRendererTheme>(defaultRendererTheme);
