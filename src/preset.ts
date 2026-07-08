import type { MdComponents, MdConfig, MdNodesConfig, MdProps } from "./types";
import type { ComponentRegistry } from "./spec";
import type { MdRendererTheme } from "./rendererTheme";
import { mergeRendererTheme } from "./rendererTheme";
import type { HighlightFn } from "./context";
import type { MdTransform } from "./transform";
import { composeTransforms } from "./transform";
import type { SanitizePolicy } from "./sanitize";
import { strictSanitizePolicy } from "./sanitize";

/**
 * A distributable bundle of renderer configuration. Compose several with
 * `createMd().use(...)` or the `presets` prop on `<Md>`. A preset can
 * contribute Markdoc config (nodes/tags/functions/variables), renderer swaps
 * (components), vaneui-fence allowlist entries (registry), per-renderer visual
 * defaults (rendererTheme), a highlight hook, a post-transform, a sanitize
 * policy, and co-shipped CSS.
 */
export interface MdPreset {
  nodes?: MdNodesConfig;
  tags?: Record<string, unknown>;
  functions?: Record<string, unknown>;
  variables?: Record<string, unknown>;
  /** Markdoc renderer swaps (folded into `config.components`). */
  components?: MdComponents;
  /** vaneui-fence component allowlist contributions (folded into the `components` prop). */
  registry?: ComponentRegistry;
  rendererTheme?: MdRendererTheme;
  highlight?: HighlightFn;
  transform?: MdTransform;
  sanitize?: SanitizePolicy;
  styles?: string;
}

export interface ResolvedPreset {
  components?: ComponentRegistry;
  rendererTheme?: MdRendererTheme;
  highlight?: HighlightFn;
  transform?: MdTransform;
  sanitize?: SanitizePolicy;
  config?: MdConfig;
  styles: string[];
}

const isDev = () =>
  typeof process !== "undefined" && process.env.NODE_ENV !== "production";

function mergeKeyed(
  target: Record<string, unknown>,
  source: Record<string, unknown> | undefined,
  seen: Set<string>,
  label: string,
): void {
  if (!source) return;
  for (const [key, value] of Object.entries(source)) {
    if (seen.has(key) && isDev()) {
      // eslint-disable-next-line no-console
      console.warn(
        `[@vaneui/md] preset conflict: ${label}.${key} is defined by more than one preset; last wins.`,
      );
    }
    seen.add(key);
    target[key] = value;
  }
}

/** Fold presets left-to-right into a single resolved bundle. */
export function mergePresets(...presets: MdPreset[]): ResolvedPreset {
  const nodes: Record<string, unknown> = {};
  const components: Record<string, unknown> = {};
  const tags: Record<string, unknown> = {};
  const functions: Record<string, unknown> = {};
  const variables: Record<string, unknown> = {};
  const registry: Record<string, unknown> = {};
  const styles: string[] = [];
  const transforms: MdTransform[] = [];
  let rendererTheme: MdRendererTheme | undefined;
  let highlight: HighlightFn | undefined;
  let sanitize: SanitizePolicy | undefined;

  const seenComponents = new Set<string>();
  const seenTags = new Set<string>();
  const seenFunctions = new Set<string>();
  const seenRegistry = new Set<string>();

  for (const preset of presets) {
    Object.assign(nodes, preset.nodes);
    Object.assign(variables, preset.variables);
    mergeKeyed(components, preset.components as Record<string, unknown> | undefined, seenComponents, "components");
    mergeKeyed(tags, preset.tags, seenTags, "tags");
    mergeKeyed(functions, preset.functions, seenFunctions, "functions");
    mergeKeyed(registry, preset.registry as Record<string, unknown> | undefined, seenRegistry, "registry");
    if (preset.rendererTheme) {
      rendererTheme = rendererTheme
        ? mergeRendererTheme(rendererTheme, preset.rendererTheme)
        : preset.rendererTheme;
    }
    if (preset.highlight) highlight = preset.highlight;
    if (preset.sanitize) sanitize = preset.sanitize;
    if (preset.transform) transforms.push(preset.transform);
    if (preset.styles) styles.push(preset.styles);
  }

  const config: MdConfig = {};
  if (Object.keys(nodes).length) config.nodes = nodes as MdNodesConfig;
  if (Object.keys(components).length) config.components = components as MdComponents;
  if (Object.keys(tags).length) config.tags = tags;
  if (Object.keys(functions).length) config.functions = functions;
  if (Object.keys(variables).length) config.variables = variables;

  return {
    components: Object.keys(registry).length ? (registry as ComponentRegistry) : undefined,
    rendererTheme,
    highlight,
    transform: composeTransforms(transforms),
    sanitize,
    config: Object.keys(config).length ? config : undefined,
    styles,
  };
}

function mergeConfigObjects(a?: MdConfig, b?: MdConfig): MdConfig | undefined {
  if (!a) return b;
  if (!b) return a;
  return {
    nodes: { ...a.nodes, ...b.nodes },
    components: { ...a.components, ...b.components },
    tags: { ...a.tags, ...b.tags },
    functions: { ...a.functions, ...b.functions },
    variables: { ...a.variables, ...b.variables },
  };
}

/**
 * Apply resolved preset values UNDER explicit `<Md>` props, so an explicit
 * prop always wins over a preset-supplied value. Transforms compose (preset
 * first, then the explicit prop).
 */
export function applyPresetProps(resolved: ResolvedPreset, props: MdProps): MdProps {
  const transforms = [resolved.transform, props.transform].filter(Boolean) as MdTransform[];
  return {
    ...props,
    components: props.components ?? resolved.components,
    rendererTheme: props.rendererTheme ?? resolved.rendererTheme,
    highlight: props.highlight ?? resolved.highlight,
    sanitize: props.sanitize ?? resolved.sanitize,
    transform: composeTransforms(transforms),
    config: mergeConfigObjects(resolved.config, props.config),
  };
}

/** A preset that applies a conservative sanitize policy for untrusted content. */
export const untrustedPreset: MdPreset = { sanitize: strictSanitizePolicy };
