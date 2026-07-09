import React from 'react';
import { render } from '@testing-library/react';
import Markdoc from '@markdoc/markdoc';
import { Md } from '../components/md';
import { defaultNodesConfig } from '../config/default-config';
import { headingAnchors, rewriteLinks, visit, composeTransforms } from '../transform';

describe('post-transform hook', () => {
  it('headingAnchors adds a slug id to headings', () => {
    const { container } = render(<Md content={'# Hello World'} transform={headingAnchors()} />);
    const heading = container.querySelector('[id="hello-world"]');
    expect(heading).toBeInTheDocument();
    expect(heading?.textContent).toContain('Hello World');
  });

  it('headingAnchors accepts a custom slug function', () => {
    const slug = (t: string) => 'x-' + t.toLowerCase().replace(/\s+/g, '_');
    const { container } = render(<Md content={'# Hello World'} transform={headingAnchors({ slug })} />);
    expect(container.querySelector('[id="x-hello_world"]')).toBeInTheDocument();
  });

  it('headingAnchors link mode wraps the heading content in a self-anchor', () => {
    const { container } = render(<Md content={'# Hello World'} transform={headingAnchors({ link: true })} />);
    const heading = container.querySelector('[id="hello-world"]');
    expect(heading).toBeInTheDocument();
    const anchor = heading?.querySelector('a[href="#hello-world"]');
    expect(anchor).toBeInTheDocument();
    expect(anchor?.textContent).toContain('Hello World');
  });

  it('rewriteLinks rewrites hrefs before render', () => {
    const { container } = render(
      <Md content={'[link](/old)'} transform={rewriteLinks((h) => h.replace('/old', '/new'))} />,
    );
    expect(container.querySelector('a')).toHaveAttribute('href', '/new');
  });

  it('composeTransforms runs transforms in order', () => {
    const composed = composeTransforms([
      headingAnchors(),
      rewriteLinks((h) => `${h}?x=1`),
    ])!;
    const { container } = render(<Md content={'# Title\n\n[a](/p)'} transform={composed} />);
    expect(container.querySelector('[id="title"]')).toBeInTheDocument();
    expect(container.querySelector('a')).toHaveAttribute('href', '/p?x=1');
  });

  it('visit walks the renderable tree and finds tags by name', () => {
    const tree = Markdoc.transform(Markdoc.parse('# A\n\n# B'), { nodes: defaultNodesConfig as any });
    const levels: number[] = [];
    visit(tree, 'MdHeading', (t) => levels.push(Number(t.attributes.level)));
    expect(levels).toHaveLength(2);
  });

  it('composeTransforms returns undefined for an empty list', () => {
    expect(composeTransforms([])).toBeUndefined();
  });
});
