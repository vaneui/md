import React from "react";
import { ComponentKeys } from "@vaneui/ui";
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

// Props on a vaneui-fence component come from author-supplied YAML. Two levels
// decide what reaches the component:
//
// 1. The always-on floor. Nothing a fence can express may run script or inject
//    markup: `tag` is honoured only for an allow-list of inert elements;
//    `dangerouslySetInnerHTML`, `ref`, `srcDoc`, `httpEquiv` and every `on*`
//    prop are dropped in any spelling; URL-bearing props must not carry a
//    script-executing protocol. Every other prop passes, because an app's own
//    registry components take props this package cannot know.
// 2. Allow-list mode (`SanitizePolicy.knownPropsOnly`, on in
//    `strictSanitizePolicy`) for untrusted content: only known props pass.

/**
 * Element names the `tag` prop may take: text, heading, list, sectioning,
 * table and phrasing elements, none of which runs script, loads a resource by
 * itself or submits data. A policy's `allowedTags` replaces this list.
 */
const SAFE_TAGS: ReadonlySet<string> = new Set([
  // Sectioning and grouping
  "div", "p", "section", "article", "aside", "header", "footer", "main", "nav", "address", "hgroup", "search",
  "blockquote", "figure", "figcaption", "pre", "hr", "details", "summary",
  // Headings
  "h1", "h2", "h3", "h4", "h5", "h6",
  // Lists
  "ul", "ol", "li", "dl", "dt", "dd", "menu",
  // Tables
  "table", "caption", "colgroup", "col", "thead", "tbody", "tfoot", "tr", "th", "td",
  // Phrasing
  "a", "abbr", "b", "bdi", "bdo", "br", "cite", "code", "data", "del", "dfn", "em", "i", "ins", "kbd", "mark", "q",
  "rp", "rt", "ruby", "s", "samp", "small", "span", "strong", "sub", "sup", "time", "u", "var", "wbr",
  // Images
  "img", "picture",
]);

/**
 * Elements that run script, embed another document, add styles or change how
 * the page loads and resolves URLs. Never honoured as a `tag`, whatever a
 * policy's `allowedTags` lists.
 */
const NEVER_TAGS: ReadonlySet<string> = new Set([
  "script", "style", "iframe", "frame", "frameset", "object", "embed", "applet", "link", "meta", "base", "template",
  "noscript", "slot", "portal", "fencedframe", "html", "head", "body", "title", "svg", "math",
]);

/** Props dropped in any spelling, compared by `normalizeName`. */
const NEVER_PROPS: ReadonlySet<string> = new Set(["dangerouslysetinnerhtml", "ref", "srcdoc", "httpequiv"]);

/**
 * Attributes that pass in allow-list mode besides the `@vaneui/ui` boolean
 * props, `children`, `text` and `aria-*`: the content attributes the default
 * registry components take, a few inert layout and text attributes, and the
 * functional booleans of `Link`, `NavLink`, `Alert` and `Button`.
 */
const KNOWN_ATTRIBUTES: readonly string[] = [
  "href", "src", "alt", "title", "value", "max",
  "colSpan", "rowSpan", "scope", "width", "height", "target", "rel", "start", "reversed", "lang", "dir",
  "external", "active", "polite", "loading",
];

/** `target` values that pass in allow-list mode: a named target could load the link into a frame of the host page. */
const SAFE_TARGETS: ReadonlySet<string> = new Set(["_blank", "_self", "_parent", "_top"]);

const ARIA_ATTRIBUTE = /^aria-[a-z]+$/;

const URL_PROPS = new Set(["href", "src", "poster", "action", "formAction"]);
const DANGEROUS_PROTOCOL = /^\s*(?:javascript|vbscript):/i;
const NON_IMAGE_DATA_URL = /^\s*data:(?!image\/)/i;
const URL_SCHEME = /^\s*([a-z][a-z0-9+.-]*:)/i;

/**
 * Lower case, letters and digits only, so `srcDoc`, `srcdoc`, `SRCDOC` and
 * `http-equiv` compare equal to the React prop name. HTML attribute names are
 * case-insensitive, and React passes an unknown lower-case name through.
 */
const normalizeName = (name: string): string => name.toLowerCase().replace(/[^a-z0-9]/g, "");

/** A prop the floor always drops. `on*` follows React, which treats any such name as an event handler slot. */
function isNeverProp(key: string): boolean {
  if (key === "__proto__") return true;
  const name = normalizeName(key);
  return NEVER_PROPS.has(name) || (name.length > 2 && name.startsWith("on"));
}

/** The element name a `tag` value may render as (lower case), or `undefined` when it must be dropped. */
function safeTag(value: unknown, policy?: SanitizePolicy): string | undefined {
  if (typeof value !== "string") return undefined;
  const name = value.toLowerCase();
  if (NEVER_TAGS.has(name)) return undefined;
  const allowed = policy?.allowedTags ? policy.allowedTags.includes(name) : SAFE_TAGS.has(name);
  return allowed ? name : undefined;
}

let knownProps: ReadonlySet<string> | undefined;

/** Prop names that pass in allow-list mode, built on first use. */
function knownPropNames(): ReadonlySet<string> {
  if (!knownProps) {
    const names = new Set<string>(["children", "text", ...KNOWN_ATTRIBUTES]);
    for (const group of Object.values(ComponentKeys) as readonly (readonly string[])[]) {
      for (const key of group) names.add(key);
    }
    knownProps = names;
  }
  return knownProps;
}

/** Allow-list mode: whether a prop other than `tag` passes. */
function isKnownProp(key: string, value: unknown, policy: SanitizePolicy): boolean {
  if (policy.allowedProps?.includes(key)) return true;
  if (key === "children" || key === "text") return true;
  if (!knownPropNames().has(key) && !ARIA_ATTRIBUTE.test(key)) return false;
  // Attribute values are text, numbers or booleans; React would stringify anything else.
  if (typeof value === "function" || (typeof value === "object" && value !== null)) return false;
  if (key === "target") return SAFE_TARGETS.has(String(value).toLowerCase());
  return true;
}

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

/**
 * The props of a `vaneui`-fence component that may reach it. Applies the
 * always-on floor, then the optional `policy` (see `SanitizePolicy`). Returns
 * a new object; `tag` comes back as a lower-case element name.
 */
export function sanitizeSpecProps(
  props: Record<string, unknown>,
  policy?: SanitizePolicy,
): Record<string, unknown> {
  const safe: Record<string, unknown> = {};
  const allowListMode = policy?.knownPropsOnly === true;
  for (const [key, value] of Object.entries(props)) {
    if (isNeverProp(key)) continue;
    if (policy?.blockedProps?.includes(key)) continue;
    if (key === "tag") {
      if (allowListMode && !policy.allowedTags && !policy.allowedProps?.includes("tag")) continue;
      const tag = safeTag(value, policy);
      if (tag !== undefined) safe.tag = tag;
      continue;
    }
    if (allowListMode && !isKnownProp(key, value, policy)) continue;
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

/**
 * The component a registry holds under `name`, or `undefined`. Only the
 * registry's own entries count: a name from a fence can be `constructor`,
 * `toString` or `__proto__`, which every plain object inherits, and those are
 * not components.
 */
function registeredComponent(registry: ComponentRegistry, name: string): React.ElementType | undefined {
  if (!Object.prototype.hasOwnProperty.call(registry, name)) return undefined;
  const value: unknown = registry[name];
  const renderable =
    typeof value === "function" || (typeof value === "object" && value !== null) || (typeof value === "string" && value !== "");
  return renderable ? (value as React.ElementType) : undefined;
}

export interface RenderSpecOptions {
  /** React key for this node (usually the positional index from the parent). */
  key?: React.Key;
  /** Recursion depth. Do not set this yourself. */
  depth?: number;
  /** Optional policy on top of the always-on sanitize floor (see `SanitizePolicy`). */
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

  const Component = registeredComponent(registry, obj.component);
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
  // positional key supplied by the parent. `id` stays in `props`, so the
  // rendered component still receives it unless the policy drops it.
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
