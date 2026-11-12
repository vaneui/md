import { Tag, type RenderableTreeNode } from "@markdoc/markdoc";

/**
 * A post-transform hook. Runs on Markdoc's renderable tree after
 * `Markdoc.transform` and before rendering to React, so it can rewrite nodes
 * (add heading anchors, rewrite links, collect a table of contents, and so
 * on). Return the (possibly mutated) tree. Compose several by running them in
 * order; presets contribute transforms that merge into one chain.
 */
export type MdTransform = (tree: RenderableTreeNode) => RenderableTreeNode;

type TagTest = string | ((tag: Tag) => boolean);

/** Depth-first walk over the renderable tree, invoking `visitor` on matches. */
export function visit(
  node: RenderableTreeNode,
  test: TagTest,
  visitor: (tag: Tag) => void,
): void {
  if (Array.isArray(node)) {
    for (const child of node) visit(child, test, visitor);
    return;
  }
  if (!Tag.isTag(node)) return;
  const matches = typeof test === "string" ? node.name === test : test(node);
  if (matches) visitor(node);
  visit(node.children as RenderableTreeNode, test, visitor);
}

/** Compose transforms left-to-right into a single transform. */
export function composeTransforms(
  transforms: readonly MdTransform[],
): MdTransform | undefined {
  if (transforms.length === 0) return undefined;
  if (transforms.length === 1) return transforms[0];
  return (tree) => transforms.reduce((acc, t) => t(acc), tree);
}

/** The text a reader sees. Inline code has no children: its text is the `content` attribute. */
function textContent(node: RenderableTreeNode): string {
  if (typeof node === "string") return node;
  if (Array.isArray(node)) return node.map(textContent).join("");
  if (!Tag.isTag(node)) return "";
  if (node.children.length > 0) return textContent(node.children as RenderableTreeNode);
  const content: unknown = node.attributes?.content;
  return typeof content === "string" ? content : "";
}

/** Everything but letters, combining marks and digits of any script, `_`, whitespace and `-`. */
const NOT_SLUG_CHARACTER = /[^\p{L}\p{M}\p{N}_\s-]/gu;

/**
 * GitHub-style slug: lower case, punctuation dropped, whitespace and `_` to
 * `-`. Letters and digits of every script are kept, so `Привет мир` becomes
 * `привет-мир`. An ASCII heading gets the id it always got.
 */
function slugify(value: string): string {
  return value
    .toLowerCase()
    .trim()
    .replace(NOT_SLUG_CHARACTER, "")
    .replace(/[\s_]+/g, "-")
    .replace(/-+/g, "-");
}

export interface HeadingAnchorsOptions {
  /** Heading render name to match. Default `"MdHeading"`. */
  name?: string;
  /**
   * Slug function for the heading text, so a consumer can match its own anchor
   * convention (for example a docs site's existing table-of-contents ids).
   * Default: the built-in GitHub-style slugify, which keeps letters and digits
   * of every script. Repeats of the slug it returns still get `-1`, `-2`, ...
   */
  slug?: (text: string) => string;
  /**
   * When true, wrap the heading's content in a plain `<a href="#id">` so the
   * heading itself is clickable. Default false. Consumers that need a framework
   * link (for example `next/link`) or custom styling should keep their own
   * heading renderer instead of enabling this.
   */
  link?: boolean;
}

/**
 * Add a slug `id` to heading tags that lack one, derived from their text
 * (inline code included), and optionally wrap the heading content in a
 * self-anchor. An id is used once per document: a repeated slug gets `-1`,
 * `-2` and so on, counting the ids headings already carry. A heading whose
 * slug is empty gets no id. Targets the default heading renderer name
 * (`MdHeading`) unless `name` is given.
 */
export function headingAnchors(options: HeadingAnchorsOptions = {}): MdTransform {
  const { name = "MdHeading", slug = slugify, link = false } = options;
  return (tree) => {
    // Every id in use, with the number of suffixed copies handed out for it. New for each document.
    const used = new Map<string, number>();
    const unique = (base: string): string => {
      let id = base;
      while (used.has(id)) {
        const copies = (used.get(base) ?? 0) + 1;
        used.set(base, copies);
        id = `${base}-${copies}`;
      }
      used.set(id, used.get(id) ?? 0);
      return id;
    };

    visit(tree, name, (tag) => {
      const id: unknown = tag.attributes.id;
      if (typeof id === "string" && id !== "" && !used.has(id)) used.set(id, 0);
    });
    visit(tree, name, (tag) => {
      let id = tag.attributes.id as string | undefined;
      if (!id) {
        const text = textContent(tag.children as RenderableTreeNode);
        if (!text) return;
        const base = slug(text);
        if (!base) return;
        id = unique(base);
        tag.attributes.id = id;
      }
      if (link && id) {
        tag.children = [new Tag("a", { href: `#${id}` }, tag.children as RenderableTreeNode[])];
      }
    });
    return tree;
  };
}

/** Rewrite every link `href` through `fn` (default link renderer is `MdLink`). */
export function rewriteLinks(
  fn: (href: string) => string,
  name = "MdLink",
): MdTransform {
  return (tree) => {
    visit(tree, name, (tag) => {
      if (typeof tag.attributes.href === "string") {
        tag.attributes.href = fn(tag.attributes.href);
      }
    });
    return tree;
  };
}
