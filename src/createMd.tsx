import React from "react";
import { Md } from "./components/md";
import type { MdProps } from "./types";
import type { MdPreset } from "./preset";

/** A `<Md>` component with presets baked in, plus a chainable `.use()`. */
export interface MdBuilder extends React.FC<MdProps> {
  use(preset: MdPreset): MdBuilder;
}

/** `createMd` on top of a given `<Md>`: the main one, or the client entry's context-aware one. */
export function createMdFor(Base: React.FC<MdProps>): (presets?: MdPreset[]) => MdBuilder {
  const create = (presets: MdPreset[] = []): MdBuilder => {
    const Component = ((props: MdProps) =>
      React.createElement(Base, {
        ...props,
        presets: props.presets ? [...presets, ...props.presets] : presets,
      })) as MdBuilder;
    Component.use = (preset: MdPreset) => create([...presets, preset]);
    Component.displayName = "Md(createMd)";
    return Component;
  };
  return create;
}

/** Build a preconfigured `<Md>` by chaining presets, e.g. `createMd().use(a).use(b)`; render-time presets come after. */
export const createMd = createMdFor(Md);
