import React from 'react';
import Markdoc, { type Node } from '@markdoc/markdoc';
import { render } from '@testing-library/react';
import { renderToStaticMarkup } from 'react-dom/server';
import { Md } from '../components/md';
import { Md as ClientMd } from '../client';
import { MdStream } from '../stream';
import { createMd } from '../createMd';
import { parseMarkdown } from '../tags';
import { tokenize } from '../tokenizer';
import { parseYamlFrontmatter } from '../yaml';
import { runWithTimeout } from './runWithTimeout';

// Tag syntax the parser cannot read, and tags that are never closed, must
// render valid HTML: no block inside a paragraph, no paragraph inside a
// paragraph. React reports invalid nesting through console.error.
let errorSpy: jest.SpyInstance;
beforeEach(() => {
  errorSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
});
afterEach(() => {
  expect(errorSpy).not.toHaveBeenCalled();
  errorSpy.mockRestore();
});

const dom = (content: string, props: Partial<React.ComponentProps<typeof Md>> = {}) =>
  render(<Md content={content} {...props} />).container;

/** The tags of the document's blocks, in order. */
const blocks = (container: HTMLElement) =>
  Array.from(container.querySelector('.vaneui-md')?.children ?? []).map((el) => el.tagName.toLowerCase());

const BAD_ATTRIBUTE = '{% foo bar= %}';
const BAD_ATTRIBUTE_MESSAGE = 'Tag syntax error: Expected "[", "{", boolean, identifier, null, number, string, or variable but end of input found.';
const LOOP = '{% for item in items %}';
const LOOP_MESSAGE = 'Tag syntax error: Expected "(" or "=" but " " found.';

describe('tag syntax the parser cannot read', () => {
  it('renders an inline error with the message inside a paragraph', () => {
    const container = dom(`text ${BAD_ATTRIBUTE} more\n\nnext`);
    expect(blocks(container)).toEqual(['p', 'p']);
    const paragraph = container.querySelector('p');
    expect(paragraph?.querySelector('div')).toBeNull();
    const error = paragraph?.querySelector(':scope > span');
    expect(error?.getAttribute('data-appearance')).toBe('danger');
    expect(error?.textContent).toBe(`Error: ${BAD_ATTRIBUTE_MESSAGE}`);
    expect(paragraph?.textContent).toBe(`text Error: ${BAD_ATTRIBUTE_MESSAGE} more`);
  });

  it('renders a block error with the message when the tag is on its own line', () => {
    const container = dom(`before\n\n${BAD_ATTRIBUTE}\n\nafter`);
    expect(blocks(container)).toEqual(['p', 'div', 'p']);
    const card = container.querySelector('.vaneui-md > div');
    expect(card?.classList.contains('vane-card')).toBe(true);
    expect(card?.getAttribute('data-appearance')).toBe('danger');
    expect(card?.textContent).toBe(`Error: ${BAD_ATTRIBUTE_MESSAGE}`);
  });

  it.each([
    ['a heading', `# Title ${BAD_ATTRIBUTE}`, 'h1'],
    ['a list item', `- item ${BAD_ATTRIBUTE}\n- other`, 'li'],
    ['a table cell', `| a | b |\n|---|---|\n| ${BAD_ATTRIBUTE} | 2 |`, 'td'],
    ['link text', `[link ${BAD_ATTRIBUTE}](/x)`, 'a'],
    ['a quote', `> quoted ${BAD_ATTRIBUTE}`, 'p'],
    ['strong text', `**strong ${BAD_ATTRIBUTE}** text`, 'strong'],
  ])('renders an inline error in %s', (_name, content, selector) => {
    const container = dom(content);
    const parent = container.querySelector(selector);
    expect(parent?.textContent).toContain(BAD_ATTRIBUTE_MESSAGE);
    expect(parent?.querySelector('div')).toBeNull();
    expect(container.querySelectorAll('.vane-card.vane-card').length).toBe(selector === 'p' ? 1 : 0);
  });

  it('keeps template syntax from another language inside its paragraph', () => {
    const container = dom(`Loop: ${LOOP} body {% endfor %}\n\nnext`);
    expect(blocks(container)).toEqual(['p', 'p']);
    expect(container.querySelector('p p')).toBeNull();
    const [first, second] = Array.from(container.querySelectorAll('p'));
    expect(first.textContent).toBe(`Loop: Error: ${LOOP_MESSAGE} body `);
    expect(second.textContent).toBe('next');
  });

  it('renders the same valid markup on the server', () => {
    const html = renderToStaticMarkup(<Md content={`Loop: ${LOOP} body {% endfor %}\n\ntext ${BAD_ATTRIBUTE} more`} />);
    expect(html).not.toMatch(/<p[^>]*>(?:(?!<\/p>).)*<(?:div|p)[\s>]/s);
    expect(html.match(/<p[\s>]/g)).toHaveLength(2);
    expect(html).toContain('Tag syntax error: Expected');
  });

  it('uses the mdErrorInline theme slot and a custom MdErrorInline, never a custom MdError inline', () => {
    const themed = dom(`text ${BAD_ATTRIBUTE}`, { rendererTheme: { mdErrorInline: { warning: true }, mdError: { success: true } } });
    expect(themed.querySelector('p > span')?.getAttribute('data-appearance')).toBe('warning');

    const BlockError = ({ children }: { children?: React.ReactNode }) => <div data-testid="block-error">{children}</div>;
    const InlineError = ({ children }: { children?: React.ReactNode }) => <span data-testid="inline-error">{children}</span>;
    const custom = dom(`text ${BAD_ATTRIBUTE}\n\n${BAD_ATTRIBUTE}`, { config: { components: { MdError: BlockError, MdErrorInline: InlineError } } });
    expect(custom.querySelector('p [data-testid="inline-error"]')?.textContent).toBe(BAD_ATTRIBUTE_MESSAGE);
    expect(custom.querySelector('p [data-testid="block-error"]')).toBeNull();
    expect(custom.querySelector('.vaneui-md > [data-testid="block-error"]')?.textContent).toBe(BAD_ATTRIBUTE_MESSAGE);
  });

  it('renders through the client Md and MdStream as well', () => {
    const content = `text ${BAD_ATTRIBUTE} more\n\nLoop: ${LOOP} body {% endfor %}\n\nnext`;
    const expected = dom(content).innerHTML;
    expect(render(<ClientMd content={content} />).container.innerHTML).toBe(expected);
    expect(render(<MdStream content={content} />).container.innerHTML).toBe(expected);
  });
});

describe('a tag that is never closed', () => {
  it('ends with its paragraph', () => {
    const container = dom('text {% a %} more\n\nnext');
    expect(blocks(container)).toEqual(['p', 'p']);
    expect(Array.from(container.querySelectorAll('p')).map((p) => p.textContent)).toEqual(['text  more', 'next']);
  });

  it.each([
    ['a paragraph with marks after it', 'text {% a %} **bold** *em* and `code`\n\nnext', ['p', 'p'], 'text  bold em and codenext'],
    ['a heading', '# Title {% a %} more\n\nnext', ['h1', 'p'], 'Title  morenext'],
    ['a list item', '- one {% a %} more\n- two\n\nnext', ['ul', 'p'], 'one  moretwonext'],
    ['a table cell', '| a {% a %} | b |\n|---|---|\n| 1 | 2 |\n\nnext', ['div', 'p'], 'a b12next'],
    ['link text', '[link {% a %} text](/x) after\n\nnext', ['p', 'p'], 'link  text afternext'],
    ['a quote, on its own line', '> {% a %}\n> text\n\nnext', ['div', 'p'], 'textnext'],
    ['a list item, on its own line', '- {% a %}\n- b\n\nnext', ['ul', 'p'], 'bnext'],
    ['a nested list item', '- a\n  - {% a %}\n  - c\n- d\n\nnext', ['ul', 'p'], 'acdnext'],
  ])('ends with %s', (_name, content, expectedBlocks, text) => {
    const container = dom(content);
    expect(blocks(container)).toEqual(expectedBlocks);
    expect(container.textContent).toBe(text);
    expect(container.querySelector('p p, li > li, p div')).toBeNull();
  });

  it('ends with the code fence it is written in, so the blocks after the fence still render', () => {
    const container = dom('```md\n{% callout %}\nhi\n{% /callout %}\n{% note %}\n```\n\nAfter the fence.');
    expect(blocks(container)).toEqual(['div', 'p']);
    expect(container.querySelector('pre code')?.textContent).toBe('{% callout %}\nhi\n{% /callout %}\n{% note %}\n');
    expect(container.querySelector('p')?.textContent).toBe('After the fence.');
  });

  it('applies a known tag to the rest of its paragraph only', () => {
    const container = dom('shown {% if $hide %} hidden\n\nnext', { config: { variables: { hide: false } } });
    expect(Array.from(container.querySelectorAll('p')).map((p) => p.textContent)).toEqual(['shown ', 'next']);
  });

  it('still takes the rest of the document when a block tag is left open at the top level', () => {
    const container = dom('before\n\n{% if $show %}\n\ninside\n\nmore', { config: { variables: { show: false } } });
    expect(container.textContent).toBe('before');
  });

  it('reports the open tag, not the paragraph, to Markdoc.validate', () => {
    const ast = parseMarkdown('text {% a %} more\n\nnext');
    const types = (node: Node): unknown[] => [node.type, ...node.children.map(types)];
    expect(types(ast)).toEqual([
      'document',
      ['paragraph', ['inline', ['text'], ['tag', ['text']]]],
      ['paragraph', ['inline', ['text']]],
    ]);
    const errors = Markdoc.validate(ast, { tags: { a: {} } });
    expect(errors.map((entry) => [entry.type, entry.error.id, entry.error.message])).toEqual([
      ['tag', 'missing-closing', "Node 'a' is missing closing"],
    ]);
  });

  it('leaves a document whose tags are all closed exactly as Markdoc parses it', () => {
    const source = [
      '# Title {% #id %}',
      '',
      '{% if $a %}',
      '',
      'Inline {% if $b %}yes{% /if %} and {% $c %}.',
      '',
      '- item {% if $b %}x{% /if %}',
      '',
      '> {% if $b %}',
      '> quoted',
      '> {% /if %}',
      '',
      '{% /if %}',
      '',
      '```js',
      'const a = {% $c %};',
      '```',
    ].join('\n');
    expect(JSON.stringify(parseMarkdown(source))).toBe(JSON.stringify(Markdoc.parse(source)));
  });

  it('pairs a closing tag only with the innermost open tag of that name', () => {
    const container = dom('a {% x %} b {% y %} c {% /x %} d\n\nnext');
    expect(blocks(container)).toEqual(['p', 'p']);
    expect(container.textContent).toBe('a  b  c  dnext');
  });

  it('handles 2,000 paragraphs that each leave a tag open', () => {
    const content = Array.from({ length: 2000 }, (_, i) => `Paragraph ${i} {% tag${i % 7} %} tail`).join('\n\n');
    const ast = runWithTimeout(() => parseMarkdown(content), 5000);
    expect(ast.children).toHaveLength(2000);
  });
});

describe('tagSyntax: false', () => {
  const TEMPLATE = 'Loop: {% for item in items %} body {% endfor %} and {{ item.name }}';

  it('leaves tag syntax in the text as written', () => {
    const container = dom(`${TEMPLATE}\n\nnext`, { tagSyntax: false });
    expect(blocks(container)).toEqual(['p', 'p']);
    expect(container.querySelector('p')?.textContent).toBe(TEMPLATE);
    expect(container.querySelector('span[data-appearance="danger"]')).toBeNull();
  });

  it('reads no tag, variable, function, annotation or partial', () => {
    const content = [
      '# Title {% #custom-id .custom-class %}',
      '',
      '{% if $show %}',
      '',
      'Value {% $value %} and {% upper("x") %} and {% partial file="p.md" /%}.',
      '',
      '{% /if %}',
      '',
      '{% include "x.md" %}',
    ].join('\n');
    const container = dom(content, {
      tagSyntax: false,
      config: { variables: { show: false, value: 'SECRET' }, partials: { 'p.md': 'PARTIAL' }, functions: { upper: { transform: () => 'UPPER' } } },
    });
    expect(container.querySelector('h1')?.id).toBe('');
    expect(container.querySelector('h1')?.className).not.toContain('custom-class');
    expect(container.querySelector('h1')?.textContent).toBe('Title {% #custom-id .custom-class %}');
    expect(Array.from(container.querySelectorAll('p')).map((p) => p.textContent)).toEqual([
      '{% if $show %}',
      'Value {% $value %} and {% upper("x") %} and {% partial file="p.md" /%}.',
      '{% /if %}',
      '{% include "x.md" %}',
    ]);
    expect(container.textContent).not.toContain('SECRET');
    expect(container.textContent).not.toContain('PARTIAL');
    expect(container.textContent).not.toContain('UPPER');
    expect(container.textContent).not.toContain('Error');
  });

  it('keeps Markdown, code fences and frontmatter working', () => {
    const content = '---\ntitle: T\n---\n\n**bold** and `{% code %}`\n\n```js {% process=false %}\nconst a = "{% x %}";\n```\n\n| a | b |\n|---|---|\n| 1 | 2 |';
    const container = dom(content, { tagSyntax: false, parseFrontmatter: parseYamlFrontmatter });
    expect(container.textContent).not.toContain('title: T');
    expect(container.querySelector('strong')?.textContent).toBe('bold');
    expect(container.querySelector('p code')?.textContent).toBe('{% code %}');
    expect(container.querySelector('pre code')?.className).toBe('language-js');
    expect(container.querySelector('pre code')?.textContent).toBe('const a = "{% x %}";\n');
    expect(container.querySelectorAll('td')).toHaveLength(2);
  });

  it('still renders vaneui fences', () => {
    const fence = ['```vaneui', 'Badge: New', '```'].join('\n');
    const Badge = ({ children }: { children?: React.ReactNode }) => <b data-testid="badge">{children}</b>;
    const container = dom(`${fence}\n\n{% a %}`, { tagSyntax: false, parseFrontmatter: parseYamlFrontmatter, components: { Badge } });
    expect(container.querySelector('[data-testid="badge"]')?.textContent).toBe('New');
    expect(container.querySelector('p')?.textContent).toBe('{% a %}');
  });

  it('is on by default, and true and undefined mean on', () => {
    for (const props of [{}, { tagSyntax: true }, { tagSyntax: undefined }]) {
      const container = dom('Value {% $value %}.', { ...props, config: { variables: { value: 'shown' } } });
      expect(container.textContent).toBe('Value shown.');
    }
  });

  it('can be set by a preset, and the prop wins over the preset', () => {
    const Plain = createMd().use({ tagSyntax: false });
    expect(render(<Plain content="A {% $v %} B" />).container.textContent).toBe('A {% $v %} B');
    expect(render(<Plain content="A {% $v %} B" tagSyntax config={{ variables: { v: 'x' } }} />).container.textContent).toBe('A x B');
    expect(dom('A {% $v %} B', { presets: [{ tagSyntax: false }, { tagSyntax: true }], config: { variables: { v: 'x' } } }).textContent).toBe('A x B');
    expect(dom('A {% $v %} B', { presets: [{ tagSyntax: true }, { tagSyntax: false }, {}] }).textContent).toBe('A {% $v %} B');
  });

  it('works in the client Md and MdStream', () => {
    expect(render(<ClientMd content={TEMPLATE} tagSyntax={false} />).container.textContent).toBe(TEMPLATE);
    const { container, rerender } = render(<MdStream content={TEMPLATE} tagSyntax={false} />);
    rerender(<MdStream content={`${TEMPLATE}\n\n{% endfor %}`} tagSyntax={false} />);
    expect(Array.from(container.querySelectorAll('p')).map((p) => p.textContent)).toEqual([TEMPLATE, '{% endfor %}']);
  });

  it('is an option of parseMarkdown and of the tokenizer, without changing the default one', () => {
    const types = (tokens: ReturnType<typeof tokenize>): string[] =>
      tokens.flatMap((token) => [token.type, ...(token.children ? types(token.children) : [])]);
    expect(types(tokenize('a {% b %}', { tagSyntax: false }))).toEqual(['paragraph_open', 'inline', 'text', 'paragraph_close']);
    expect(types(tokenize('a {% b %}'))).toContain('tag_open');
    const ast = parseMarkdown('{% if $x %}\n\ntext\n\n{% /if %}', { tagSyntax: false });
    expect(ast.children.map((child) => child.type)).toEqual(['paragraph', 'paragraph', 'paragraph']);
    expect(parseMarkdown('{% if $x %}\n\ntext\n\n{% /if %}').children.map((child) => child.type)).toEqual(['tag']);
  });

  it('reads 5,000 tag openers in one paragraph as text in well under a second', () => {
    const content = `${'{% a %}'.repeat(5000)} end`;
    const start = performance.now();
    const container = runWithTimeout(() => dom(content, { tagSyntax: false }), 5000);
    expect(performance.now() - start).toBeLessThan(1000);
    expect(container.textContent).toBe(content);
  });
});
