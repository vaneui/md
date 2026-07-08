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

/**
 * Add a slug `id` to heading tags that lack one, derived from their text.
 * Targets the default heading renderer name (`MdHeading`); pass a different
 * `name` if you overrode the heading node's render target.
 */
export function headingAnchors(name = "MdHeading"): MdTransform {
  return (tree) => {
    visit(tree, name, (tag) => {
      if (tag.attributes.id) return;
      const text = textContent(tag.children as RenderableTreeNode);
      if (text) tag.attributes.id = slugify(text);
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
