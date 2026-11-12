/**
 * Optional policy for the props of `vaneui`-fence components.
 *
 * Without a policy the always-on floor applies (see `sanitizeSpecProps`):
 * nothing a fence can express may run script or inject markup, and every other
 * prop passes, so trusted documents can style and configure their components.
 * A policy tightens that for untrusted content, and `allowedProps` /
 * `allowedTags` let an app re-open single props on purpose. No policy can
 * switch the floor off.
 */
export interface SanitizePolicy {
  /** Allowed URL schemes, lowercase with the colon (e.g. `"https:"`); others are dropped, relative URLs always pass. */
  allowedProtocols?: string[];
  /** Extra prop names to strip beyond the floor. Wins over `allowedProps`. */
  blockedProps?: string[];
  /** If set, only these component names may render; others become nothing. */
  allowComponents?: string[];
  /**
   * Prop allow-list mode. When true, only known props pass: the boolean props
   * of `@vaneui/ui` (`ComponentKeys`), `children`, `text`, `href`, `src`,
   * `alt`, `title`, `value`, `max`, `aria-*`, a short list of inert attributes
   * (`colSpan`, `rowSpan`, `scope`, `width`, `height`, `target`, `rel`,
   * `start`, `reversed`, `lang`, `dir`) and the functional booleans of the
   * default registry components (`external`, `active`, `polite`, `loading`).
   * Their values must be strings, numbers or booleans, and `target` must be
   * `_blank`, `_self`, `_parent` or `_top`. `tag`, `style`, `className`, `id`
   * and every unknown prop are dropped. A spec's `id` still keys its element.
   */
  knownPropsOnly?: boolean;
  /**
   * Extra prop names that pass in allow-list mode (`knownPropsOnly`), with any
   * value: for example `["className"]`, or the props of your own registry
   * components. Listing `"tag"` re-enables the `tag` prop with the built-in
   * safe element list. The floor still applies to every name listed here.
   */
  allowedProps?: string[];
  /**
   * Element names (lower case) the `tag` prop may take. Replaces the built-in
   * safe list, so it can narrow it or add to it (a `form`, a custom element),
   * and re-enables `tag` in allow-list mode. Elements that run script, embed
   * documents or change how the page loads (`script`, `style`, `iframe`,
   * `object`, `embed`, `link`, `meta`, `base`, `template`, `svg`, `math` and
   * the like) are never honoured, even when listed.
   */
  allowedTags?: string[];
}

/**
 * The policy for user- or AI-authored fence content: prop allow-list mode
 * (`knownPropsOnly`), and only common navigation schemes on URL props.
 * Spread it to widen it on purpose:
 * `{ ...strictSanitizePolicy, allowedProps: ["className"] }`.
 */
export const strictSanitizePolicy: SanitizePolicy = {
  allowedProtocols: ["http:", "https:", "mailto:", "tel:"],
  knownPropsOnly: true,
};
