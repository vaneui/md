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

function textContent(node: RenderableTreeNode): string {
  if (typeof node === "string") return node;
  if (Array.isArray(node)) return node.map(textContent).join("");
  if (Tag.isTag(node)) return textContent(node.children as RenderableTreeNode);
  return "";
}

function slugify(value: string): string {
  return value
    .toLowerCase()
    .trim()
    .replace(/[^\w\s-]/g, "")
    .replace(/[\s_]+/g, "-")
    .replace(/-+/g, "-");
}

export interface HeadingAnchorsOptions {
  /** Heading render name to match. Default `"MdHeading"`. */
  name?: string;
  /**
   * Slug function for the heading text, so a consumer can match its own anchor
   * convention (for example a docs site's existing table-of-contents ids).
   * Default: the built-in GitHub-style slugify.
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
 * Add a slug `id` to heading tags that lack one, derived from their text, and
 * optionally wrap the heading content in a self-anchor. Targets the default
 * heading renderer name (`MdHeading`) unless `name` is given.
 */
export function headingAnchors(options: HeadingAnchorsOptions = {}): MdTransform {
  const { name = "MdHeading", slug = slugify, link = false } = options;
  return (tree) => {
    visit(tree, name, (tag) => {
      let id = tag.attributes.id as string | undefined;
      if (!id) {
        const text = textContent(tag.children as RenderableTreeNode);
        if (!text) return;
        id = slug(text);
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
