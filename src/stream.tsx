import Markdoc, { type RenderableTreeNode, type RenderableTreeNodes } from "@markdoc/markdoc";
import React from "react";
import { finishMd, isPlainData, prepareMd, renderTree } from "./components/md";
import { withProviders } from "./components/md-client";
import { RendererThemeContext } from "./context";
import type { MdRenderContext } from "./renderContext";
import { splitBlocks } from "./splitBlocks";
import type { MdProps } from "./types";

/** The top-level blocks of streaming Markdown (see `splitBlocks`), split again only when `content` changes. */
export function useMdStream(content: string): string[] {
  return React.useMemo(() => splitBlocks(content), [content]);
}

/** Nesting past which two values count as different, so data that refers to itself cannot loop. */
const MAX_COMPARE_DEPTH = 200;

/**
 * Whether two values render the same: arrays, plain objects and Markdoc tags
 * are equal when their contents are, anything else (functions, components,
 * React elements, class instances) only when it is the same object.
 */
function sameValue(a: unknown, b: unknown, depth = 0): boolean {
  if (Object.is(a, b)) return true;
  if (typeof a !== "object" || typeof b !== "object" || a === null || b === null) return false;
  if (depth > MAX_COMPARE_DEPTH) return false;
  if (Array.isArray(a) || Array.isArray(b)) {
    if (!Array.isArray(a) || !Array.isArray(b) || a.length !== b.length) return false;
    return a.every((item, index) => sameValue(item, b[index], depth + 1));
  }
  const isTag = Object.getPrototypeOf(a) === Markdoc.Tag.prototype;
  if (isTag ? Object.getPrototypeOf(b) !== Markdoc.Tag.prototype : !isPlainData(a) || !isPlainData(b)) return false;
  const left = a as Record<string, unknown>;
  const right = b as Record<string, unknown>;
  const keys = Object.keys(left);
  if (keys.length !== Object.keys(right).length) return false;
  return keys.every(
    (key) => Object.prototype.hasOwnProperty.call(right, key) && sameValue(left[key], right[key], depth + 1),
  );
}

/** The value from an earlier render while the new one has the same content, so memoized blocks see no change. */
function useSame<T>(value: T): T {
  const ref = React.useRef(value);
  if (!sameValue(ref.current, value)) ref.current = value;
  return ref.current;
}

interface BlockProps {
  node: RenderableTreeNode;
  mdContext: MdRenderContext;
  components: Record<string, unknown>;
}

/** One top-level block of the document. Renders again only when its part of the transformed tree changed. */
const Block = React.memo(
  function Block({ node, mdContext, components }: BlockProps) {
    const rendered = renderTree(node, mdContext, components);
    // `<Md>` drops plain data among the children of an element; a block that is plain data renders nothing too.
    return isPlainData(rendered) ? null : rendered;
  },
  (previous, next) =>
    previous.mdContext === next.mdContext &&
    previous.components === next.components &&
    sameValue(previous.node, next.node),
);

/** The document of `<Md>`, with each top-level block behind its own memo. */
function renderBlocks(
  tree: RenderableTreeNodes,
  mdContext: MdRenderContext,
  components: Record<string, unknown>,
): React.ReactNode {
  const block = (node: RenderableTreeNode, index: number) => (
    <Block key={index} node={node} mdContext={mdContext} components={components} />
  );
  // A document node without a renderer transforms to the list of its blocks.
  if (Array.isArray(tree)) return <>{tree.map(block)}</>;
  if (Markdoc.Tag.isTag(tree) && Array.isArray(tree.children)) {
    // Markdoc's renderer passes children that are not tags through unchanged, so the
    // wrapper element is created exactly as in `<Md>`, around the memoized blocks.
    const blocks = tree.children.map(block) as unknown as RenderableTreeNode[];
    return renderTree(new Markdoc.Tag(tree.name, tree.attributes, blocks), mdContext, components);
  }
  return renderTree(tree, mdContext, components);
}

/**
 * Streaming `<Md>`: renders growing Markdown as one document, so the output is
 * the same as `<Md>` for the same source. Every update parses and transforms
 * the whole source, and React renders again only the top-level blocks whose
 * transformed content changed.
 */
export const MdStream: React.FC<MdProps> = (props) => {
  const inheritedTheme = React.useContext(RendererThemeContext);
  const prepared = prepareMd(props, inheritedTheme);
  // Props such as `rendererTheme` and `config` are often new objects with the same content on every render.
  const mdContext = useSame(prepared.mdContext);
  const components = useSame(prepared.components);
  return finishMd({ ...prepared, mdContext }, renderBlocks(prepared.tree, mdContext, components), withProviders);
};
