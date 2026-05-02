import React from "react";

export interface ComponentSpec {
  component: string;
  text?: string;
  children?: ComponentSpec[] | string;
  [prop: string]: unknown;
}

export type ComponentRegistry = Record<string, React.ComponentType<any>>;

const MAX_DEPTH = 16;

const SHORTHAND_HEAD = /^[A-Z]/;

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

export function renderSpec(
  spec: unknown,
  registry: ComponentRegistry,
  key?: React.Key,
  depth = 0
): React.ReactNode {
  if (depth > MAX_DEPTH) return null;
  if (depth === 0) spec = expandShorthand(spec);
  if (spec == null) return null;
  if (typeof spec === "string") return spec;
  if (typeof spec !== "object" || Array.isArray(spec)) return null;

  const obj = spec as ComponentSpec;
  if (typeof obj.component !== "string") return null;

  const Component = registry[obj.component];
  if (!Component) return null;

  const { component: _ignored, text, children, ...props } = obj;
  void _ignored;

  let resolvedChildren: React.ReactNode = null;
  if (Array.isArray(children)) {
    resolvedChildren = children.map((c, i) => renderSpec(c, registry, i, depth + 1));
  } else if (typeof children === "string") {
    resolvedChildren = children;
  } else if (typeof text === "string") {
    resolvedChildren = text;
  }

  return React.createElement(Component, { ...props, key }, resolvedChildren);
}
