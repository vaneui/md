// Shared by the client and server sanitize tests: `vaneui` fence payloads that
// must never inject markup or run script, with or without a sanitize policy.

/** A `vaneui` fence around a YAML body. */
export const fence = (yaml: string): string => ['```vaneui', yaml, '```'].join('\n');

export interface FencePayload {
  name: string;
  yaml: string;
  /** A prop that stays (it is inert) makes React log a development warning. */
  warns?: boolean;
}

/** Element names the `tag` prop must never produce, in the casings a fence can spell them. */
export const FORBIDDEN_TAGS: readonly string[] = [
  'script', 'SCRIPT', 'Script',
  'style', 'iframe', 'IFRAME', 'frame', 'frameset', 'object', 'embed', 'applet',
  'link', 'meta', 'base', 'template', 'noscript', 'svg', 'math',
  'form', 'input', 'button', 'textarea', 'select', 'option', 'fieldset',
];

/** Object.prototype keys: a lookup into a plain object would find a value for each. */
export const INHERITED_KEYS: readonly string[] = ['constructor', 'toString', '__proto__', 'valueOf', 'hasOwnProperty'];

export const PAYLOADS: readonly FencePayload[] = [
  { name: 'script element through tag', yaml: 'Text:\n  tag: script\n  children: "alert(document.domain)"' },
  { name: 'iframe with srcDoc', yaml: 'Card:\n  tag: iframe\n  srcDoc: "<script>alert(1)</script>"' },
  { name: 'srcdoc in lower case', yaml: 'Card:\n  srcdoc: "<script>alert(1)</script>"' },
  { name: 'srcDoc in upper case', yaml: 'Card:\n  SRCDOC: "<script>alert(1)</script>"' },
  { name: 'style element through tag', yaml: 'Text:\n  tag: style\n  children: "body { display: none }"' },
  { name: 'meta refresh', yaml: 'Text:\n  tag: meta\n  httpEquiv: refresh\n  content: "0;url=https://evil.example"' },
  { name: 'meta refresh, attribute spelling', yaml: 'Text:\n  tag: meta\n  http-equiv: refresh\n  content: "0;url=https://evil.example"' },
  { name: 'httpEquiv on a default element', yaml: 'Text:\n  httpEquiv: refresh\n  HTTP-EQUIV: refresh\n  children: x' },
  { name: 'base element through tag', yaml: 'Text:\n  tag: base\n  href: https://evil.example/' },
  // The `action` stays as an inert attribute of the <div>, which React warns about.
  { name: 'form with an action', yaml: 'Card:\n  tag: form\n  action: https://evil.example/steal', warns: true },
  { name: 'event handlers in any casing', yaml: 'Card:\n  onClick: "alert(1)"\n  onclick: "alert(2)"\n  ONLOAD: "alert(3)"\n  OnError: "alert(4)"\n  children: x' },
  { name: 'dangerouslySetInnerHTML', yaml: 'Card:\n  dangerouslySetInnerHTML:\n    __html: "<img src=x onerror=alert(1)>"' },
  { name: 'props smuggled under __proto__', yaml: 'Card:\n  __proto__:\n    dangerouslySetInnerHTML:\n      __html: "<img src=x onerror=alert(1)>"\n    tag: script\n  children: x' },
  ...FORBIDDEN_TAGS.map((tag) => ({ name: `tag: ${tag}`, yaml: `Text:\n  tag: ${tag}\n  children: x` })),
];

/** Elements no payload may produce (lower case; compare against lower-cased markup). */
export const FORBIDDEN_ELEMENTS: readonly string[] = [...new Set(FORBIDDEN_TAGS.map((tag) => tag.toLowerCase())), 'img'];

/** Attributes no payload may produce (lower case). */
export const FORBIDDEN_ATTRIBUTES = /^(?:srcdoc|http-equiv|httpequiv|on.+)$/;
