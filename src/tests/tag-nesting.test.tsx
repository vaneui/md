import * as fs from 'node:fs';
import * as path from 'node:path';
import React from 'react';
import { render } from '@testing-library/react';
import Markdoc from '@markdoc/markdoc';
import OldMarkdoc from 'markdoc-0.5.10';
import { Md } from '../components/md';
import { MdStream } from '../stream';
import { parseMarkdown } from '../tags';
import { guardInlineNesting, type Token } from '../tokenizer';
import { runWithTimeout } from './runWithTimeout';

// More than 100 unclosed inline tags in one paragraph used to loop forever in
// the Markdown tokenizer. Every call that could loop runs under a watchdog, so
// a regression fails these tests instead of hanging the run.

const COUNTS = [100, 101, 500, 5000];
const tags = (count: number) => '{% a %}'.repeat(count);

/** Runs `fn` under the watchdog and returns its result and the time it took. */
function timed<T>(fn: () => T): { result: T; ms: number } {
  const start = performance.now();
  const result = runWithTimeout(fn);
  return { result, ms: performance.now() - start };
}

describe('many unclosed inline tags in one paragraph', () => {
  test.each(COUNTS)('parseMarkdown returns for %i tags', (count) => {
    const { result: ast, ms } = timed(() => parseMarkdown(`before ${tags(count)} after`));
    expect(ms).toBeLessThan(1000);
    expect(ast.type).toBe('document');
    expect(ast.children).toHaveLength(1);
    expect(ast.children[0].type).toBe('paragraph');
  });

  test.each(COUNTS)('<Md> renders %i tags, showing the tags past the nesting limit as text', (count) => {
    const { result, ms } = timed(() => render(<Md content={`before ${tags(count)} after`} />));
    expect(ms).toBeLessThan(1000);
    const text = result.container.textContent ?? '';
    expect(text.startsWith('before ')).toBe(true);
    expect(text.endsWith(' after')).toBe(true);
    // The first 99 tags open (and render nothing, `a` is not a known tag); the rest stay visible.
    const shown = text.match(/\{% a %\}/g) ?? [];
    expect(shown).toHaveLength(Math.max(0, count - 99));
  });

  test('Markdown after the paragraph still renders', () => {
    const { result } = timed(() => render(<Md content={`${tags(500)}\n\n## Next\n\nLast *paragraph*.`} />));
    expect(result.container.querySelector('h2')?.textContent).toBe('Next');
    expect(result.container.querySelector('em')?.textContent).toBe('paragraph');
  });

  test('inline formatting keeps working inside a paragraph that reached the limit', () => {
    const { result } = timed(() => render(<Md content={`${tags(150)} **bold** and \`code\``} />));
    expect(result.container.querySelector('strong')?.textContent).toBe('bold');
    expect(result.container.querySelector('code')?.textContent).toBe('code');
  });

  test('tags inside link text and in a heading, a list item and a table cell return too', () => {
    const source = [
      `# ${tags(150)}`,
      '',
      `- ${tags(150)}`,
      '',
      `[${tags(150)} label](/somewhere)`,
      '',
      '| a |',
      '|---|',
      `| ${tags(150)} |`,
    ].join('\n');
    const { result, ms } = timed(() => render(<Md content={source} />));
    expect(ms).toBeLessThan(1000);
    expect(result.container.querySelector('h1')).not.toBeNull();
    expect(result.container.querySelector('li')).not.toBeNull();
    expect(result.container.querySelector('a')).toHaveAttribute('href', '/somewhere');
    expect(result.container.querySelector('td')).not.toBeNull();
  });

  test('closed tags are not limited: 500 tag pairs in one paragraph all parse as tags', () => {
    const { result } = timed(() => render(<Md content={'{% a %}x{% /a %} '.repeat(500)} />));
    expect(result.container.textContent).not.toContain('{%');
    expect(result.container.textContent?.match(/x/g)).toHaveLength(500);
  });

  test.each([101, 5000])('MdStream renders %i tags', (count) => {
    const { result, ms } = timed(() => render(<MdStream content={`before ${tags(count)} after\n\nNext block.`} />));
    expect(ms).toBeLessThan(1000);
    expect(result.container.textContent).toContain('before ');
    expect(result.container.textContent).toContain('Next block.');
  });

  test.each([101, 5000])('a Markdown-string partial with %i tags renders', (count) => {
    const { result, ms } = timed(() =>
      render(<Md content={'Intro.\n\n{% partial file="many" /%}\n\nOutro.'} config={{ partials: { many: `inside ${tags(count)}` } }} />),
    );
    expect(ms).toBeLessThan(1000);
    expect(result.container.textContent).toContain('inside ');
    expect(result.container.textContent).toContain('Outro.');
  });

  test('100 unclosed block-level tags and more return as well', () => {
    const { result, ms } = timed(() => render(<Md content={`Intro.\n\n${'{% a %}\n\n'.repeat(500)}`} />));
    expect(ms).toBeLessThan(1000);
    expect(result.container.textContent).toContain('Intro.');
  });
});

describe('the tokenizer guard on a Markdoc release that still has the endless loop', () => {
  // `markdoc-0.5.10` is the last release with the loop, installed under an alias for this test only.
  const text = (tokens: Token[]): string =>
    tokens.map((token) => (token.children ? text(token.children) : token.type === 'text' ? token.content ?? '' : '')).join('');
  const count = (tokens: Token[], type: string): number =>
    tokens.reduce((sum, token) => sum + (token.type === type ? 1 : 0) + (token.children ? count(token.children, type) : 0), 0);

  test('the package depends on a release without the loop', () => {
    const range: string = JSON.parse(fs.readFileSync(path.resolve(__dirname, '../../package.json'), 'utf8')).dependencies['@markdoc/markdoc'];
    const patch = /^\^0\.5\.(\d+)$/.exec(range);
    expect(patch).not.toBeNull();
    expect(Number(patch![1])).toBeGreaterThanOrEqual(11);
  });

  test('without the guard that release never returns (control)', () => {
    expect(() => runWithTimeout(() => new OldMarkdoc.Tokenizer().tokenize(`${tags(101)} after`), 500)).toThrow(/timed out/);
  });

  test.each(COUNTS)('with the guard it returns for %i tags, leaving the tags past the limit as text', (n) => {
    const tokenizer = guardInlineNesting(new OldMarkdoc.Tokenizer());
    const { result: tokens, ms } = timed(() => tokenizer.tokenize(`before ${tags(n)} after`));
    expect(ms).toBeLessThan(1000);
    expect(count(tokens, 'tag_open')).toBe(Math.min(n, 99));
    expect(text(tokens)).toBe(`before ${tags(Math.max(0, n - 99))} after`);
  });

  test('the guarded release and the current one read the tags the same way', () => {
    const old = guardInlineNesting(new OldMarkdoc.Tokenizer());
    const current = guardInlineNesting(new Markdoc.Tokenizer());
    for (const source of [`before ${tags(150)} *after*`, `[${tags(150)} label](/x) tail`, `${tags(98)}{% b /%}{% $v %}{% c %}{% d %}{% /c %}`]) {
      const a = timed(() => old.tokenize(source)).result;
      const b = timed(() => current.tokenize(source)).result;
      expect(count(a, 'tag_open')).toBe(count(b, 'tag_open'));
      expect(count(a, 'tag_close')).toBe(count(b, 'tag_close'));
      expect(text(a)).toBe(text(b));
    }
  });

  test('closing tags still close at the limit, so the level can come back down', () => {
    const tokenizer = guardInlineNesting(new OldMarkdoc.Tokenizer());
    const source = `${tags(99)}{% a %}${'{% /a %}'.repeat(99)} {% b %}x{% /b %}`;
    const tokens = timed(() => tokenizer.tokenize(source)).result;
    // The 100th opening tag is text; the 99 closing tags close, and tags work again after them.
    expect(count(tokens, 'tag_open')).toBe(100);
    expect(count(tokens, 'tag_close')).toBe(100);
    expect(text(tokens)).toBe('{% a %} x');
  });

  test('tags in link text, an image label and a table cell return', () => {
    const tokenizer = guardInlineNesting(new OldMarkdoc.Tokenizer());
    const source = [`[${tags(150)} label](/x) tail`, '', `![${tags(150)}](/a.png)`, '', '| a |', '|---|', `| ${tags(150)} |`].join('\n');
    const { ms } = timed(() => tokenizer.tokenize(source));
    expect(ms).toBeLessThan(1000);
  });

  test('a tokenizer of an unknown shape is returned unchanged', () => {
    for (const shape of [{}, { parser: {} }, { parser: { inline: { ruler: { __rules__: [] } } } }, { parser: { inline: { ruler: { __rules__: [{ name: 'containers', fn: () => true }] } } } }]) {
      const before = JSON.stringify(shape);
      expect(guardInlineNesting(shape)).toBe(shape);
      expect(JSON.stringify(shape)).toBe(before);
    }
  });
});
