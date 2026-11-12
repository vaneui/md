import React from 'react';
import { act, render } from '@testing-library/react';
import { Md as ServerMd } from '../components/md';
import { Md } from '../client';
import type { MdProps } from '../types';
import { MdStream, useMdStream } from '../stream';
import { splitBlocks } from '../splitBlocks';
import { RendererThemeContext } from '../context';
import { defaultRendererTheme } from '../rendererTheme';
import { defaultRegistry } from '../registry';
import { parseYamlFrontmatter } from '../yaml';
import { headingAnchors } from '../transform';
import { untrustedPreset } from '../preset';
import { fence } from './fencePayloads';

describe('splitBlocks', () => {
  it('splits on blank lines', () => {
    expect(splitBlocks('a\n\nb')).toEqual(['a', 'b']);
  });

  it('does not split inside a fenced code block', () => {
    const src = 'a\n\n```js\ncode\n\nmore\n```\n\nb';
    expect(splitBlocks(src)).toEqual(['a', '```js\ncode\n\nmore\n```', 'b']);
  });

  it('keeps an unterminated (still streaming) fence as one trailing block', () => {
    expect(splitBlocks('```js\ncode')).toEqual(['```js\ncode']);
  });

  it('returns no block for empty or blank input', () => {
    expect(splitBlocks('')).toEqual([]);
    expect(splitBlocks('\n\n  \n')).toEqual([]);
  });

  it('keeps a loose list, a multi-paragraph quote and a table as one block each', () => {
    const list = '1. one\n\n2. two\n\n   still two\n\n3. three';
    const quote = '> first\n>\n> second';
    const table = '| a | b |\n|---|---|\n| 1 | 2 |';
    expect(splitBlocks([list, quote, table].join('\n\n'))).toEqual([list, quote, table]);
  });

  it('keeps a tag and the content it wraps as one block', () => {
    const conditional = '{% if $show %}\n\nShown.\n\nAlso shown.\n\n{% /if %}';
    expect(splitBlocks(`Before.\n\n${conditional}\n\nAfter.`)).toEqual(['Before.', conditional, 'After.']);
  });

  it('keeps everything after an unclosed tag in its block, but not after an include or a partial', () => {
    expect(splitBlocks('Before.\n\n{% if $show %}\n\nShown.\n\nMore.')).toEqual(['Before.', '{% if $show %}\n\nShown.\n\nMore.']);
    expect(splitBlocks('{% include "x.md" %}\n\nA.\n\n{% partial file="p" %}\n\nB.')).toEqual([
      '{% include "x.md" %}', 'A.', '{% partial file="p" %}', 'B.',
    ]);
  });

  it('separates blocks that follow each other without a blank line', () => {
    expect(splitBlocks('# Title\nText\n```js\ncode\n```\nMore')).toEqual(['# Title', 'Text', '```js\ncode\n```', 'More']);
  });

  it('keeps the frontmatter as the first block and link definitions with the block before them', () => {
    expect(splitBlocks('---\ntitle: T\n---\n\n# A\n\nSee [docs][d].\n\n[d]: /docs\n\nEnd.')).toEqual([
      '---\ntitle: T\n---', '# A', 'See [docs][d].\n\n[d]: /docs', 'End.',
    ]);
  });

  it('returns exact slices of the source, CRLF line ends included', () => {
    const src = 'a\r\nb\r\n\r\n- x\r\n\r\n- y\r\n\r\nend\r\n';
    expect(splitBlocks(src)).toEqual(['a\r\nb', '- x\r\n\r\n- y', 'end']);
  });

  it('splits 5,000 blocks in well under a second', () => {
    const src = Array.from({ length: 5000 }, (_, i) => `Paragraph ${i} with *some* text.`).join('\n\n');
    const start = performance.now();
    expect(splitBlocks(src)).toHaveLength(5000);
    expect(performance.now() - start).toBeLessThan(1000);
  });
});

describe('useMdStream', () => {
  it('returns the top-level blocks of the content', () => {
    let blocks: string[] = [];
    const Probe = ({ content }: { content: string }) => {
      blocks = useMdStream(content);
      return null;
    };
    render(<Probe content={'1. one\n\n2. two\n\nAfter.'} />);
    expect(blocks).toEqual(['1. one\n\n2. two', 'After.']);
  });
});

describe('MdStream', () => {
  it('renders every complete block', () => {
    const { container } = render(<MdStream content={'# A\n\n# B'} />);
    expect(container.querySelectorAll('h1')).toHaveLength(2);
    expect(container.textContent).toContain('A');
    expect(container.textContent).toContain('B');
  });

  it('renders appended content after the stream grows', () => {
    const { container, rerender } = render(<MdStream content={'# A'} />);
    expect(container.querySelectorAll('h1')).toHaveLength(1);
    rerender(<MdStream content={'# A\n\n# B\n\n# C'} />);
    expect(container.querySelectorAll('h1')).toHaveLength(3);
    expect(container.textContent).toContain('C');
  });
});

// One source per feature that used to render differently when every
// blank-line block was its own document.
const CODE = '```js\nconst a = 1;\n\nconst b = 2;\n```';
const TABLE = '| Name | Value |\n|------|-------|\n| a | 1 |\n| b | 2 |';
const parity: Array<[name: string, content: string, props?: Partial<MdProps>]> = [
  ['a loose ordered list', 'Steps:\n\n1. one\n\n2. two\n\n3. three\n\nDone.'],
  ['a loose ordered list that starts at 5', '5. five\n\n6. six'],
  ['a nested loose list', '- a\n\n  - a1\n\n  - a2\n\n- b'],
  ['a quote of several paragraphs', '> first\n>\n> second\n\nAfter.'],
  ['a false condition', 'Before.\n\n{% if $show %}\n\nHidden.\n\nAlso hidden.\n\n{% /if %}\n\nAfter.', { config: { variables: { show: false } } }],
  ['a true condition with an else branch', '{% if $show %}\n\nShown.\n\n{% else /%}\n\nHidden.\n\n{% /if %}\n\nAfter.', { config: { variables: { show: true } } }],
  ['a reference link defined at the end', 'See the [docs][d] and [the site].\n\nMore text.\n\n[d]: https://example.com/docs "Docs"\n[the site]: https://example.com'],
  ['frontmatter variables', '---\ntitle: Get started\nauthor: Jane\n---\n\n# {% $markdoc.frontmatter.title %}\n\nBy {% $markdoc.frontmatter.author %}.\n\nRaw: {% $markdoc.frontmatterRaw %}', { parseFrontmatter: parseYamlFrontmatter }],
  ['a frontmatter prop', '# {% $markdoc.frontmatter.title %}\n\nBy {% $markdoc.frontmatter.author %}.', { frontmatter: { title: 'T', author: 'A' } }],
  ['a frontmatter parse error', '---\ntitle: [unclosed\n---\n\n# Title\n\nBody.', { parseFrontmatter: parseYamlFrontmatter }],
  ['fences', `Intro.\n\n${CODE}\n\n~~~\nplain\n\ntext\n~~~\n\nOutro.`],
  ['a highlighted fence', `${CODE}\n\nOutro.`, { highlight: (code, language) => <code data-language={language}>{code.toUpperCase()}</code> }],
  ['tables', `Intro.\n\n${TABLE}\n\nBetween.\n\n${TABLE}`],
  ['partials', '# Page\n\n{% partial file="note.md" /%}\n\nInline {% partial file="word.md" /%} use.\n\n{% partial file="missing.md" /%}\n\nEnd.', { config: { partials: { 'note.md': 'A note.\n\nIn two paragraphs.', 'word.md': 'partial' } } }],
  ['a vaneui fence', `Intro.\n\n${fence('Card primary:\n  - Title: Welcome\n  - Text: Body')}\n\nOutro.`, { parseFrontmatter: parseYamlFrontmatter, components: defaultRegistry }],
  ['a vaneui fence under the untrusted preset', `${fence('Card:\n  className: x\n  children: Body')}\n\nOutro.`, { parseFrontmatter: parseYamlFrontmatter, components: defaultRegistry, presets: [untrustedPreset] }],
  ['a preset with styles', '# A\n\nText.', { presets: [{ styles: '.x { color: red }' }] }],
  ['a transform hook over the whole document', '# Setup\n\nText.\n\n## Setup\n\n## Other', { transform: headingAnchors({ link: true }) }],
  ['headings, rules and inline marks', '# One\ntext right under\n\n---\n\nSome *em*, **strong**, `code`, ~~s~~ and a [link](/x).\n\n![alt](/img.png "t")'],
  ['an unexpanded include', 'Before.\n\n{% include "x.md" %}\n\nInside.\n\n{% /include %}\n\nAfter.'],
  ['a tag syntax error and a tag left open', 'Before.\n\nBroken {% if= %} tag, {% for item in items %} and {% endfor %}.\n\n{% foo bar= %}\n\nAfter.'],
  ['an unclosed block tag', 'Before.\n\n{% if $show %}\n\nShown.\n\nMore.', { config: { variables: { show: true } } }],
  ['a custom renderer and a renderer theme', '# A\n\n> quote\n\ntext with `code`', { rendererTheme: { mdCode: { primary: true }, mdBlockquote: { success: true } }, config: { components: { MdHeading: (props: { children?: React.ReactNode }) => <h1 className="custom">{props.children}</h1> } } }],
  ['a document node without a wrapper', '# A\n\nText.\n\nMore.', { config: { nodes: { document: { children: ['heading', 'paragraph'] } } } }],
  ['an empty document', ''],
  ['blank lines only', '\n\n\n'],
];

describe('MdStream renders the same document as <Md>', () => {
  const dom = (ui: React.ReactElement) => render(ui).container;

  // Attribute order aside: React adds an attribute that appears on a later render after the existing ones.
  const expectSameDom = (received: HTMLElement, expected: HTMLElement) => {
    if (!received.isEqualNode(expected)) expect(received.innerHTML).toBe(expected.innerHTML);
  };

  test.each(parity)('%s', (_name, content, props = {}) => {
    const expected = dom(<Md content={content} {...props} />);
    expect(dom(<MdStream content={content} {...props} />).innerHTML).toBe(expected.innerHTML);
    expect(dom(<ServerMd content={content} {...props} />).innerHTML).toBe(expected.innerHTML);
  });

  test.each(parity)('%s, at every step of the stream', (_name, content, props = {}) => {
    const step = Math.max(1, Math.floor(content.length / 40));
    const { container, rerender } = render(<MdStream content="" {...props} />);
    for (let end = step; end < content.length + step; end += step) {
      const prefix = content.slice(0, end);
      rerender(<MdStream content={prefix} {...props} />);
      expectSameDom(container, dom(<Md content={prefix} {...props} />));
    }
    expect(container.textContent).toBe(dom(<Md content={content} {...props} />).textContent);
  });

  it('puts every block in one document wrapper, so the block spacing applies', () => {
    const { container } = render(<MdStream content={'# A\n\nOne.\n\nTwo.\n\n- x\n\n- y'} />);
    const wrappers = container.querySelectorAll('.vaneui-md');
    expect(wrappers).toHaveLength(1);
    expect(wrappers[0].parentElement).toBe(container);
    expect(Array.from(wrappers[0].children).map((el) => el.tagName)).toEqual(['H1', 'P', 'P', 'UL']);
  });

  it('numbers a loose ordered list once', () => {
    const { container } = render(<MdStream content={'1. one\n\n2. two\n\n3. three'} />);
    expect(container.querySelectorAll('ol')).toHaveLength(1);
    expect(container.querySelectorAll('ol > li')).toHaveLength(3);
  });

  it('hides the content of a false condition', () => {
    const content = 'Before.\n\n{% if $show %}\n\nHidden.\n\n{% /if %}\n\nAfter.';
    const { container } = render(<MdStream content={content} config={{ variables: { show: false } }} />);
    expect(container.textContent).toBe('Before.After.');
  });

  it('inherits an outer renderer theme and layers the prop on top', () => {
    const { container } = render(
      <RendererThemeContext.Provider value={{ ...defaultRendererTheme, mdCode: { success: true } }}>
        <MdStream content={'text with `code`\n\n> quote'} rendererTheme={{ mdBlockquote: { danger: true } }} />
      </RendererThemeContext.Provider>,
    );
    expect(container.querySelector('code')?.getAttribute('data-appearance')).toBe('success');
    expect(container.querySelector('.vane-card')?.getAttribute('data-appearance')).toBe('danger');
  });
});

describe('MdStream re-renders only the blocks that changed', () => {
  const CONTENT = `# Title\n\nFirst paragraph.\n\n${CODE}\n\n- a\n- b\n\nLast`;

  it('keeps the DOM nodes of unchanged blocks when text is appended', () => {
    const { container, rerender } = render(<MdStream content={CONTENT} />);
    const wrapper = container.querySelector('.vaneui-md');
    const before = Array.from(wrapper?.children ?? []);
    expect(before).toHaveLength(5);

    rerender(<MdStream content={`${CONTENT} paragraph, still growing.\n\nA new block.`} />);
    const after = Array.from(container.querySelector('.vaneui-md')?.children ?? []);
    expect(container.querySelector('.vaneui-md')).toBe(wrapper);
    expect(after).toHaveLength(6);
    before.forEach((node, index) => expect(after[index]).toBe(node));
    expect(after[4].textContent).toBe('Last paragraph, still growing.');
    expect(after[5].textContent).toBe('A new block.');
  });

  it('renders an unchanged block once, and the changed one again', () => {
    const renders: string[] = [];
    const Paragraph = ({ children }: { children?: React.ReactNode }) => {
      const ref = React.useRef<HTMLParagraphElement>(null);
      React.useEffect(() => {
        renders.push(ref.current?.textContent ?? '');
      });
      return <p ref={ref}>{children}</p>;
    };
    const highlight = jest.fn((code: string) => <code>{code}</code>);
    // Stable across renders, as a consumer would hold them in a constant or a memo.
    const config = { components: { MdParagraph: Paragraph } };

    const { rerender } = render(<MdStream content={CONTENT} highlight={highlight} config={config} />);
    expect(renders).toEqual(['First paragraph.', 'Last']);
    expect(highlight).toHaveBeenCalledTimes(1);

    rerender(<MdStream content={`${CONTENT} one`} highlight={highlight} config={config} />);
    rerender(<MdStream content={`${CONTENT} one two`} highlight={highlight} config={config} />);
    rerender(<MdStream content={`${CONTENT} one two\n\nNew`} highlight={highlight} config={config} />);
    expect(renders).toEqual(['First paragraph.', 'Last', 'Last one', 'Last one two', 'New']);
    expect(highlight).toHaveBeenCalledTimes(1);
  });

  it('skips unchanged blocks when config objects are rebuilt with the same content on every render', () => {
    const highlight = jest.fn((code: string) => <code>{code}</code>);
    const Heading = jest.fn(({ children }: { children?: React.ReactNode }) => <h1>{children}</h1>);
    const props = () => ({
      highlight,
      rendererTheme: { mdCode: { primary: true } },
      config: { components: { MdHeading: Heading }, variables: { show: true } },
    });

    const { rerender } = render(<MdStream content={CONTENT} {...props()} />);
    rerender(<MdStream content={`${CONTENT} more`} {...props()} />);
    rerender(<MdStream content={`${CONTENT} more text`} {...props()} />);
    expect(highlight).toHaveBeenCalledTimes(1);
    expect(Heading).toHaveBeenCalledTimes(1);
  });

  it('re-renders an earlier block when later text changes what it renders', () => {
    const { container, rerender } = render(<MdStream content={'See the [docs][d].\n\nMore.'} />);
    expect(container.querySelector('a')).toBeNull();
    expect(container.querySelector('p')?.textContent).toBe('See the [docs][d].');

    rerender(<MdStream content={'See the [docs][d].\n\nMore.\n\n[d]: https://example.com/docs'} />);
    expect(container.querySelector('p a')?.getAttribute('href')).toBe('https://example.com/docs');
    expect(container.querySelector('p')?.textContent).toBe('See the docs.');
  });

  it('re-renders every block when a prop that renderers read changes', () => {
    const first = jest.fn((code: string) => <code>{code}</code>);
    const second = jest.fn((code: string) => <code>{code.toUpperCase()}</code>);
    const { container, rerender } = render(<MdStream content={CONTENT} highlight={first} />);
    rerender(<MdStream content={CONTENT} highlight={second} />);
    expect(second).toHaveBeenCalledTimes(1);
    expect(container.querySelector('.vane-card')?.textContent).toContain('CONST A = 1;');

    rerender(<MdStream content={CONTENT} highlight={second} rendererTheme={{ mdCode: { primary: true }, mdFence: { danger: true } }} />);
    expect(container.querySelector('.vane-card')?.getAttribute('data-appearance')).toBe('danger');
  });

  it('keeps a component state in an unchanged block and drops none when blocks are added', () => {
    const Counter = () => {
      const [count, setCount] = React.useState(0);
      return <button type="button" onClick={() => setCount(count + 1)}>{`clicked ${count}`}</button>;
    };
    const config = { tags: { counter: { render: 'Counter', selfClosing: true } }, components: { Counter } };
    const content = '{% counter /%}\n\nText';
    const { container, rerender } = render(<MdStream content={content} config={config} />);
    const button = container.querySelector('button');
    act(() => button?.click());
    expect(button?.textContent).toBe('clicked 1');

    rerender(<MdStream content={`${content} grows.\n\nNew block.`} config={config} />);
    expect(container.querySelector('button')).toBe(button);
    expect(button?.textContent).toBe('clicked 1');
  });
});
