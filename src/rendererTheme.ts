import React from "react";
import {
  ComponentKeys,
  type BaseProps,
  type SizeProps,
  type AppearanceProps,
  type VariantProps,
  type ShapeProps,
  type FontFamilyProps,
  type FontWeightProps,
  type FontStyleProps,
  type TextDecorationProps,
  type TextTransformProps,
  type TextAlignProps,
  type PaddingProps,
  type GapProps,
  type BorderProps,
  type ShadowProps,
  type RingProps,
  type FocusVisibleProps,
  type ItemsProps,
  type JustifyProps,
  type FlexDirectionProps,
  type ReverseProps,
  type WrapProps,
  type DisplayProps,
  type PositionProps,
  type OverflowProps,
  type BreakpointProps,
  type HideProps,
  type ResponsiveProps,
  type TransparentProps,
  type BlurProps,
  type PointerEventsProps,
  type CursorProps,
  type TransitionProps,
  type WhitespaceProps,
  type ObjectFitProps,
  type ListStyleProps,
  type WidthProps,
  type TruncateProps,
  type OrientationProps,
  type HeightProps,
  type LetterSpacingProps,
  // Component prop types — used per slot for component-specific autocomplete
  type CardProps,
  type CodeProps,
  type ColProps,
  type TypographyProps,
  type TitleProps,
  type LinkProps,
  type ListProps,
  type ListItemProps,
  type DividerProps,
  type ImgProps,
} from "@vaneui/ui";

/**
 * Extracts only the boolean fields from a component's props type. Mirrors
 * vaneui's internal helper used in `ThemeDefaults` — strips className,
 * children, HTMLAttributes, callbacks, and string/ReactNode fields, leaving
 * just the visual boolean props.
 */
type BooleanKeys<T> = {
  [K in keyof T as T[K] extends boolean | undefined ? K : never]: boolean;
};

/**
 * Theme-slot prop type for a renderer that wraps a known VaneUI component.
 * Gives consumers IDE autocomplete restricted to that component's valid
 * boolean visual props (no event handlers, no ARIA, no callbacks), plus
 * `className` and `tag` which are always meaningful as theme overrides.
 */
export type SlotPropsOf<T> = Partial<BooleanKeys<T>> & {
  /** Additional CSS classes to merge with theme classes */
  className?: string;
  /** Custom HTML tag or React component to render as */
  tag?: React.ElementType;
};

/**
 * Kitchen-sink boolean prop type — intersection of every vaneui category.
 * Used as the slot type for renderers that don't wrap a known VaneUI
 * component (mdInline, mdHardbreak, mdSoftbreak, mdThead, mdTbody, mdTr,
 * mdTd, mdTh) and as the merge function's internal type. Exported as an
 * escape hatch.
 */
export type MdRendererProps =
  & BaseProps
  & SizeProps
  & AppearanceProps
  & VariantProps
  & ShapeProps
  & FontFamilyProps
  & FontWeightProps
  & FontStyleProps
  & TextDecorationProps
  & TextTransformProps
  & TextAlignProps
  & PaddingProps
  & GapProps
  & BorderProps
  & ShadowProps
  & RingProps
  & FocusVisibleProps
  & ItemsProps
  & JustifyProps
  & FlexDirectionProps
  & ReverseProps
  & WrapProps
  & DisplayProps
  & PositionProps
  & OverflowProps
  & BreakpointProps
  & HideProps
  & ResponsiveProps
  & TransparentProps
  & BlurProps
  & PointerEventsProps
  & CursorProps
  & TransitionProps
  & WhitespaceProps
  & ObjectFitProps
  & ListStyleProps
  & WidthProps
  & TruncateProps
  & OrientationProps
  & HeightProps
  & LetterSpacingProps;

/**
 * One slot per Md renderer. Each slot is typed to the underlying VaneUI
 * component so IDE autocomplete shows only valid props for that component.
 *
 * Naming convention: slot keys mirror the renderer file (MdBlockquote ->
 * mdBlockquote, MdFence -> mdFence, etc.) so consumers can find the slot
 * by looking at the renderer.
 *
 * Each slot is typed against the prop type of the underlying VaneUI component,
 * giving consumers component-specific IDE autocomplete (e.g. `mdHeading` only
 * suggests Title-relevant props; `mdList` only List props).
 */
export interface MdRendererTheme {
  // Layout (Card / Col)
  mdBlockquote?: SlotPropsOf<CardProps>;
  mdFence?: SlotPropsOf<CardProps>;
  mdError?: SlotPropsOf<CardProps>;
  mdTable?: SlotPropsOf<CardProps>;
  mdDocument?: SlotPropsOf<ColProps>;
  mdCode?: SlotPropsOf<CodeProps>;
  // Typography (Text uses TypographyProps directly; Title and ListItem have
  // their own dedicated prop types)
  mdEm?: SlotPropsOf<TypographyProps>;
  mdStrong?: SlotPropsOf<TypographyProps>;
  mdS?: SlotPropsOf<TypographyProps>;
  mdParagraph?: SlotPropsOf<TypographyProps>;
  mdText?: SlotPropsOf<TypographyProps>;
  mdHeading?: SlotPropsOf<TitleProps>;
  mdItem?: SlotPropsOf<ListItemProps>;
  // Other VaneUI primitives
  mdLink?: SlotPropsOf<LinkProps>;
  mdList?: SlotPropsOf<ListProps>;
  mdHr?: SlotPropsOf<DividerProps>;
  mdImage?: SlotPropsOf<ImgProps>;
  // Plain-HTML renderers (no VaneUI primitive — slots accepted but unused)
  mdInline?: MdRendererProps;
  mdHardbreak?: MdRendererProps;
  mdSoftbreak?: MdRendererProps;
  mdThead?: MdRendererProps;
  mdTbody?: MdRendererProps;
  mdTr?: MdRendererProps;
  mdTd?: MdRendererProps;
  mdTh?: MdRendererProps;
}

/**
 * Mirrors the visual signatures previously hardcoded as JSX props on the
 * Md* renderers. Consumers can override per-renderer via <Md rendererTheme>.
 */
export const defaultRendererTheme: MdRendererTheme = {
  mdBlockquote: { secondary: true, noBorder: true, borderL: true },
  mdCode: { secondary: true },
  mdEm: { italic: true },
  mdStrong: { bold: true },
  mdS: { lineThrough: true },
  mdError: { danger: true },
  mdTable: { overflowAuto: true },
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
  defaults: Record<string, unknown> | undefined,
  user: Record<string, unknown> | undefined,
): Record<string, unknown> {
  if (!user) return defaults ?? {};
  if (!defaults) return user;

  let cleaned: Record<string, unknown> = defaults;
  for (const group of MUTUALLY_EXCLUSIVE_GROUPS) {
    if (group.some((k) => Boolean(user[k]))) {
      cleaned = { ...cleaned };
      for (const k of group) delete cleaned[k];
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
  const result = { ...defaults } as Record<string, unknown>;
  const defaultsAsRecord = defaults as Record<string, unknown>;
  const userAsRecord = user as Record<string, unknown>;
  for (const key of Object.keys(user)) {
    result[key] = mergeRendererProps(
      defaultsAsRecord[key] as Record<string, unknown> | undefined,
      userAsRecord[key] as Record<string, unknown> | undefined,
    );
  }
  return result as MdRendererTheme;
}

export const RendererThemeContext = React.createContext<MdRendererTheme>(defaultRendererTheme);
