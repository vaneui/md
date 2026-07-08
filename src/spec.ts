import React from "react";
import type { SanitizePolicy } from "./sanitize";

export interface ComponentSpec {
  component: string;
  /**
   * Stable node identity. When present it's used as the React key (so an
   * editor can reorder/add/remove nodes without remounting subtrees), and it
   * is ALSO passed through to the component as an `id` prop.
   */
  id?: string | number;
  text?: string;
  children?: ComponentSpec[] | string;
  [prop: string]: unknown;
}

export type ComponentRegistry = Record<string, React.ComponentType<any>>;

const MAX_DEPTH = 16;

const SHORTHAND_HEAD = /^[A-Z]/;

// Props on a vaneui-fence component come from author-supplied YAML. Strip the
// handful that could inject markup or behavior when the content is untrusted:
// dangerouslySetInnerHTML, event handlers, and ref cannot be legitimately
// expressed in YAML-authored content, and URL-bearing props must not carry
// script-executing protocols. This is an always-on floor; a configurable
// policy can tighten it further.
const URL_PROPS = new Set(["href", "src", "poster", "action", "formAction"]);
const DANGEROUS_PROTOCOL = /^\s*(?:javascript|vbscript):/i;
const NON_IMAGE_DATA_URL = /^\s*data:(?!image\/)/i;
const URL_SCHEME = /^\s*([a-z][a-z0-9+.-]*:)/i;

function isSafeUrl(value: unknown, policy?: SanitizePolicy): boolean {
  if (typeof value !== "string") return true;
  if (DANGEROUS_PROTOCOL.test(value) || NON_IMAGE_DATA_URL.test(value)) return false;
  if (policy?.allowedProtocols) {
    const match = URL_SCHEME.exec(value);
    // Scheme-less (relative) URLs are always allowed; a scheme must be listed.
    if (match && !policy.allowedProtocols.includes(match[1].toLowerCase())) return false;
  }
  return true;
}

export function sanitizeSpecProps(
  props: Record<string, unknown>,
  policy?: SanitizePolicy,
): Record<string, unknown> {
  const safe: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(props)) {
    if (key === "dangerouslySetInnerHTML" || key === "ref") continue;
    if (/^on[A-Z]/.test(key)) continue;
    if (policy?.blockedProps?.includes(key)) continue;
    if (URL_PROPS.has(key) && !isSafeUrl(value, policy)) continue;
    safe[key] = value;
  }
  return safe;
}

export function expandShorthand(node: unknown): unknown {
  if (node == null || typeof node !== "object") return node;
  if (Array.isArray(node)) return node.map(expandShorthand);

  const obj = node as Record<string, unknown>;
  const entries = Object.entries(obj);

  if ("component" in obj) {
    return Object.fromEntries(entries.map(([k, v]) => [k, expandShorthand(v)]));
  }

  if (entries.length === 1) {
    const [key, value] = entries[0];
    const tokens = key.trim().split(/\s+/);
    if (tokens.length > 0 && SHORTHAND_HEAD.test(tokens[0])) {
      const [component, ...flags] = tokens;
      const spec: Record<string, unknown> = { component };
      for (const flag of flags) spec[flag] = true;

      if (value == null) {
        // No content
      } else if (typeof value === "string") {
        spec.children = value;
      } else if (Array.isArray(value)) {
        spec.children = value.map(expandShorthand);
      } else if (typeof value === "object") {
        Object.assign(spec, expandShorthand(value));
      }
      return spec;
    }
  }

  return Object.fromEntries(entries.map(([k, v]) => [k, expandShorthand(v)]));
}

export interface RenderSpecOptions {
  /** React key for this node (usually the positional index from the parent). */
  key?: React.Key;
  /** Recursion depth. Do not set this yourself. */
  depth?: number;
  /** Optional policy that tightens the always-on sanitize floor. */
  sanitize?: SanitizePolicy;
}

export function renderSpec(
  spec: unknown,
  registry: ComponentRegistry,
  options: RenderSpecOptions = {},
): React.ReactNode {
  const { key, sanitize } = options;
  const depth = options.depth ?? 0;
  if (depth > MAX_DEPTH) return null;
  if (depth === 0) spec = expandShorthand(spec);
  if (spec == null) return null;
  if (typeof spec === "string") return spec;
  if (typeof spec !== "object" || Array.isArray(spec)) return null;

  const obj = spec as ComponentSpec;
  if (typeof obj.component !== "string") return null;
  if (sanitize?.allowComponents && !sanitize.allowComponents.includes(obj.component)) {
    return null;
  }

  const Component = registry[obj.component];
  if (!Component) return null;

  const { component: _ignored, text, children, ...props } = obj;
  void _ignored;
  const safeProps = sanitizeSpecProps(props, sanitize);

  let resolvedChildren: React.ReactNode = null;
  if (Array.isArray(children)) {
    resolvedChildren = children.map((c, i) =>
      renderSpec(c, registry, { key: i, depth: depth + 1, sanitize }),
    );
  } else if (typeof children === "string") {
    resolvedChildren = children;
  } else if (typeof text === "string") {
    resolvedChildren = text;
  }

  // Prefer the spec's own stable id as the React key; fall back to the
  // positional key supplied by the parent. `id` stays in `props` so the
  // rendered component still receives it.
  const reactKey = obj.id != null ? String(obj.id) : key;
  return React.createElement(Component, { ...safeProps, key: reactKey }, resolvedChildren);
}

/**
 * Inverse of `expandShorthand`: turn a verbose `ComponentSpec` back into the
 * compact shorthand YAML shape, so an editor can serialize an edited tree to
 * a `vaneui` fence. `expandShorthand(collapseShorthand(spec))` reproduces the
 * spec.
 *
 * - Boolean-`true` props fold into the key (`Card` + `primary` → `"Card primary"`).
 * - Non-boolean props (and a stable `id`) force the map value form.
 * - Content is emitted as the shorthand string / list value, which expands
 *   back to `children`. A leaf with no content becomes a `null` value.
 */
export function collapseShorthand(spec: ComponentSpec): Record<string, unknown> {
  const { component, id, text, children, ...props } = spec;

  const flags: string[] = [];
  const nonBool: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(props)) {
    if (v === true) flags.push(k);
    else nonBool[k] = v;
  }
  const head = [component, ...flags].join(" ");

  const collapsedChildren = Array.isArray(children)
    ? children.map((c) => collapseShorthand(c as ComponentSpec))
    : children;
  const content =
    collapsedChildren !== undefined
      ? collapsedChildren
      : typeof text === "string"
        ? text
        : undefined;

  // No non-boolean props and no id → pure shorthand (bare value).
  if (Object.keys(nonBool).length === 0 && id == null) {
    return { [head]: content ?? null };
  }

  // Otherwise the map value form carries props + id + children.
  const value: Record<string, unknown> = { ...nonBool };
  if (id != null) value.id = id;
  if (content !== undefined) value.children = content;
  return { [head]: value };
}
