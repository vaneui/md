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

describe('headingAnchors ids', () => {
  const ids = (content: string, options?: Parameters<typeof headingAnchors>[0]) =>
    Array.from(
      render(<Md content={content} transform={headingAnchors(options)} />).container.querySelectorAll('h1, h2, h3, h4, h5, h6'),
    ).map((heading) => heading.getAttribute('id'));

  // The slug this package shipped before it kept non-ASCII letters.
  const legacySlug = (value: string) =>
    value.toLowerCase().trim().replace(/[^\w\s-]/g, '').replace(/[\s_]+/g, '-').replace(/-+/g, '-');

  it.each([
    'Hello World',
    'Getting started',
    'API & SDK: v2.0 (beta)',
    'snake_case and kebab-case',
    'Step 1 - install',
    'What is new in 1.3.0?',
    'C++ / C# / F#',
    'Trailing punctuation!',
    'UPPER lower MiXeD',
    'a  b   c',
    '100% coverage',
    'Props, defaults & theming',
    "Don't repeat yourself",
    'one/two\\three',
  ])('keeps the id of an ASCII heading: %s', (title) => {
    expect(ids(`## ${title}`)).toEqual([legacySlug(title)]);
  });

  it('numbers repeated headings', () => {
    expect(ids('## Setup\n\n## Usage\n\n## Setup\n\n### Setup\n\n## Usage')).toEqual(['setup', 'usage', 'setup-1', 'setup-2', 'usage-1']);
  });

  it('never hands out an id twice, also when a heading is named like a numbered one', () => {
    const result = ids('## Setup\n\n## Setup\n\n## Setup 1\n\n## Setup\n\n## Setup 1');
    expect(result).toEqual(['setup', 'setup-1', 'setup-1-1', 'setup-2', 'setup-1-2']);
    expect(new Set(result).size).toBe(result.length);
  });

  it('reads the text of inline code', () => {
    expect(ids('## Using `useTheme` hook')).toEqual(['using-usetheme-hook']);
    expect(ids('## `<Md>`\n\n## `config.partials` and `tags`')).toEqual(['md', 'configpartials-and-tags']);
  });

  it('reads emphasis, strong text and link text', () => {
    expect(ids('## A *very* **bold** [link](/x) title')).toEqual(['a-very-bold-link-title']);
  });

  it.each([
    ['Cyrillic', 'Привет мир', 'привет-мир'],
    ['CJK', '你好 世界', '你好-世界'],
    ['Japanese', 'はじめに', 'はじめに'],
    ['accents', 'Café au lait', 'café-au-lait'],
    ['a decomposed accent', 'Cafe\u0301', 'cafe\u0301'],
    ['German', 'Größe ändern', 'größe-ändern'],
    ['Greek', 'Γειά σου', 'γειά-σου'],
    ['Arabic', 'مرحبا بالعالم', 'مرحبا-بالعالم'],
    ['digits of another script', 'Step ١٢', 'step-١٢'],
    ['mixed', 'Установка `npm` пакета', 'установка-npm-пакета'],
  ])('keeps letters and digits of any script: %s', (_name, title, id) => {
    expect(ids(`## ${title}`)).toEqual([id]);
  });

  it('numbers repeated headings in any script', () => {
    expect(ids('## Привет\n\n## Привет\n\n## 你好\n\n## 你好')).toEqual(['привет', 'привет-1', '你好', '你好-1']);
  });

  it('adds no id when nothing of the heading is left to slug', () => {
    expect(ids('## !!!\n\n## ???\n\n## 🚀')).toEqual([null, null, null]);
  });

  it('keeps an id set in the document and counts it', () => {
    expect(ids('## Setup {% #setup %}\n\n## Setup')).toEqual(['setup', 'setup-1']);
    expect(ids('## Setup\n\n## Other {% #setup %}')).toEqual(['setup-1', 'setup']);
    expect(ids('## Setup {% #custom %}\n\n## Setup')).toEqual(['custom', 'setup']);
  });

  it('numbers repeats of a custom slug', () => {
    const slug = (text: string) => `x-${text.length}`;
    expect(ids('## abc\n\n## def\n\n## ab', { slug })).toEqual(['x-3', 'x-3-1', 'x-2']);
  });

  it('links each heading to its own id', () => {
    const { container } = render(<Md content={'## Setup\n\n## Setup'} transform={headingAnchors({ link: true })} />);
    const headings = Array.from(container.querySelectorAll('h2'));
    expect(headings.map((heading) => heading.querySelector('a')?.getAttribute('href'))).toEqual(['#setup', '#setup-1']);
    expect(headings.map((heading) => heading.id)).toEqual(['setup', 'setup-1']);
  });

  it('counts per document, so one transform gives the same ids on every render', () => {
    const transform = headingAnchors();
    const first = render(<Md content={'## Setup\n\n## Setup'} transform={transform} />).container;
    const second = render(<Md content={'## Setup\n\n## Setup'} transform={transform} />).container;
    const read = (container: HTMLElement) => Array.from(container.querySelectorAll('h2')).map((heading) => heading.id);
    expect(read(first)).toEqual(['setup', 'setup-1']);
    expect(read(second)).toEqual(['setup', 'setup-1']);
  });
});
