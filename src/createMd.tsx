import React from "react";
import { Md } from "./components/md";
import type { MdProps } from "./types";
import type { MdPreset } from "./preset";

/** A `<Md>` component with presets baked in, plus a chainable `.use()`. */
export interface MdBuilder extends React.FC<MdProps> {
  use(preset: MdPreset): MdBuilder;
}

/**
 * Build a preconfigured `<Md>` by chaining presets:
 *
 * ```tsx
 * const Doc = createMd().use(gfmPreset).use(shikiPreset({ langs, themes }));
 * <Doc content={md} />
 * ```
 *
 * Each `.use()` returns a new builder; preset resolution and conflict
 * detection happen inside `<Md>` via its `presets` prop, so a builder is just
 * accumulated presets. Presets passed at render time are appended after the
 * builder's own.
 */
export function createMd(presets: MdPreset[] = []): MdBuilder {
  const Component = ((props: MdProps) =>
    React.createElement(Md, {
      ...props,
      presets: props.presets ? [...presets, ...props.presets] : presets,
    })) as MdBuilder;
  Component.use = (preset: MdPreset) => createMd([...presets, preset]);
  Component.displayName = "Md(createMd)";
  return Component;
}
