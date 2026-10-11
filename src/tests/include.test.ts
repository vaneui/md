/** @jest-environment node */
import * as fs from 'node:fs';
import { builtinModules } from 'node:module';
import * as os from 'node:os';
import * as path from 'node:path';
import Markdoc from '@markdoc/markdoc';
import ts from 'typescript';
import {
  IncludeError,
  resolveIncludes,
  resolveIncludesAsync,
  type ResolveIncludesOptions,
} from '../include';
import { isInside, resolveIncludePath } from '../include-paths';

// ---------------------------------------------------------------------------
// In-memory file system helpers
// ---------------------------------------------------------------------------

const VROOT = path.resolve(path.sep, 'virtual-docs');

/** Absolute path for a root-relative virtual path written with `/`. */
const v = (relative: string) => path.join(VROOT, ...relative.split('/'));

const enoent = (file: string) =>
  Object.assign(new Error(`ENOENT: no such file or directory, open '${file}'`), { code: 'ENOENT' });

function memoryReader(files: Record<string, string>) {
  const reads: string[] = [];
  const readFile = (absolutePath: string) => {
    reads.push(absolutePath);
    const key = path.relative(VROOT, absolutePath).split(path.sep).join('/');
    const content = files[key];
    if (content === undefined) throw enoent(absolutePath);
    return content;
  };
  return { readFile, reads };
}

/** Resolve `entry` from an in-memory file map rooted at VROOT. */
function expandVirtual(
  files: Record<string, string>,
  entry: string,
  options: Partial<ResolveIncludesOptions> = {},
) {
  const { readFile } = memoryReader(files);
  return resolveIncludes(files[entry], { filePath: v(entry), root: VROOT, readFile, ...options });
}

/** Run `fn` and return the IncludeError it throws. */
function catchIncludeError(fn: () => unknown): IncludeError {
  try {
    fn();
  } catch (error) {
    expect(error).toBeInstanceOf(IncludeError);
    return error as IncludeError;
  }
  throw new Error('expected an IncludeError to be thrown');
}

/** Run `fn` and return whatever it throws. */
function catchError(fn: () => unknown): unknown {
  try {
    fn();
  } catch (error) {
    return error;
  }
  throw new Error('expected an error to be thrown');
}

/** Milliseconds `fn` takes to run. */
function timed(fn: () => unknown): number {
  const start = Date.now();
  fn();
  return Date.now() - start;
}

// ---------------------------------------------------------------------------
// Markdoc as the reference
// ---------------------------------------------------------------------------

const markdocTokenizer = new Markdoc.Tokenizer();

/**
 * Indexes of the lines Markdoc reads as fenced code (fence lines included) or
 * as frontmatter: lines where a tag is only text.
 */
function markdocVerbatimLines(source: string): Set<number> {
  const lines = new Set<number>();
  for (const token of markdocTokenizer.tokenize(source)) {
    if (!token.map) continue;
    // A frontmatter token's map ends at its closing `---` line.
    const end = token.type === 'frontmatter' ? token.map[1] + 1 : token.type === 'fence' ? token.map[1] : 0;
    for (let line = token.map[0]; line < end; line++) lines.add(line);
  }
  return lines;
}

/** Info string and code of each fence Markdoc reads in `source`, in order. */
function markdocFences(source: string): Array<[string, string]> {
  return markdocTokenizer
    .tokenize(source)
    .filter((token) => token.type === 'fence')
    .map((token) => [token.info, token.content]);
}

/**
 * Number each `TAG` in `lines` as `{% include "t<line>.md" %}`, expand the
 * result with every `t<n>.md` reading `<<n>>`, and return the indexes of the
 * tag lines that were expanded, along with those Markdoc reads outside fenced
 * code and frontmatter. The two should always be the same.
 */
function expandedTagLines(lines: readonly string[]) {
  const source = lines.map((line, i) => line.replace('TAG', `{% include "t${i}.md" %}`)).join('\n');
  const output = resolveIncludes(source, {
    filePath: v('page.md'),
    root: VROOT,
    readFile: (file) => `<<${path.basename(file, '.md').slice(1)}>>`,
  });
  const fenced = markdocVerbatimLines(source);
  const tags = lines.flatMap((line, i) => (line.includes('TAG') ? [i] : []));
  return {
    source,
    expanded: tags.filter((i) => output.includes(`<<${i}>>`)),
    markdoc: tags.filter((i) => !fenced.has(i)),
  };
}

/** A seeded pseudo-random number generator (mulberry32), so a failing case can be replayed. */
function seededRandom(seed: number): () => number {
  let state = seed >>> 0;
  return () => {
    state = (state + 0x6d2b79f5) >>> 0;
    let t = state;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const pick = <T>(random: () => number, items: readonly T[]): T => items[Math.floor(random() * items.length)];

/**
 * A tab after two `>` markers: markdown-it measures it from the enclosing
 * blockquote instead of the line start, and the resolver does not copy that
 * (see include-blocks.ts), so the generated documents leave such lines out.
 */
const hasTabInNestedQuote = (line: string) => />.*>.*\t/.test(line);

// ---------------------------------------------------------------------------
// Syntax
// ---------------------------------------------------------------------------

describe('resolveIncludes: tag syntax', () => {
  const files = { 'part.md': 'Included text.' };

  it.each([
    ['{% include "part.md" %}'],
    ['{% include "part.md" /%}'],
    ['{% include file="part.md" %}'],
    ['{% include file="part.md" /%}'],
    ["{% include 'part.md' %}"],
    ["{% include 'part.md' /%}"],
    ["{% include file='part.md' %}"],
    ["{% include file='part.md' /%}"],
    ['{%include "part.md"%}'],
    ['{%   include   file = "part.md"   /%}'],
    ['{% include "part.md" / %}'],
    ['   {% include "part.md" %}   '],
    ['\t{% include "part.md" %}'],
  ])('expands %s', (tag) => {
    const out = expandVirtual({ ...files, 'page.md': `Before\n\n${tag}\n\nAfter` }, 'page.md');
    const indent = /^[ \t]*/.exec(tag)![0];
    expect(out).toBe(`Before\n\n${indent}Included text.\n\nAfter`);
  });

  it.each([
    ['inline tag in a paragraph', 'Text {% include "part.md" %} more'],
    ['tag followed by text', '{% include "part.md" %} trailing'],
    ['partial tag', '{% partial file="part.md" /%}'],
    ['unquoted path', '{% include part.md %}'],
    ['different tag name', '{% includes "part.md" %}'],
    ['file without equals', '{% include file "part.md" %}'],
    ['mismatched quotes', '{% include "part.md\' %}'],
    ['double slash', '{% include "part.md" //%}'],
    ['tag after a bullet list marker', '- {% include "part.md" %}'],
    ['tag after an ordered list marker', '1. {% include "part.md" %}'],
    ['tag after a list marker in a blockquote', '> - {% include "part.md" %}'],
  ])('leaves a %s untouched', (_name, line) => {
    const source = `# Title\n\n${line}\n`;
    expect(expandVirtual({ ...files, 'page.md': source }, 'page.md')).toBe(source);
  });

  it('returns the LF-normalized source unchanged when there are no tags', () => {
    const source = '---\ntitle: x\n---\r\n\r\n# Hello\r\n\r\nText\rmore\n';
    const out = resolveIncludes(source, { filePath: v('page.md'), root: VROOT, readFile: () => '' });
    expect(out).toBe('---\ntitle: x\n---\n\n# Hello\n\nText\nmore\n');
  });
});

// ---------------------------------------------------------------------------
// Blockquotes
// ---------------------------------------------------------------------------

describe('resolveIncludes: blockquotes', () => {
  it('expands a tag in a blockquote and prefixes every included line with the quote marker', () => {
    const files = {
      'page.md': '> **Note**\n>\n> {% include "part.md" %}\n\nAfter',
      'part.md': 'Line one\n\nLine two\n\n- item\n',
    };
    expect(expandVirtual(files, 'page.md')).toBe(
      '> **Note**\n>\n> Line one\n>\n> Line two\n>\n> - item\n\nAfter',
    );
  });

  it.each([
    ['>> ', '>>'],
    ['> > ', '> >'],
    ['  > ', '  >'],
    ['>', '>'],
    ['> \t', '>'],
  ])('keeps the prefix %j, trimmed to %j on blank lines', (prefix, blank) => {
    const files = { 'page.md': `${prefix}{% include "part.md" %}`, 'part.md': 'A\n\nB' };
    expect(expandVirtual(files, 'page.md')).toBe(`${prefix}A\n${blank}\n${prefix}B`);
  });

  it('applies blockquote prefixes cumulatively through nested includes', () => {
    const files = {
      'page.md': '> {% include "a.md" %}',
      'a.md': 'A\n\n> {% include "b.md" %}',
      'b.md': 'B1\n\nB2',
    };
    expect(expandVirtual(files, 'page.md')).toBe('> A\n>\n> > B1\n> >\n> > B2');
  });

  it('prefixes onError text like included content', () => {
    const out = expandVirtual({ 'page.md': '> {% include "missing.md" %}' }, 'page.md', {
      onError: () => 'Missing\n\ninclude',
    });
    expect(out).toBe('> Missing\n>\n> include');
  });
});

// ---------------------------------------------------------------------------
// Path resolution
// ---------------------------------------------------------------------------

describe('resolveIncludes: path resolution', () => {
  it('resolves ./ paths relative to the including file', () => {
    const files = {
      'guide/page.md': '{% include "./intro.md" %}',
      'guide/intro.md': 'Intro',
    };
    expect(expandVirtual(files, 'guide/page.md')).toBe('Intro');
  });

  it('resolves bare relative paths relative to the including file', () => {
    const files = {
      'guide/page.md': '{% include "parts/a.md" %}',
      'guide/parts/a.md': 'A',
    };
    expect(expandVirtual(files, 'guide/page.md')).toBe('A');
  });

  it('resolves ../ paths', () => {
    const files = {
      'guide/deep/page.md': '{% include "../../shared/note.md" %}',
      'shared/note.md': 'Note',
    };
    expect(expandVirtual(files, 'guide/deep/page.md')).toBe('Note');
  });

  it('resolves nested includes relative to their own file, not the entry', () => {
    const files = {
      'page.md': '# Page\n\n{% include "parts/a.md" %}',
      'parts/a.md': 'A start\n\n{% include "b.md" %}\n\n{% include "../sibling.md" %}',
      'parts/b.md': 'B from parts',
      'b.md': 'B from root (wrong)',
      'sibling.md': 'Sibling',
    };
    expect(expandVirtual(files, 'page.md')).toBe(
      '# Page\n\nA start\n\nB from parts\n\nSibling',
    );
  });

  it('resolves a leading / from root', () => {
    const files = {
      'guide/deep/page.md': '{% include "/shared/note.md" %}',
      'shared/note.md': 'Note',
      'guide/deep/shared/note.md': 'Wrong',
    };
    expect(expandVirtual(files, 'guide/deep/page.md')).toBe('Note');
  });

  it('lets an entry file outside root include files inside root', () => {
    const { readFile } = memoryReader({ 'parts/a.md': 'A' });
    const out = resolveIncludes('{% include "/parts/a.md" %}', {
      filePath: path.resolve(path.sep, 'elsewhere', 'page.md'),
      root: VROOT,
      readFile,
    });
    expect(out).toBe('A');
  });
});

describe('include path helpers', () => {
  describe('with path.win32', () => {
    const w = path.win32;
    const root = 'C:\\docs';
    const from = 'C:\\docs\\guide\\page.md';

    it.each([
      ['\\secret.md', 'C:\\docs\\secret.md'],
      ['\\shared\\note.md', 'C:\\docs\\shared\\note.md'],
      ['/shared/note.md', 'C:\\docs\\shared\\note.md'],
      ['\\\\server\\share\\x.md', 'C:\\docs\\server\\share\\x.md'],
      ['parts/intro.md', 'C:\\docs\\guide\\parts\\intro.md'],
      ['..\\shared\\note.md', 'C:\\docs\\shared\\note.md'],
    ])('resolves %j inside root', (target, expected) => {
      const file = resolveIncludePath(w, root, from, target);
      expect(file).toBe(expected);
      expect(isInside(w, root, file)).toBe(true);
    });

    it.each([
      ['..\\..\\secret.md'],
      ['\\..\\secret.md'],
      ['C:\\Windows\\win.ini'],
      ['D:\\docs\\x.md'],
      ['D:x.md'],
    ])('keeps %j outside root', (target) => {
      expect(isInside(w, root, resolveIncludePath(w, root, from, target))).toBe(false);
    });

    it('compares paths case-insensitively, like Windows does', () => {
      expect(isInside(w, 'C:\\Docs', 'c:\\docs\\guide\\page.md')).toBe(true);
      expect(isInside(w, 'C:\\docs', 'C:\\docs-other\\page.md')).toBe(false);
    });
  });

  describe('with path.posix', () => {
    const p = path.posix;

    it('treats a leading / or \\ as root-relative', () => {
      expect(resolveIncludePath(p, '/docs', '/docs/guide/page.md', '/x.md')).toBe('/docs/x.md');
      expect(isInside(p, '/docs', resolveIncludePath(p, '/docs', '/docs/guide/page.md', '\\x.md'))).toBe(
        true,
      );
    });

    it('rejects siblings that share a name prefix with root', () => {
      expect(isInside(p, '/docs', '/docs/a.md')).toBe(true);
      expect(isInside(p, '/docs', '/docs-old/a.md')).toBe(false);
      expect(isInside(p, '/docs', '/docs/..a.md')).toBe(true);
    });
  });
});

// ---------------------------------------------------------------------------
// Content processing
// ---------------------------------------------------------------------------

describe('resolveIncludes: content processing', () => {
  it('strips the included file frontmatter and keeps the entry frontmatter', () => {
    const files = {
      'page.md': '---\ntitle: Page\n---\n\n# Page\n\n{% include "part.md" %}\n',
      'part.md': '---\ntitle: Part\ntags: [a]\n---\n\n## Part heading\n\nPart body.\n',
    };
    expect(expandVirtual(files, 'page.md')).toBe(
      '---\ntitle: Page\n---\n\n# Page\n\n## Part heading\n\nPart body.\n',
    );
  });

  it('copies the entry frontmatter unchanged, without expanding tags in it', () => {
    const source = '---\ntitle: x\nnote: |\n  {% include "part.md" %}\n---\n{% include "part.md" %}';
    expect(expandVirtual({ 'page.md': source, 'part.md': 'P' }, 'page.md')).toBe(
      '---\ntitle: x\nnote: |\n  {% include "part.md" %}\n---\nP',
    );
  });

  it('does not track fences inside the entry frontmatter', () => {
    const source = '---\nx: |\n  ```\n---\n{% include "part.md" %}';
    expect(expandVirtual({ 'page.md': source, 'part.md': 'P' }, 'page.md')).toBe(
      '---\nx: |\n  ```\n---\nP',
    );
  });

  it('strips a BOM from the entry source', () => {
    const out = expandVirtual(
      { 'page.md': '\uFEFF{% include "part.md" %}\nnext', 'part.md': 'P' },
      'page.md',
    );
    expect(out).toBe('P\nnext');
  });

  it('copies entry frontmatter that follows a BOM', () => {
    const out = expandVirtual(
      { 'page.md': '\uFEFF---\nt: |\n  {% include "part.md" %}\n---\nBody', 'part.md': 'P' },
      'page.md',
    );
    expect(out).toBe('---\nt: |\n  {% include "part.md" %}\n---\nBody');
  });

  it('strips frontmatter whose markers have surrounding whitespace (same rule as Markdoc)', () => {
    const files = {
      'page.md': '{% include "part.md" %}',
      'part.md': '---  \ntitle: Part\n  ---\nBody',
    };
    expect(expandVirtual(files, 'page.md')).toBe('Body');
  });

  it('keeps a leading --- that is never closed (a thematic break, not frontmatter)', () => {
    const files = {
      'page.md': '{% include "part.md" %}',
      'part.md': '---\nBody',
    };
    expect(expandVirtual(files, 'page.md')).toBe('---\nBody');
  });

  it('strips a BOM and normalizes CRLF and CR in included files', () => {
    const files = {
      'page.md': 'Top\r\n\r\n{% include "part.md" %}\r\n\r\nBottom\r\n',
      'part.md': '\uFEFF---\r\nx: 1\r\n---\r\nLine one\r\nLine two\rLine three\r\n',
    };
    expect(expandVirtual(files, 'page.md')).toBe(
      'Top\n\nLine one\nLine two\nLine three\n\nBottom\n',
    );
  });

  it('removes trailing newlines from included content', () => {
    const files = {
      'page.md': 'A\n{% include "part.md" %}\nB',
      'part.md': 'Part\n\n\n  \n',
    };
    expect(expandVirtual(files, 'page.md')).toBe('A\nPart\nB');
  });

  it('keeps leading blank lines of included content that has no frontmatter', () => {
    const files = {
      'page.md': 'A\n{% include "part.md" %}',
      'part.md': '\nPart',
    };
    expect(expandVirtual(files, 'page.md')).toBe('A\n\nPart');
  });

  it('indents included content to match the tag, so it stays inside a list item', () => {
    const files = {
      'page.md': '- Item one\n\n  {% include "part.md" %}\n- Item two\n',
      'part.md': 'Para line\n\n```js\nconst x = 1;\n```\n\n- nested\n',
    };
    expect(expandVirtual(files, 'page.md')).toBe(
      '- Item one\n\n  Para line\n\n  ```js\n  const x = 1;\n  ```\n\n  - nested\n- Item two\n',
    );
  });

  it('applies indentation cumulatively through nested includes', () => {
    const files = {
      'page.md': '- Item\n  {% include "a.md" %}',
      'a.md': 'A\n  {% include "b.md" %}',
      'b.md': 'B1\nB2',
    };
    expect(expandVirtual(files, 'page.md')).toBe('- Item\n  A\n    B1\n    B2');
  });

  it('expands leading tabs of included lines (tab stop 4) when the tag is indented', () => {
    const files = {
      'page.md': '- Item\n\n  {% include "part.md" %}',
      'part.md': '\tindented code\n  \tmixed\n    \t\ttwo stops\ntext\twith a tab',
    };
    expect(expandVirtual(files, 'page.md')).toBe(
      `- Item\n\n      indented code\n      mixed\n${' '.repeat(14)}two stops\n  text\twith a tab`,
    );
  });

  it('keeps tabs untouched when the tag has no prefix', () => {
    const files = { 'page.md': '{% include "part.md" %}', 'part.md': '\tcode\n \t x' };
    expect(expandVirtual(files, 'page.md')).toBe('\tcode\n \t x');
  });

  it('prefixes whitespace-only lines, so code in an included fence keeps them', () => {
    const files = {
      'page.md': '- Item\n\n  {% include "part.md" %}',
      'part.md': '```py\ndef f():\n    a = 1\n    \n    return a\n```',
    };
    expect(expandVirtual(files, 'page.md')).toBe(
      '- Item\n\n  ```py\n  def f():\n      a = 1\n      \n      return a\n  ```',
    );
  });

  it('removes the tag line entirely when the included file is empty', () => {
    const files = {
      'page.md': '- One\n{% include "empty.md" %}\n- Two\n  {% include "blank.md" %}\n  {% include "fm-only.md" %}\n- Three',
      'empty.md': '',
      'blank.md': '\n\n  \n',
      'fm-only.md': '---\ntitle: nothing else\n---\n',
    };
    expect(expandVirtual(files, 'page.md')).toBe('- One\n- Two\n- Three');
  });

  it('includes the same file twice side by side', () => {
    const files = {
      'page.md': '{% include "part.md" %}\n\n{% include "./part.md" %}',
      'part.md': 'Part',
    };
    const onInclude = jest.fn();
    expect(expandVirtual(files, 'page.md', { onInclude })).toBe('Part\n\nPart');
    expect(onInclude).toHaveBeenCalledTimes(2);
  });
});

// ---------------------------------------------------------------------------
// Fenced code blocks
// ---------------------------------------------------------------------------

describe('resolveIncludes: fenced code blocks', () => {
  const files = { 'part.md': 'Included' };
  const tag = '{% include "part.md" %}';
  const expand = (source: string) => expandVirtual({ ...files, 'page.md': source }, 'page.md');

  it('does not expand tags inside ``` fences', () => {
    expect(expand(`\`\`\`md\n${tag}\n\`\`\`\n\n${tag}`)).toBe(`\`\`\`md\n${tag}\n\`\`\`\n\nIncluded`);
  });

  it('does not expand tags inside ~~~ fences', () => {
    expect(expand(`~~~\n${tag}\n~~~\n${tag}`)).toBe(`~~~\n${tag}\n~~~\nIncluded`);
  });

  it('allows backticks in the info string of a ~~~ fence', () => {
    expect(expand(`~~~ \`x\`\n${tag}\n~~~\n${tag}`)).toBe(`~~~ \`x\`\n${tag}\n~~~\nIncluded`);
  });

  it('keeps a 4-backtick fence open across inner ``` lines', () => {
    expect(expand(`\`\`\`\`md\n\`\`\`md\n${tag}\n\`\`\`\n${tag}\n\`\`\`\`\n${tag}`)).toBe(
      `\`\`\`\`md\n\`\`\`md\n${tag}\n\`\`\`\n${tag}\n\`\`\`\`\nIncluded`,
    );
  });

  it('closes a fence only with the same character', () => {
    expect(expand(`\`\`\`\n~~~\n${tag}\n\`\`\`\n${tag}`)).toBe(`\`\`\`\n~~~\n${tag}\n\`\`\`\nIncluded`);
  });

  it('does not close a fence on a line with text after the marker', () => {
    expect(expand(`\`\`\`\n\`\`\` not a close\n${tag}\n\`\`\`\n${tag}`)).toBe(
      `\`\`\`\n\`\`\` not a close\n${tag}\n\`\`\`\nIncluded`,
    );
  });

  it('accepts a longer closing fence and indented fences', () => {
    expect(expand(`  \`\`\`\n${tag}\n  \`\`\`\`\`  \n${tag}`)).toBe(
      `  \`\`\`\n${tag}\n  \`\`\`\`\`  \nIncluded`,
    );
  });

  it('treats an unclosed fence in the entry as running to the end of the file', () => {
    expect(expand(`${tag}\n\n\`\`\`\n${tag}\n\n${tag}\n`)).toBe(`Included\n\n\`\`\`\n${tag}\n\n${tag}\n`);
  });

  it('does not treat a line of inline code spans as a fence opener', () => {
    expect(expand(`\`\`\`inline\`\`\` code\n${tag}`)).toBe('```inline``` code\nIncluded');
  });

  it.each([
    ['- ', '  '],
    ['* ', '  '],
    ['+ ', '  '],
    ['1. ', '   '],
    ['1) ', '   '],
    ['10. ', '    '],
    ['- - ', '    '],
    // The tab reaches column 4, so the item's content starts there.
    ['-\t', '    '],
    [' -\t', '    '],
  ])('recognizes a fence opened after the list marker %j', (marker, indent) => {
    const source = `${marker}\`\`\`md\n${indent}${tag}\n${indent}\`\`\`\n${tag}`;
    expect(expand(source)).toBe(`${marker}\`\`\`md\n${indent}${tag}\n${indent}\`\`\`\nIncluded`);
    expect([...markdocVerbatimLines(source)]).toEqual([0, 1, 2]);
  });

  it.each([['> '], ['>'], ['>> '], ['> > '], ['  > '], ['>\t']])(
    'recognizes and closes a fence in the blockquote %j',
    (quote) => {
      const source = `${quote}\`\`\`md\n${quote}${tag}\n${quote}\`\`\`\n${quote}${tag}`;
      expect(expand(source)).toBe(`${quote}\`\`\`md\n${quote}${tag}\n${quote}\`\`\`\n${quote}Included`);
      expect([...markdocVerbatimLines(source)]).toEqual([0, 1, 2]);
    },
  );

  it('recognizes fences after mixed list and blockquote markers', () => {
    expect(expand(`> - \`\`\`md\n>   ${tag}\n>   \`\`\`\n${tag}`)).toBe(
      `> - \`\`\`md\n>   ${tag}\n>   \`\`\`\nIncluded`,
    );
    expect(expand(`- > \`\`\`md\n  > ${tag}\n  > \`\`\`\n${tag}`)).toBe(
      `- > \`\`\`md\n  > ${tag}\n  > \`\`\`\nIncluded`,
    );
  });

  it('ends a blockquote fence at a line outside the blockquote (no lazy lines in code)', () => {
    expect(expand(`> \`\`\`md\n${tag}\n> \`\`\``)).toBe('> ```md\nIncluded\n> ```');
    expect(expand(`> \`\`\`md\n> code\n\n${tag}`)).toBe('> ```md\n> code\n\nIncluded');
  });

  it('does not close a top-level fence with a quoted closing fence', () => {
    const source = `\`\`\`md\n> \`\`\`js\n> code\n> \`\`\`\n${tag}\n\`\`\`\n${tag}`;
    expect(expand(source)).toBe(`\`\`\`md\n> \`\`\`js\n> code\n> \`\`\`\n${tag}\n\`\`\`\nIncluded`);
  });

  it('does not expand tags inside fences of included files', () => {
    const all = {
      ...files,
      'page.md': '{% include "doc.md" %}',
      'doc.md': `Syntax:\n\n\`\`\`md\n${tag}\n\`\`\``,
    };
    expect(expandVirtual(all, 'page.md')).toBe(`Syntax:\n\n\`\`\`md\n${tag}\n\`\`\``);
  });

  it('closes a fence left open by an included file, so the rest of the page is not code', () => {
    const all = {
      ...files,
      'page.md': `{% include "open.md" %}\n${tag}`,
      'open.md': '```\ncode\n\n',
    };
    expect(expandVirtual(all, 'page.md')).toBe('```\ncode\n```\nIncluded');
  });

  it.each([
    ['````js\ncode', '````js\ncode\n````'],
    ['~~~~\ncode', '~~~~\ncode\n~~~~'],
    ['- ```js\n  code', '- ```js\n  code\n  ```'],
    ['1. ```js\n   code', '1. ```js\n   code\n   ```'],
    ['> ```js\n> code', '> ```js\n> code\n> ```'],
    ['> - ```js\n>   code', '> - ```js\n>   code\n>   ```'],
  ])('closes the unclosed fence in %j inside its container', (part, expected) => {
    expect(expandVirtual({ 'page.md': '{% include "part.md" %}', 'part.md': part }, 'page.md')).toBe(
      expected,
    );
  });

  it('prefixes the added closing fence like the rest of the included content', () => {
    const all = { 'page.md': '> {% include "open.md" %}', 'open.md': '```\ncode' };
    expect(expandVirtual(all, 'page.md')).toBe('> ```\n> code\n> ```');
  });
});

// ---------------------------------------------------------------------------
// Agreement with Markdoc
// ---------------------------------------------------------------------------

describe('resolveIncludes: fences as Markdoc reads them', () => {
  // Each case lists the lines of a page (TAG is an include tag) and the
  // indexes of the tag lines that are outside fenced code, so expanded.
  it.each<[string, string[], number[]]>([
    ['``` indented 4+ columns is text', ['    ```', 'TAG', '```', 'TAG'], [1]],
    ['``` indented 4+ columns in a list item is text', ['- Item', '', '      ```', '  TAG'], [3]],
    ['``` indented 4+ columns in a blockquote is text', ['>     ```', '> TAG'], [1]],
    ['``` indented 4+ columns after a list marker is text', ['-     ```', '  TAG'], [1]],
    ['a closing fence indented 4+ columns is code', ['```', '    ```', 'TAG', '```', 'TAG'], [4]],
    ['"2." does not start a list in a paragraph', ['Para', '2. ```', '   TAG', '   ```', 'TAG'], [2]],
    ['"1." starts a list in a paragraph', ['Para', '1. ```', '   TAG', '   ```', 'TAG'], [4]],
    ['"2." starts a list after a blank line', ['Para', '', '2. ```', '   TAG', '   ```', 'TAG'], [5]],
    ['"2." starts a list after a lazy blockquote line', ['> Para', 'lazy', '2. ```', '   TAG', '   ```', 'TAG'], [5]],
    ['"2." starts a list outside a list item', ['- Para', '2. ```', '   TAG', '   ```', 'TAG'], [4]],
    ['"2." does not start a list in a list item paragraph', ['- Para', '  2. ```', '     TAG', '     ```', '  TAG'], [2]],
    ['a tag line ends a paragraph', ['Para', '{% if $x %}', '2. ```', '   TAG', '   ```', 'TAG'], [5]],
    ['a tag line indented 4+ columns is paragraph text', ['Para', '    {% if $x %}', '2. ```', '   TAG', '   ```', 'TAG'], [3]],
    ['``` at column 0 ends a list item and its fence', ['- ```', '  code', '```', 'TAG', '```', 'TAG'], [5]],
    ['``` at column 0 ends a blockquote and its fence', ['> ```', '> code', '```', 'TAG', '```', 'TAG'], [5]],
    ['a line outside a list item ends its fence', ['- ```', '  code', '', 'after', 'TAG'], [4]],
    ['a blank line keeps a list item and its fence', ['- ```', '  code', '', '  TAG', '  ```', 'TAG'], [5]],
    ['a blank line ends an empty list item', ['-', '', '  ```', '  TAG', '  ```', 'TAG'], [5]],
    ['a thematic break is not a list item', ['- - -', '  ```', '  TAG', '  ```', 'TAG'], [4]],
    ['a heading cannot continue a quote lazily', ['> # Title', '```', 'TAG', '```', 'TAG'], [4]],
    ['a blockquote continues at a > indented 4+ columns', ['> ```', '    > TAG', '> ```', 'TAG'], [3]],
    ['a blockquote takes a lazy line indented 4+ columns', ['> Quote', '    ```', '2. ```', '   TAG'], []],
    ['nested blockquotes end at an indented line that starts a block', ['>> Quote', '    - x', '10. ```', 'TAG', '```'], [3]],
    ['a list item wider than 4 columns ends at an indented fence', ['-    Item', '    ```', '     ```', '     TAG'], [3]],
    ['a list item wider than 4 columns takes an indented list marker lazily', ['-    Item', '    - x', '     ```', '     TAG'], []],
  ])('%s', (_name, lines, expanded) => {
    const result = expandedTagLines(lines);
    expect(result.markdoc).toEqual(expanded);
    expect(result.expanded).toEqual(expanded);
  });

  it('does not add a closing fence after a list item fence that the list already ended', () => {
    const files = { 'page.md': '{% include "part.md" %}\n\nEnd', 'part.md': '- ```js\n  code\n\nafter\n' };
    const output = expandVirtual(files, 'page.md');
    expect(output).toBe('- ```js\n  code\n\nafter\n\nEnd');
    expect(markdocFences(output)).toEqual([['js', 'code\n\n']]);
  });

  it('finds the same tag lines as Markdoc in generated documents (seeded fuzz)', () => {
    const quotes = [
      '', '', '', ' ', '  ', '   ', '    ', '     ', '      ', '\t', ' \t', '> ', '>', '>\t', '> > ', '>>', '>>>', ' > ',
      '    > ', '>     ', '> >     ',
    ];
    const markers = [
      '- ', '-\t', '*\t', '+ ', '1. ', '2. ', '1)\t', '10. ', '100. ', '123456789. ', '1234567890. ', '-    ',
      '-      ', '1.   ', '  - ', '   - ', '    - ', '> - ', '- > ', '-    > ', '>> - ', '- - ', '1. - ', ' -  ',
    ];
    const bodies = [
      '```', '```js', '````', '~~~', '~~~~', '``` `x`', '~~~ `x`', 'x ```', 'text', 'text', '', '', '# Title',
      '#Title', '---', '***', '- - -', '{% if $x %}', '{% $x %}', '{% a "%}" %}', '-', '1.', '2.', '2. x', '- x', '*',
      '>', '> x', '> ```', '- ```', '  ```', '    ```', '\t```', ' \t```', 'TAG', 'TAG', 'TAG', '    TAG',
    ];
    const random = seededRandom(20261011);
    for (let run = 0; run < 1000; run++) {
      // A first line of `---` inside a blockquote or list item is frontmatter
      // to Markdoc, so start every document with a heading.
      const lines = ['# Page'];
      const count = 1 + Math.floor(random() * 12);
      while (lines.length <= count) {
        const body = pick(random, bodies);
        // The resolver matches a tag only after indentation and `>` markers.
        const prefix = body.includes('TAG') || random() < 0.6 ? pick(random, quotes) : pick(random, markers);
        if (!hasTabInNestedQuote(prefix + body)) lines.push(prefix + body);
      }
      const result = expandedTagLines(lines);
      expect({ source: result.source, expanded: result.expanded }).toEqual({
        source: result.source,
        expanded: result.markdoc,
      });
    }
  });
});

// ---------------------------------------------------------------------------
// Tabs
// ---------------------------------------------------------------------------

describe('resolveIncludes: tabs in fenced code', () => {
  const code = 'func f() {\n\treturn 1\n}\n';
  const part = '```go\n' + code + '```';

  it.each([
    ['a list item', '- Item\n\n  {% include "part.md" %}', '- Item\n\n  ```go\n  func f() {\n  \treturn 1\n  }\n  ```'],
    ['an ordered list item', '1. Item\n\n   {% include "part.md" %}', '1. Item\n\n   ```go\n   func f() {\n   \treturn 1\n   }\n   ```'],
    ['a blockquote', '> {% include "part.md" %}', '> ```go\n> func f() {\n> \treturn 1\n> }\n> ```'],
    ['a blockquote without a space', '>{% include "part.md" %}', '>```go\n>func f() {\n> \treturn 1\n>}\n>```'],
    ['a list item in a blockquote', '> - Item\n>\n>   {% include "part.md" %}', '> - Item\n>\n>   ```go\n>   func f() {\n>   \treturn 1\n>   }\n>   ```'],
  ])('keeps the tabs in included code inside %s', (_name, page, expected) => {
    const output = expandVirtual({ 'page.md': page, 'part.md': part }, 'page.md');
    expect(output).toBe(expected);
    expect(markdocFences(part)).toEqual([['go', code]]);
    expect(markdocFences(output)).toEqual([['go', code]]);
  });

  it('keeps the tabs in included code through nested includes', () => {
    const files = {
      'page.md': '- Item\n\n  {% include "mid.md" %}',
      'mid.md': '> Quote\n>\n> {% include "part.md" %}',
      'part.md': part,
    };
    expect(markdocFences(expandVirtual(files, 'page.md'))).toEqual([['go', code]]);
  });

  it('turns a tab into spaces where the fence removes indentation, as Markdoc does', () => {
    // The list item takes 2 columns of each code line: Markdoc keeps the other
    // 2 columns of the first tab as spaces, and the tab after two spaces as is.
    const part = '- ```\n\tcode\n  \tmore\n  ```';
    expect(markdocFences(part)).toEqual([['', '  code\n\tmore\n']]);
    const output = expandVirtual({ 'page.md': '> {% include "part.md" %}', 'part.md': part }, 'page.md');
    expect(output).toBe('> - ```\n>     code\n>   \tmore\n>   ```');
    expect(markdocFences(output)).toEqual([['', '  code\n\tmore\n']]);
  });

  it.each([['{% include "part.md" %}'], ['- Item\n\n  {% include "part.md" %}'], ['> {% include "part.md" %}'], ['>{% include "part.md" %}']])(
    'keeps a tab right after > in quoted code, in %j',
    (page) => {
      // markdown-it reads the tab's first column as the space after `>` and keeps the tab.
      const part = '>```\n>\tcode\n>```';
      expect(markdocFences(part)).toEqual([['', '\tcode\n']]);
      expect(markdocFences(expandVirtual({ 'page.md': page, 'part.md': part }, 'page.md'))).toEqual([['', '\tcode\n']]);
    },
  );

  it('keeps the indentation of lines included after a bare >', () => {
    const files = { 'page.md': '>{% include "part.md" %}', 'part.md': '  ```\n  code\n    indented\n  ```' };
    const output = expandVirtual(files, 'page.md');
    expect(output).toBe('>   ```\n>   code\n>     indented\n>   ```');
    expect(markdocFences(output)).toEqual(markdocFences(files['part.md']));
  });

  it('reads the same fenced code in an included file as in the file on its own (seeded fuzz)', () => {
    // Pages whose include tag sits exactly where its container's content starts.
    const pages: Array<Record<string, string>> = [
      { 'page.md': '{% include "part.md" %}' },
      { 'page.md': '- Item\n\n  {% include "part.md" %}\n\nAfter' },
      { 'page.md': '10. Item\n\n    {% include "part.md" %}\n\nAfter' },
      { 'page.md': '-\tItem\n\n\t{% include "part.md" %}\n\nAfter' },
      { 'page.md': '> Quote\n>\n> {% include "part.md" %}\n\nAfter' },
      { 'page.md': '>Quote\n>\n>{% include "part.md" %}\n\nAfter' },
      { 'page.md': '> - Item\n>\n>   {% include "part.md" %}\n\nAfter' },
      { 'page.md': '- > Quote\n  >\n  > {% include "part.md" %}\n\nAfter' },
      { 'page.md': '- Item\n\n  {% include "mid.md" %}\n\nAfter', 'mid.md': '> Quote\n>\n> {% include "part.md" %}' },
      { 'page.md': '> {% include "mid.md" %}', 'mid.md': '-\tItem\n\n\t{% include "part.md" %}' },
      { 'page.md': '>{% include "mid.md" %}', 'mid.md': '1. Item\n\n   >{% include "part.md" %}' },
    ];
    const prefixes = [
      '', '', '', '', ' ', '  ', '   ', '    ', '     ', '\t', '\t\t', ' \t', '  \t', '   \t', '> ', '>', '>\t', '> \t',
      '> > ', '>>', ' > ', '    > ', '>     ', '- ', '-\t', '-  \t', '-    ', '1. ', '1.\t', '10.\t', '100. ', '  - ',
      '> - ', '- > ', '>\t- ', '-\t>\t',
    ];
    const bodies = [
      '```', '```', '```js', '````', '~~~', '~~~~', '\tcode', '\t\tcode', ' \tcode', '  \tcode', '   \tcode', 'code',
      '  code', 'a\tb', '\t', ' \t ', '', '', 'text', '# Title', '{% if $x %}', '- item', '2. item', '    - x', '>',
      '***', '\t```', ' \t```', '  \t```', '    ```', '\t~~~', '-\t```',
    ];
    // A line that looks like a closing fence but is indented 4+ columns stays
    // code; tabs in its indentation become spaces, since they decide that.
    const normalize = (fences: Array<[string, string]>) =>
      fences.map(([info, content]) => [info, content.replace(/^[ \t]+(?=(?:`{3,}|~{3,})[ \t]*$)/gm, '')]);
    const random = seededRandom(1011);
    for (let run = 0; run < 300; run++) {
      const lines: string[] = [];
      const count = 2 + Math.floor(random() * 10);
      while (lines.length < count) {
        const line = pick(random, prefixes) + pick(random, bodies);
        if (!hasTabInNestedQuote(line)) lines.push(line);
      }
      // An included file loses its trailing blank lines.
      while (lines.length > 0 && lines[lines.length - 1].trim() === '') lines.pop();
      const file = lines.join('\n');
      const expected = normalize(markdocFences(file + '\n'));
      for (const page of pages) {
        const output = expandVirtual({ ...page, 'part.md': file }, 'page.md');
        expect({ file, page: page['page.md'], fences: normalize(markdocFences(output + '\n')) }).toEqual({
          file,
          page: page['page.md'],
          fences: expected,
        });
      }
    }
  });

  it('keeps a line that looks like a closing fence but is indented 4+ columns as code', () => {
    // Under the list item's two columns, the tab would be 2 columns wide and the
    // line would close the fence, so its indentation is written as spaces.
    const part = '```\n \t```\ncode\n```';
    expect(markdocFences(part)).toEqual([['', ' \t```\ncode\n']]);
    const output = expandVirtual({ 'page.md': '- Item\n\n  {% include "part.md" %}', 'part.md': part }, 'page.md');
    expect(output).toBe('- Item\n\n  ```\n      ```\n  code\n  ```');
    expect(markdocFences(output)).toEqual([['', '    ```\ncode\n']]);
  });

  it('closes a fence opened after a > without a space inside the same list item', () => {
    // The space after `>` on the code line is part of the marker, so the code
    // is 2 columns into the item. The added closing fence needs that space too.
    const part = '>- ```js\n>   code';
    expect(markdocFences(part + '\n')).toEqual([['js', 'code\n']]);
    const output = expandVirtual({ 'page.md': '> {% include "part.md" %}\n\nAfter', 'part.md': part }, 'page.md');
    expect(output).toBe('> >- ```js\n> >   code\n> >   ```\n\nAfter');
    expect(markdocFences(output)).toEqual([['js', 'code\n']]);
  });
});

// ---------------------------------------------------------------------------
// Pathological input
// ---------------------------------------------------------------------------

describe('resolveIncludes: pathological lines', () => {
  const n = 100_000;
  const fence = '`'.repeat(n);
  const lines: Array<[string, string]> = [
    ['spaces before a missing %}', '{% include "x.md"' + ' '.repeat(n) + 'X'],
    ['tabs before a missing %}', '{% include "x.md"' + '\t'.repeat(n) + '!'],
    ['spaces around a slash', '{% include "x.md"' + ' '.repeat(n) + '/' + ' '.repeat(n) + 'X'],
    ['spaces after %}', '{% include "x.md" %}' + ' '.repeat(n) + 'X'],
    ['spaces around include', ' '.repeat(n) + '{%' + ' '.repeat(n) + 'include' + ' '.repeat(n)],
    ['spaces around file=', '{% include' + ' '.repeat(n) + 'file' + ' '.repeat(n) + '=' + ' '.repeat(n)],
    ['an unterminated path', '{% include "' + 'x'.repeat(n)],
    ['nested quote markers', '> '.repeat(n / 2) + '{% include "x.md" %} X'],
    ['quote markers with spaces', ' '.repeat(n) + '>' + ' '.repeat(n) + '{%'],
    ['a fence with a line separator', fence + '\u2028'],
    ['a fence with a trailing backtick', fence + ' '.repeat(n) + '`'],
    ['list markers before a fence', '- '.repeat(n / 2) + 'x```'],
    ['ordered markers before a fence', '1. '.repeat(n / 3) + '```'],
    ['alternating list markers before a fence', '- * '.repeat(n / 4) + '```'],
    ['list and quote markers before a fence', '- > '.repeat(n / 4) + '```'],
    ['spaces before a fence', ' '.repeat(n) + 'x```'],
    ['a run of #', '#'.repeat(n)],
    ['a tag that never closes', '{% if "' + '\\"'.repeat(n / 2)],
  ];

  it.each(lines)('handles %s in linear time', (_name, line) => {
    const options = { filePath: v('page.md'), root: VROOT, readFile: () => '', onError: () => '' };
    expect(timed(() => resolveIncludes(`${line}\n${line}`, options))).toBeLessThan(1000);
    // Inside an open fence, the same lines go through the closing-fence check.
    expect(timed(() => resolveIncludes(`\`\`\`\n${line}\n> ${line}`, options))).toBeLessThan(1000);
    expect(timed(() => resolveIncludes(`> \`\`\`\n${line}\n> ${line}`, options))).toBeLessThan(1000);
  });

  it('handles many lines in deeply nested containers in linear time', () => {
    const options = { filePath: v('page.md'), root: VROOT, readFile: () => '', onError: () => '' };
    const quoted = Array(10_000).fill('> '.repeat(200) + '- x').join('\n');
    expect(timed(() => resolveIncludes(quoted, options))).toBeLessThan(1000);
    const listed = Array(10_000).fill('    '.repeat(200) + '- x').join('\n');
    expect(timed(() => resolveIncludes(listed, options))).toBeLessThan(1000);
  });
});

// ---------------------------------------------------------------------------
// Limits and caching
// ---------------------------------------------------------------------------

describe('resolveIncludes: maxIncludes and the read cache', () => {
  /** `fan` includes of the next level per file, `depth` levels deep. */
  function fanOut(fan: number, depth: number) {
    const files: Record<string, string> = {};
    for (let d = 0; d < depth; d++) {
      files[`d${d}.md`] = Array.from({ length: fan }, () => `{% include "d${d + 1}.md" %}`).join('\n');
    }
    files[`d${depth}.md`] = 'leaf';
    return files;
  }

  it('stops an exponential include tree quickly with a limit error', () => {
    const files = fanOut(10, 6); // 10^6 leaves without a limit
    const { readFile, reads } = memoryReader(files);
    let error: IncludeError | undefined;
    const ms = timed(() => {
      error = catchIncludeError(() =>
        resolveIncludes(files['d0.md'], { filePath: v('d0.md'), root: VROOT, readFile }),
      );
    });
    expect(error!.code).toBe('limit');
    // Depth-first: 3 + 8 * 111 + 1 + 9 * 11 + 1 + 8 = 1000 includes, then the 9th tag of a d5.md.
    expect(error!.message).toBe('Include "d6.md" exceeds the limit of 1000 includes (in d5.md:9)');
    expect(reads.length).toBeLessThanOrEqual(7);
    expect(ms).toBeLessThan(1000);
  });

  it('allows exactly maxIncludes includes, counting repeats and nested files', () => {
    const files = {
      'page.md': '{% include "a.md" %}\n{% include "a.md" %}',
      'a.md': 'A\n{% include "b.md" %}',
      'b.md': 'B',
    };
    expect(expandVirtual(files, 'page.md', { maxIncludes: 4 })).toBe('A\nB\nA\nB');

    const error = catchIncludeError(() => expandVirtual(files, 'page.md', { maxIncludes: 3 }));
    expect(error.code).toBe('limit');
    expect(error.target).toBe('b.md');
    expect(error.file).toBe(v('b.md'));
    expect(error.from).toBe(v('a.md'));
    expect(error.line).toBe(2);
    expect(error.chain).toEqual([v('page.md'), v('a.md')]);
  });

  it('defaults maxIncludes to 1000', () => {
    const files = { 'page.md': Array(1000).fill('{% include "p.md" %}').join('\n'), 'p.md': 'p' };
    expect(expandVirtual(files, 'page.md').split('\n')).toHaveLength(1000);
    files['page.md'] += '\n{% include "p.md" %}';
    expect(catchIncludeError(() => expandVirtual(files, 'page.md')).code).toBe('limit');
  });

  it('accepts maxIncludes: 0 and Infinity', () => {
    const files = { 'page.md': '{% include "p.md" %}', 'p.md': 'p' };
    expect(catchIncludeError(() => expandVirtual(files, 'page.md', { maxIncludes: 0 })).code).toBe(
      'limit',
    );
    expect(expandVirtual(files, 'page.md', { maxIncludes: Infinity })).toBe('p');
  });

  it('counts only successful includes', () => {
    const files = {
      'page.md': '{% include "missing.md" %}\n{% include "p.md" %}\n{% include "p.md" %}',
      'p.md': 'p',
    };
    expect(expandVirtual(files, 'page.md', { maxIncludes: 2, onError: (e) => `[${e.code}]` })).toBe(
      '[not-found]\np\np',
    );
  });

  it('reads a file included many times only once per call', () => {
    const files = {
      'page.md': '{% include "p.md" %}\n{% include "./p.md" %}\n{% include "a.md" %}',
      'a.md': '{% include "p.md" %}',
      'p.md': 'p',
    };
    const { readFile, reads } = memoryReader(files);
    const onInclude = jest.fn();
    const options = { filePath: v('page.md'), root: VROOT, readFile, onInclude };
    expect(resolveIncludes(files['page.md'], options)).toBe('p\np\np');
    expect(reads).toEqual([v('p.md'), v('a.md')]);
    expect(onInclude).toHaveBeenCalledTimes(4);

    // The cache lives for one call only.
    resolveIncludes(files['page.md'], options);
    expect(reads).toHaveLength(4);
  });

  it('caches a failed read too', () => {
    const files = { 'page.md': '{% include "x.md" %}\n{% include "x.md" %}' };
    const { readFile, reads } = memoryReader(files);
    resolveIncludes(files['page.md'], { filePath: v('page.md'), root: VROOT, readFile, onError: () => '' });
    expect(reads).toEqual([v('x.md')]);
  });

  it('applies the limit and cache in resolveIncludesAsync too', async () => {
    const files = fanOut(10, 6);
    const { readFile, reads } = memoryReader(files);
    await expect(
      resolveIncludesAsync(files['d0.md'], { filePath: v('d0.md'), root: VROOT, readFile: async (f) => readFile(f) }),
    ).rejects.toMatchObject({ code: 'limit' });
    expect(reads.length).toBeLessThanOrEqual(7);
  });
});

describe('resolveIncludes: maxOutputLength', () => {
  const files = { 'page.md': 'Intro\n{% include "big.md" %}\nEnd', 'big.md': 'x'.repeat(50) };
  const expected = `Intro\n${'x'.repeat(50)}\nEnd`;

  it('allows a result of exactly maxOutputLength characters', () => {
    expect(expected).toHaveLength(60);
    expect(expandVirtual(files, 'page.md', { maxOutputLength: 60 })).toBe(expected);
  });

  it('raises a limit error for the include that makes the result longer', () => {
    const error = catchIncludeError(() => expandVirtual(files, 'page.md', { maxOutputLength: 59 }));
    expect(error.code).toBe('limit');
    expect(error.message).toBe('Include "big.md" exceeds the output limit of 59 characters (in page.md:2)');
    expect(error.target).toBe('big.md');
    expect(error.file).toBe(v('big.md'));
    expect(error.from).toBe(v('page.md'));
    expect(error.line).toBe(2);
    expect(error.chain).toEqual([v('page.md')]);
  });

  it('names the include whose content goes over, however deep', () => {
    const nested = {
      'page.md': '{% include "a.md" %}',
      'a.md': 'A\n{% include "b.md" %}',
      'b.md': 'B\nB\nB',
    };
    expect(expandVirtual(nested, 'page.md', { maxOutputLength: 7 })).toBe('A\nB\nB\nB');
    const error = catchIncludeError(() => expandVirtual(nested, 'page.md', { maxOutputLength: 6 }));
    expect(error.message).toBe('Include "b.md" exceeds the output limit of 6 characters (in a.md:2)');
    expect(error.chain).toEqual([v('page.md'), v('a.md')]);
  });

  it('counts the prefixes added to included lines', () => {
    const quoted = { 'page.md': '> {% include "part.md" %}', 'part.md': 'a\n\nb' };
    expect(expandVirtual(quoted, 'page.md', { maxOutputLength: 9 })).toBe('> a\n>\n> b');
    expect(catchIncludeError(() => expandVirtual(quoted, 'page.md', { maxOutputLength: 8 })).code).toBe('limit');
  });

  it('counts the text onError returns', () => {
    const page = { 'page.md': '{% include "missing.md" %}' };
    const onError = () => 'replacement';
    expect(expandVirtual(page, 'page.md', { onError, maxOutputLength: 11 })).toBe('replacement');
    const error = catchIncludeError(() => expandVirtual(page, 'page.md', { onError, maxOutputLength: 10 }));
    expect(error.message).toBe('Include "missing.md" exceeds the output limit of 10 characters (in page.md:1)');
  });

  it('throws the limit error without calling onError', () => {
    const onError = jest.fn(() => '');
    const error = catchIncludeError(() => expandVirtual(files, 'page.md', { maxOutputLength: 10, onError }));
    expect(error.code).toBe('limit');
    expect(onError).not.toHaveBeenCalled();
  });

  it('returns a source with no includes whatever its length', () => {
    const source = 'x'.repeat(100);
    expect(resolveIncludes(source, { filePath: v('page.md'), maxOutputLength: 10 })).toBe(source);
    // An empty included file adds nothing, so it cannot go over.
    const empty = { 'page.md': `${source}\n{% include "empty.md" %}`, 'empty.md': '' };
    expect(expandVirtual(empty, 'page.md', { maxOutputLength: 10 })).toBe(source);
  });

  it('stops prefix amplification quickly, before building the long lines', () => {
    // 100,000 included lines under a 100,000-character prefix would be 10^10 characters.
    const wide = { 'page.md': ' '.repeat(100_000) + '{% include "lines.md" %}', 'lines.md': 'x\n'.repeat(100_000) };
    let error: IncludeError | undefined;
    const ms = timed(() => {
      error = catchIncludeError(() => expandVirtual(wide, 'page.md'));
    });
    expect(error!.message).toBe('Include "lines.md" exceeds the output limit of 10000000 characters (in page.md:1)');
    expect(ms).toBeLessThan(1000);
  });

  it('defaults maxOutputLength to 10,000,000 characters', () => {
    const big = { 'page.md': '{% include "big.md" %}', 'big.md': 'x'.repeat(10_000_000) };
    expect(expandVirtual(big, 'page.md')).toHaveLength(10_000_000);
    big['big.md'] += 'x';
    expect(catchIncludeError(() => expandVirtual(big, 'page.md')).code).toBe('limit');
  });

  it('accepts maxOutputLength: 0 and Infinity', () => {
    expect(catchIncludeError(() => expandVirtual(files, 'page.md', { maxOutputLength: 0 })).code).toBe('limit');
    expect(expandVirtual(files, 'page.md', { maxOutputLength: Infinity })).toBe(expected);
  });

  it('applies the limit in resolveIncludesAsync too', async () => {
    const { readFile } = memoryReader(files);
    const options = { filePath: v('page.md'), root: VROOT, readFile: async (file: string) => readFile(file) };
    await expect(resolveIncludesAsync(files['page.md'], { ...options, maxOutputLength: 60 })).resolves.toBe(expected);
    await expect(resolveIncludesAsync(files['page.md'], { ...options, maxOutputLength: 59 })).rejects.toMatchObject({
      code: 'limit',
      message: 'Include "big.md" exceeds the output limit of 59 characters (in page.md:2)',
    });
  });
});

// ---------------------------------------------------------------------------
// Extensions
// ---------------------------------------------------------------------------

describe('resolveIncludes: extensions', () => {
  it.each([['/.env'], ['.env'], ['notes.txt'], ['config.json'], ['README'], ['page.md.bak']])(
    'rejects %j by default without reading it',
    (target) => {
      const { readFile, reads } = memoryReader({});
      const error = catchIncludeError(() =>
        resolveIncludes(`{% include "${target}" %}`, { filePath: v('page.md'), root: VROOT, readFile }),
      );
      expect(error.code).toBe('extension');
      expect(error.target).toBe(target);
      expect(error.message).toBe(
        `Include "${target}" is not an allowed file type, expected .md, .mdoc or .markdown (in page.md:1)`,
      );
      expect(reads).toEqual([]);
    },
  );

  it('accepts .md, .mdoc and .markdown in any case', () => {
    const files = {
      'page.md': '{% include "a.md" %}\n{% include "b.MD" %}\n{% include "c.mdoc" %}\n{% include "d.Markdown" %}',
      'a.md': 'a',
      'b.MD': 'b',
      'c.mdoc': 'c',
      'd.Markdown': 'd',
    };
    expect(expandVirtual(files, 'page.md')).toBe('a\nb\nc\nd');
  });

  it('accepts a custom list, with or without leading dots', () => {
    const files = { 'page.md': '{% include "a.txt" %}\n{% include "b.MDX" %}', 'a.txt': 'a', 'b.MDX': 'b' };
    expect(expandVirtual(files, 'page.md', { extensions: ['.txt', 'mdx'] })).toBe('a\nb');
    const error = catchIncludeError(() =>
      expandVirtual({ 'page.md': '{% include "a.md" %}', 'a.md': 'a' }, 'page.md', { extensions: ['.txt'] }),
    );
    expect(error.code).toBe('extension');
    expect(error.message).toBe('Include "a.md" is not an allowed file type, expected .txt (in page.md:1)');
  });

  it('allows any file with extensions: false', () => {
    const files = { 'page.md': '{% include "/.env" %}\n{% include "LICENSE" %}', '.env': 'A=1', LICENSE: 'MIT' };
    expect(expandVirtual(files, 'page.md', { extensions: false })).toBe('A=1\nMIT');
  });
});

// ---------------------------------------------------------------------------
// Errors
// ---------------------------------------------------------------------------

describe('resolveIncludes: errors', () => {
  it('reports a missing file with target, file, from, line and chain', () => {
    const files = {
      'guide/page.md': '# Page\n\nText\n\n{% include "parts/x.md" %}\n',
    };
    const error = catchIncludeError(() => expandVirtual(files, 'guide/page.md'));
    expect(error.name).toBe('IncludeError');
    expect(error).toBeInstanceOf(Error);
    expect(error.code).toBe('not-found');
    expect(error.target).toBe('parts/x.md');
    expect(error.file).toBe(v('guide/parts/x.md'));
    expect(error.from).toBe(v('guide/page.md'));
    expect(error.line).toBe(5);
    expect(error.chain).toEqual([v('guide/page.md')]);
    expect(error.message).toBe('Include "parts/x.md" not found (in guide/page.md:5)');
  });

  it('reports the line within a nested file, counting its frontmatter lines', () => {
    const files = {
      'page.md': 'Intro\n{% include "a.md" %}',
      'a.md': '---\ntitle: A\n---\n\nA text\n\n{% include "missing.md" %}',
    };
    const error = catchIncludeError(() => expandVirtual(files, 'page.md'));
    expect(error.code).toBe('not-found');
    expect(error.from).toBe(v('a.md'));
    expect(error.line).toBe(7);
    expect(error.chain).toEqual([v('page.md'), v('a.md')]);
    expect(error.message).toBe('Include "missing.md" not found (in a.md:7)');
  });

  it('counts lines in a CRLF entry, and after entry frontmatter, correctly', () => {
    const files = { 'page.md': 'a\r\nb\r\n{% include "missing.md" %}\r\n' };
    expect(catchIncludeError(() => expandVirtual(files, 'page.md')).line).toBe(3);
    const withFrontmatter = { 'page.md': '\uFEFF---\nt: 1\n---\n\n{% include "missing.md" %}' };
    expect(catchIncludeError(() => expandVirtual(withFrontmatter, 'page.md')).line).toBe(5);
  });

  it('reports an empty target as not-found', () => {
    const error = catchIncludeError(() => expandVirtual({ 'page.md': '{% include "" %}' }, 'page.md'));
    expect(error.code).toBe('not-found');
    expect(error.file).toBeUndefined();
  });

  it('detects a direct self-include', () => {
    const files = { 'a.md': 'A\n{% include "a.md" %}' };
    const error = catchIncludeError(() => expandVirtual(files, 'a.md'));
    expect(error.code).toBe('cycle');
    expect(error.file).toBe(v('a.md'));
    expect(error.from).toBe(v('a.md'));
    expect(error.line).toBe(2);
    expect(error.chain).toEqual([v('a.md')]);
    expect(error.message).toBe('Include cycle: a.md -> a.md (in a.md:2)');
  });

  it('detects an indirect cycle and shows the chain', () => {
    const files = {
      'a.md': '{% include "dir/b.md" %}',
      'dir/b.md': 'B\n\n{% include "../a.md" %}',
    };
    const error = catchIncludeError(() => expandVirtual(files, 'a.md'));
    expect(error.code).toBe('cycle');
    expect(error.target).toBe('../a.md');
    expect(error.file).toBe(v('a.md'));
    expect(error.from).toBe(v('dir/b.md'));
    expect(error.line).toBe(3);
    expect(error.chain).toEqual([v('a.md'), v('dir/b.md')]);
    expect(error.message).toBe('Include cycle: a.md -> dir/b.md -> a.md (in dir/b.md:3)');
  });

  it('rejects ../ paths that escape root', () => {
    const files = { 'docs/page.md': '{% include "../../secret.md" %}' };
    const { readFile, reads } = memoryReader(files);
    const error = catchIncludeError(() =>
      resolveIncludes(files['docs/page.md'], {
        filePath: v('docs/page.md'),
        root: VROOT,
        readFile,
      }),
    );
    expect(error.code).toBe('outside-root');
    expect(error.file).toBe(path.resolve(VROOT, '..', 'secret.md'));
    expect(error.message).toBe(
      'Include "../../secret.md" resolves outside the root directory (in docs/page.md:1)',
    );
    expect(reads).toEqual([]);
  });

  it('rejects root-relative paths that escape root', () => {
    const error = catchIncludeError(() =>
      expandVirtual({ 'page.md': '{% include "/../secret.md" %}' }, 'page.md'),
    );
    expect(error.code).toBe('outside-root');
  });

  it('enforces maxDepth (entry file = depth 0)', () => {
    const files = {
      'page.md': '{% include "d1.md" %}',
      'd1.md': '{% include "d2.md" %}',
      'd2.md': '{% include "d3.md" %}',
      'd3.md': 'Deep',
    };
    expect(expandVirtual(files, 'page.md', { maxDepth: 3 })).toBe('Deep');

    const error = catchIncludeError(() => expandVirtual(files, 'page.md', { maxDepth: 2 }));
    expect(error.code).toBe('max-depth');
    expect(error.target).toBe('d3.md');
    expect(error.from).toBe(v('d2.md'));
    expect(error.chain).toEqual([v('page.md'), v('d1.md'), v('d2.md')]);
    expect(error.message).toBe(
      'Include "d3.md" exceeds the maximum include depth of 2 (in d2.md:1)',
    );

    expect(catchIncludeError(() => expandVirtual(files, 'page.md', { maxDepth: 0 })).code).toBe(
      'max-depth',
    );
  });

  it('defaults maxDepth to 16', () => {
    const files: Record<string, string> = { 'page.md': '{% include "d1.md" %}' };
    for (let i = 1; i <= 17; i++) files[`d${i}.md`] = `{% include "d${i + 1}.md" %}`;
    files['d16.md'] = 'Bottom';
    expect(expandVirtual(files, 'page.md')).toBe('Bottom');
    files['d16.md'] = '{% include "d17.md" %}';
    expect(catchIncludeError(() => expandVirtual(files, 'page.md')).code).toBe('max-depth');
  });

  it('reports other read errors as read-failed with the cause', () => {
    const cause = Object.assign(new Error('EACCES: permission denied'), { code: 'EACCES' });
    const error = catchIncludeError(() =>
      resolveIncludes('{% include "locked.md" %}', {
        filePath: v('page.md'),
        root: VROOT,
        readFile: () => {
          throw cause;
        },
      }),
    );
    expect(error.code).toBe('read-failed');
    expect(error.cause).toBe(cause);
    expect(error.message).toBe(
      'Include "locked.md" could not be read: EACCES: permission denied (in page.md:1)',
    );
  });

  it('treats ENOTDIR and EISDIR from a custom reader as not-found', () => {
    for (const code of ['ENOTDIR', 'EISDIR']) {
      const error = catchIncludeError(() =>
        resolveIncludes('{% include "x.md" %}', {
          filePath: v('page.md'),
          root: VROOT,
          readFile: () => {
            throw Object.assign(new Error(code), { code });
          },
        }),
      );
      expect(error.code).toBe('not-found');
      expect(error.cause).toBeUndefined();
    }
  });

  it('reports a non-string readFile result as read-failed', () => {
    const error = catchIncludeError(() =>
      resolveIncludes('{% include "x.md" %}', {
        filePath: v('page.md'),
        root: VROOT,
        readFile: () => undefined as unknown as string,
      }),
    );
    expect(error.code).toBe('read-failed');
    expect(error.cause).toBeInstanceOf(TypeError);
  });
});

describe('resolveIncludes: option validation', () => {
  const filePath = v('p.md');
  const bad = <T>(value: T) => value as never;

  it.each([
    ['a non-string source', () => resolveIncludes(bad(Buffer.from('x')), { filePath })],
    ['an undefined source', () => resolveIncludes(bad(undefined), { filePath })],
    ['missing options', () => resolveIncludes('x', bad(undefined))],
    ['a missing filePath', () => resolveIncludes('x', bad({}))],
    ['an empty filePath', () => resolveIncludes('x', { filePath: '' })],
    ['a non-string filePath', () => resolveIncludes('x', { filePath: bad(1) })],
    ['a non-string root', () => resolveIncludes('x', { filePath, root: bad(1) })],
    ['a non-function readFile', () => resolveIncludes('x', { filePath, readFile: bad('fs') })],
    ['a non-function onError', () => resolveIncludes('x', { filePath, onError: bad('') })],
    ['a non-function onInclude', () => resolveIncludes('x', { filePath, onInclude: bad({}) })],
    ['a string maxDepth', () => resolveIncludes('x', { filePath, maxDepth: bad('2') })],
    ['a null maxIncludes', () => resolveIncludes('x', { filePath, maxIncludes: bad(null) })],
    ['a string maxOutputLength', () => resolveIncludes('x', { filePath, maxOutputLength: bad('10') })],
    ['a string extensions', () => resolveIncludes('x', { filePath, extensions: bad('.md') })],
    ['true extensions', () => resolveIncludes('x', { filePath, extensions: bad(true) })],
    ['non-string extensions', () => resolveIncludes('x', { filePath, extensions: bad([1]) })],
    ['a non-boolean checkRealPaths', () => resolveIncludes('x', { filePath, checkRealPaths: bad('yes') })],
  ])('throws a TypeError for %s', (_name, call) => {
    expect(call).toThrow(TypeError);
  });

  it.each([
    ['maxDepth', -1],
    ['maxDepth', NaN],
    ['maxIncludes', -1],
    ['maxIncludes', NaN],
    ['maxOutputLength', -1],
    ['maxOutputLength', NaN],
  ])('throws a RangeError for %s: %p', (name, value) => {
    expect(() => resolveIncludes('x', { filePath, [name]: value } as ResolveIncludesOptions)).toThrow(RangeError);
  });

  it('names the problem in the message', () => {
    expect(() => resolveIncludes('x', { filePath: '' })).toThrow(
      'resolveIncludes: options.filePath must be a non-empty string',
    );
    expect(() => resolveIncludes('x', { filePath, maxIncludes: -1 })).toThrow(
      'resolveIncludes: options.maxIncludes must be a number >= 0',
    );
  });

  it('rejects invalid options in resolveIncludesAsync', async () => {
    await expect(resolveIncludesAsync(bad(null), { filePath })).rejects.toThrow(TypeError);
    await expect(resolveIncludesAsync('x', { filePath, maxDepth: -1 })).rejects.toThrow(
      'resolveIncludesAsync: options.maxDepth must be a number >= 0',
    );
  });
});

// ---------------------------------------------------------------------------
// Callbacks
// ---------------------------------------------------------------------------

describe('resolveIncludes: onError and onInclude', () => {
  it('replaces the tag line with the onError result and keeps going', () => {
    const files = {
      'page.md': 'A\n\n{% include "missing.md" %}\n\n{% include "part.md" %}',
      'part.md': 'Part\n{% include "also-missing.md" %}',
    };
    const seen: string[] = [];
    const out = expandVirtual(files, 'page.md', {
      onError: (error) => {
        seen.push(`${error.code}:${error.target}`);
        return `> Missing: ${error.target}`;
      },
    });
    expect(out).toBe('A\n\n> Missing: missing.md\n\nPart\n> Missing: also-missing.md');
    expect(seen).toEqual(['not-found:missing.md', 'not-found:also-missing.md']);
  });

  it('indents onError text like included content, and removes the line for an empty string', () => {
    const files = {
      'page.md': '- Item\n  {% include "missing.md" %}\n- Next\n  {% include "gone.md" %}\n- Last',
    };
    const out = expandVirtual(files, 'page.md', {
      onError: (error) => (error.target === 'gone.md' ? '' : 'Line 1\r\nLine 2\n'),
    });
    expect(out).toBe('- Item\n  Line 1\n  Line 2\n- Next\n- Last');
  });

  it('handles a cycle through onError without recursing', () => {
    const files = { 'a.md': 'A\n{% include "b.md" %}', 'b.md': 'B\n{% include "a.md" %}' };
    const out = expandVirtual(files, 'a.md', { onError: (e) => `<!-- ${e.code} -->` });
    expect(out).toBe('A\nB\n<!-- cycle -->');
  });

  it.each([
    ['undefined', undefined, 'got undefined'],
    ['null', null, 'got null'],
    ['a number', 1, 'got a number'],
    ['a promise', Promise.resolve('x'), 'got a promise'],
  ])('throws a TypeError when onError returns %s', (_name, value, detail) => {
    const files = { 'page.md': 'A\n{% include "missing.md" %}' };
    const error = catchError(() => expandVirtual(files, 'page.md', { onError: () => value as never }));
    expect(error).toBeInstanceOf(TypeError);
    expect((error as Error).message).toContain('resolveIncludes: options.onError must return a string');
    expect((error as Error).message).toContain(detail);
  });

  it('lets errors thrown by onError and onInclude propagate unchanged', async () => {
    const files = { 'page.md': '{% include "p.md" %}\n{% include "missing.md" %}', 'p.md': 'p' };
    const fromOnError = new Error('from onError');
    const fromOnInclude = new Error('from onInclude');
    const { readFile } = memoryReader(files);
    const base = { filePath: v('page.md'), root: VROOT, readFile };
    const onError = () => {
      throw fromOnError;
    };
    const onInclude = () => {
      throw fromOnInclude;
    };

    expect(catchError(() => resolveIncludes(files['page.md'], { ...base, onError }))).toBe(fromOnError);
    expect(catchError(() => resolveIncludes(files['page.md'], { ...base, onInclude }))).toBe(fromOnInclude);
    await expect(resolveIncludesAsync(files['page.md'], { ...base, onError })).rejects.toBe(fromOnError);
    await expect(resolveIncludesAsync(files['page.md'], { ...base, onInclude })).rejects.toBe(fromOnInclude);
  });

  it('calls onInclude for each included file in document order, but not for failures', () => {
    const files = {
      'page.md': '{% include "a.md" %}\n{% include "parts/b.md" %}\n{% include "missing.md" %}',
      'a.md': 'A',
      'parts/b.md': '{% include "c.md" %}',
      'parts/c.md': 'C',
    };
    const calls: Array<[string, string]> = [];
    const errors: Array<string | undefined> = [];
    expandVirtual(files, 'page.md', {
      onInclude: (file, from) => calls.push([file, from]),
      onError: (error) => {
        errors.push(error.file);
        return '';
      },
    });
    expect(calls).toEqual([
      [v('a.md'), v('page.md')],
      [v('parts/b.md'), v('page.md')],
      [v('parts/c.md'), v('parts/b.md')],
    ]);
    // A watcher can still pick up the missing file's path from the error.
    expect(errors).toEqual([v('missing.md')]);
  });
});

// ---------------------------------------------------------------------------
// IncludeError
// ---------------------------------------------------------------------------

describe('IncludeError', () => {
  const brand = Symbol.for('@vaneui/md/IncludeError');

  it('brands its instances', () => {
    const error = catchIncludeError(() => expandVirtual({ 'page.md': '{% include "x.md" %}' }, 'page.md'));
    expect((error as unknown as Record<symbol, unknown>)[brand]).toBe(true);
    expect(Object.getOwnPropertyDescriptor(error, brand)?.enumerable).toBe(false);
  });

  const isIncludeError = (value: unknown) => (value as object) instanceof IncludeError;

  it('recognizes branded errors from another copy of the module', () => {
    expect(isIncludeError(Object.assign(new Error('copy'), { [brand]: true, code: 'not-found' }))).toBe(true);
    expect(isIncludeError(new Error('plain'))).toBe(false);
    expect(isIncludeError(Object.assign(new Error('copy'), { [brand]: 'yes' }))).toBe(false);
    expect(isIncludeError(null)).toBe(false);
    expect(isIncludeError('text')).toBe(false);
  });

  it('accepts only an Error that carries the brand as its own property', () => {
    expect(isIncludeError({ [brand]: true })).toBe(false);
    expect(isIncludeError(Object.assign(Object.create(Error.prototype), { [brand]: true }))).toBe(true);
    const inherited = Object.create(Object.assign(new Error('proto'), { [brand]: true }));
    expect(isIncludeError(inherited)).toBe(false);
  });

  it('does not run getters or Proxy traps that report a brand', () => {
    const get = jest.fn(() => true);
    expect(isIncludeError(new Proxy({}, { get }))).toBe(false);
    expect(isIncludeError(new Proxy(new Error('proxied'), { get }))).toBe(false);
    expect(get).not.toHaveBeenCalled();
    const getter = Object.defineProperty(new Error('getter'), brand, { get });
    expect(isIncludeError(getter)).toBe(false);
    expect(get).not.toHaveBeenCalled();
  });

  it('returns false for a revoked Proxy or a throwing trap, without throwing', () => {
    const { proxy, revoke } = Proxy.revocable(new Error('revoked'), {});
    revoke();
    expect(isIncludeError(proxy)).toBe(false);
    const boom = () => {
      throw new Error('trap');
    };
    expect(isIncludeError(new Proxy({}, { getPrototypeOf: boom }))).toBe(false);
    const branded = Object.defineProperty(new Error('x'), brand, { value: true });
    expect(isIncludeError(new Proxy(branded, { getOwnPropertyDescriptor: boom }))).toBe(false);
    expect(isIncludeError(new Proxy(branded, {}))).toBe(true);
  });

  it('works across two loaded copies of the module, both ways', () => {
    let copy!: typeof import('../include');
    jest.isolateModules(() => {
      copy = require('../include');
    });
    expect(copy.IncludeError).not.toBe(IncludeError);
    const details = { code: 'cycle' as const, target: 'a.md', file: undefined, from: 'x', line: 1, chain: [] };
    expect(new copy.IncludeError('m', details) instanceof IncludeError).toBe(true);
    expect(new IncludeError('m', details) instanceof copy.IncludeError).toBe(true);
  });

  it('does not let subclasses accept every branded object', () => {
    class Sub extends IncludeError {}
    const details = { code: 'cycle' as const, target: 'a.md', file: undefined, from: 'x', line: 1, chain: [] };
    expect(new Sub('m', details) instanceof Sub).toBe(true);
    expect(new Sub('m', details) instanceof IncludeError).toBe(true);
    expect(new IncludeError('m', details) instanceof Sub).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// Real file system
// ---------------------------------------------------------------------------

/** What the test machine's file system supports, probed once before the tests are declared. */
function probeFileSystem() {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'vaneui-md-probe-'));
  try {
    let symlinks = true;
    try {
      fs.symlinkSync(dir, path.join(dir, 'link'), 'dir');
    } catch {
      symlinks = false;
    }
    fs.writeFileSync(path.join(dir, 'Case.md'), '');
    return { symlinks, caseInsensitive: fs.existsSync(path.join(dir, 'case.md')) };
  } finally {
    fs.rmSync(dir, { recursive: true, force: true });
  }
}

const fileSystem = probeFileSystem();
const describeWithSymlinks = fileSystem.symlinks ? describe : describe.skip;
const itOnCaseInsensitiveFs = fileSystem.caseInsensitive ? it : it.skip;

describe('resolveIncludes: real file system', () => {
  let tmp: string;
  let root: string;
  let outside: string;

  const write = (relative: string, content: string) => {
    const file = path.join(root, ...relative.split('/'));
    fs.mkdirSync(path.dirname(file), { recursive: true });
    fs.writeFileSync(file, content);
    return file;
  };

  beforeAll(() => {
    tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'vaneui-md-include-'));
    root = path.join(tmp, 'root');
    outside = path.join(tmp, 'outside');
    fs.mkdirSync(root);
    fs.mkdirSync(outside);
    fs.writeFileSync(path.join(outside, 'secret.md'), 'Secret');
    write('guide/page.md', '# Guide\n\n{% include "parts/intro.md" %}\n\n{% include "/shared/footer.md" %}\n');
    write('guide/parts/intro.md', '---\ntitle: Intro\n---\n\n## Intro\n\n{% include "../../shared/note.md" %}\n');
    write('shared/note.md', '\uFEFFNote\r\n');
    write('shared/footer.md', 'Footer');
    write('loop/a.md', '{% include "b.md" %}');
    write('loop/b.md', '{% include "a.md" %}');
    write('.env', 'SECRET=1');
    fs.mkdirSync(path.join(root, 'a-directory'));
    fs.mkdirSync(path.join(root, 'folder.md'));
  });

  afterAll(() => {
    fs.rmSync(tmp, { recursive: true, force: true });
  });

  const readEntry = (relative: string) =>
    fs.readFileSync(path.join(root, ...relative.split('/')), 'utf8');

  const guideOutput = '# Guide\n\n## Intro\n\nNote\n\nFooter\n';

  it('expands nested includes from disk with the default reader', () => {
    const filePath = path.join(root, 'guide', 'page.md');
    const deps: string[] = [];
    const out = resolveIncludes(readEntry('guide/page.md'), {
      filePath,
      root,
      onInclude: (file) => deps.push(path.relative(root, file).split(path.sep).join('/')),
    });
    expect(out).toBe(guideOutput);
    expect(deps).toEqual(['guide/parts/intro.md', 'shared/note.md', 'shared/footer.md']);
  });

  it('reports a missing file from disk as not-found', () => {
    const error = catchIncludeError(() =>
      resolveIncludes('x\n{% include "nope.md" %}', { filePath: path.join(root, 'page.md'), root }),
    );
    expect(error.code).toBe('not-found');
    expect(error.file).toBe(path.join(root, 'nope.md'));
    expect(error.message).toBe('Include "nope.md" not found (in page.md:2)');
  });

  it('reports a missing file outside root as outside-root, not not-found', () => {
    const error = catchIncludeError(() =>
      resolveIncludes('{% include "../nope.md" %}', { filePath: path.join(root, 'page.md'), root }),
    );
    expect(error.code).toBe('outside-root');
  });

  it('reports a directory target as not-found', () => {
    const filePath = path.join(root, 'page.md');
    expect(catchIncludeError(() => resolveIncludes('{% include "folder.md" %}', { filePath, root })).code).toBe(
      'not-found',
    );
    expect(
      catchIncludeError(() => resolveIncludes('{% include "a-directory" %}', { filePath, root, extensions: false }))
        .code,
    ).toBe('not-found');
  });

  it('refuses to inline a dotfile from the default root', () => {
    const cwd = jest.spyOn(process, 'cwd').mockReturnValue(root);
    try {
      const error = catchIncludeError(() =>
        resolveIncludes('{% include "/.env" %}', { filePath: path.join(root, 'page.md') }),
      );
      expect(error.code).toBe('extension');
    } finally {
      cwd.mockRestore();
    }
  });

  it('reports a cycle between files on disk', () => {
    const error = catchIncludeError(() =>
      resolveIncludes(readEntry('loop/a.md'), { filePath: path.join(root, 'loop', 'a.md'), root }),
    );
    expect(error.code).toBe('cycle');
    expect(error.message).toBe('Include cycle: loop/a.md -> loop/b.md -> loop/a.md (in loop/b.md:1)');
  });

  it('rejects ../ escaping root, even when the file exists', () => {
    const error = catchIncludeError(() =>
      resolveIncludes('{% include "../outside/secret.md" %}', {
        filePath: path.join(root, 'page.md'),
        root,
      }),
    );
    expect(error.code).toBe('outside-root');
  });

  itOnCaseInsensitiveFs('detects a cycle through a differently cased path', () => {
    write('Case.md', 'x\n{% include "case.md" %}');
    const error = catchIncludeError(() =>
      resolveIncludes(readEntry('Case.md'), { filePath: path.join(root, 'Case.md'), root }),
    );
    expect(error.code).toBe('cycle');
  });

  describeWithSymlinks('symlinks', () => {
    let rootLink: string;
    let realRoot: string;

    beforeAll(() => {
      realRoot = fs.realpathSync.native(root);
      rootLink = path.join(tmp, 'root-link');
      fs.symlinkSync(root, rootLink, 'dir');
      fs.symlinkSync(path.join(outside, 'secret.md'), path.join(root, 'link-out.md'));
      fs.symlinkSync(outside, path.join(root, 'dir-out'), 'dir');
      fs.symlinkSync(path.join(root, 'shared', 'footer.md'), path.join(root, 'link-in.md'));
      fs.symlinkSync(path.join(root, '.env'), path.join(root, 'alias.md'));
      fs.symlinkSync(root, path.join(root, 'self'), 'dir');
      write('selfloop.md', '{% include "self/selfloop.md" %}');
      write('fan.md', '{% include "self/fan.md" %}\n{% include "self/fan.md" %}');
    });

    const page = () => path.join(root, 'page.md');

    it('rejects a symlinked file inside root that points outside it', () => {
      const error = catchIncludeError(() =>
        resolveIncludes('{% include "link-out.md" %}', { filePath: page(), root }),
      );
      expect(error.code).toBe('outside-root');
      expect(error.file).toBe(path.join(root, 'link-out.md'));
    });

    it('rejects a file under a symlinked directory that points outside root', () => {
      const error = catchIncludeError(() =>
        resolveIncludes('{% include "dir-out/secret.md" %}', { filePath: page(), root }),
      );
      expect(error.code).toBe('outside-root');
    });

    it('allows a symlink that stays inside root', () => {
      expect(resolveIncludes('{% include "link-in.md" %}', { filePath: page(), root })).toBe('Footer');
    });

    it('checks the extension of the real path too', () => {
      const error = catchIncludeError(() =>
        resolveIncludes('{% include "alias.md" %}', { filePath: page(), root }),
      );
      expect(error.code).toBe('extension');
      expect(error.message).toBe(
        'Include "alias.md" resolves to ".env", which is not an allowed file type, expected .md, .mdoc or .markdown (in page.md:1)',
      );
    });

    it('resolves a symlinked root to its real path', () => {
      const filePath = path.join(rootLink, 'guide', 'page.md');
      expect(resolveIncludes(readEntry('guide/page.md'), { filePath, root: rootLink })).toBe(guideOutput);
    });

    it('accepts a symlinked root with a real-path filePath', () => {
      const filePath = path.join(realRoot, 'guide', 'page.md');
      expect(resolveIncludes(readEntry('guide/page.md'), { filePath, root: rootLink })).toBe(guideOutput);
    });

    it('accepts a real root with a filePath through a symlink', () => {
      const filePath = path.join(rootLink, 'guide', 'page.md');
      expect(resolveIncludes(readEntry('guide/page.md'), { filePath, root: realRoot })).toBe(guideOutput);
    });

    it('shows paths relative to the real root in messages', () => {
      const error = catchIncludeError(() =>
        resolveIncludes('{% include "nope.md" %}', { filePath: path.join(realRoot, 'page.md'), root: rootLink }),
      );
      expect(error.message).toBe('Include "nope.md" not found (in page.md:1)');
    });

    it('reports a loop through a directory symlink as a cycle, not max-depth', () => {
      const viaPage = catchIncludeError(() =>
        resolveIncludes('{% include "selfloop.md" %}', { filePath: page(), root }),
      );
      expect(viaPage.code).toBe('cycle');
      expect(viaPage.message).toBe(
        'Include cycle: page.md -> selfloop.md -> self/selfloop.md (in selfloop.md:1)',
      );
      expect(viaPage.chain).toEqual([page(), path.join(root, 'selfloop.md')]);

      const entry = catchIncludeError(() =>
        resolveIncludes(readEntry('selfloop.md'), { filePath: path.join(root, 'selfloop.md'), root }),
      );
      expect(entry.code).toBe('cycle');
      expect(entry.message).toBe('Include cycle: selfloop.md -> self/selfloop.md (in selfloop.md:1)');
    });

    it('stops fan-out through a symlink loop at the first repeat', () => {
      const errors: string[] = [];
      const out = resolveIncludes(readEntry('fan.md'), {
        filePath: path.join(root, 'fan.md'),
        root,
        onError: (error) => {
          errors.push(error.code);
          return 'E';
        },
      });
      expect(out).toBe('E\nE');
      expect(errors).toEqual(['cycle', 'cycle']);
    });

    it('skips the real-path check when a custom readFile is supplied', () => {
      const out = resolveIncludes('{% include "link-out.md" %}', {
        filePath: page(),
        root,
        readFile: (file) => fs.readFileSync(file, 'utf8'),
      });
      expect(out).toBe('Secret');
    });

    it('keeps the real-path check for a custom readFile with checkRealPaths: true, reading real paths', () => {
      const reads: string[] = [];
      const readFile = (file: string) => {
        reads.push(file);
        return fs.readFileSync(file, 'utf8');
      };
      const error = catchIncludeError(() =>
        resolveIncludes('{% include "link-out.md" %}', { filePath: page(), root, readFile, checkRealPaths: true }),
      );
      expect(error.code).toBe('outside-root');
      expect(reads).toEqual([]);

      expect(
        resolveIncludes('{% include "link-in.md" %}', { filePath: page(), root, readFile, checkRealPaths: true }),
      ).toBe('Footer');
      expect(reads).toEqual([path.join(realRoot, 'shared', 'footer.md')]);
    });

    it('turns the check off for the default reader with checkRealPaths: false', () => {
      expect(
        resolveIncludes('{% include "link-out.md" %}', { filePath: page(), root, checkRealPaths: false }),
      ).toBe('Secret');
    });

    it('applies the same real-path rules in the async version', async () => {
      await expect(
        resolveIncludesAsync('{% include "link-out.md" %}', { filePath: page(), root }),
      ).rejects.toMatchObject({ code: 'outside-root' });
      await expect(
        resolveIncludesAsync('{% include "selfloop.md" %}', { filePath: page(), root }),
      ).rejects.toMatchObject({ code: 'cycle' });
      await expect(
        resolveIncludesAsync(readEntry('guide/page.md'), {
          filePath: path.join(realRoot, 'guide', 'page.md'),
          root: rootLink,
        }),
      ).resolves.toBe(guideOutput);
    });
  });

  it('defaults root to process.cwd()', () => {
    const cwd = jest.spyOn(process, 'cwd');
    try {
      // A leading / resolves from the cwd root.
      cwd.mockReturnValue(path.join(root, 'shared'));
      expect(
        resolveIncludes('{% include "/footer.md" %}', { filePath: path.join(root, 'shared', 'x.md') }),
      ).toBe('Footer');

      // intro.md is inside guide/, but the ../../shared/note.md it includes is not.
      cwd.mockReturnValue(path.join(root, 'guide'));
      const error = catchIncludeError(() =>
        resolveIncludes('{% include "parts/intro.md" %}', { filePath: path.join(root, 'guide', 'page.md') }),
      );
      expect(error.code).toBe('outside-root');
      expect(error.target).toBe('../../shared/note.md');
      expect(error.from).toBe(path.join(root, 'guide', 'parts', 'intro.md'));
    } finally {
      cwd.mockRestore();
    }
  });

  it('expands the same tree with resolveIncludesAsync and the default async reader', async () => {
    const filePath = path.join(root, 'guide', 'page.md');
    await expect(resolveIncludesAsync(readEntry('guide/page.md'), { filePath, root })).resolves.toBe(guideOutput);
    await expect(
      resolveIncludesAsync('{% include "nope.md" %}', { filePath: path.join(root, 'page.md'), root }),
    ).rejects.toMatchObject({ code: 'not-found', line: 1 });
  });
});

// ---------------------------------------------------------------------------
// Async parity
// ---------------------------------------------------------------------------

describe('resolveIncludesAsync', () => {
  const files = {
    'page.md': '---\ntitle: Page\n---\n\n- Item\n  {% include "parts/a.md" %}\n\n```\n{% include "x.md" %}\n```\n',
    'parts/a.md': '---\nt: 1\n---\nA\n{% include "../b.md" %}\n',
    'b.md': 'B1\r\nB2',
  };

  it('matches resolveIncludes on a representative document', async () => {
    const sync = expandVirtual(files, 'page.md');
    const { readFile } = memoryReader(files);
    const async = await resolveIncludesAsync(files['page.md'], {
      filePath: v('page.md'),
      root: VROOT,
      readFile: (file) => Promise.resolve(readFile(file)),
    });
    expect(async).toBe(sync);
    expect(async).toBe(
      '---\ntitle: Page\n---\n\n- Item\n  A\n  B1\n  B2\n\n```\n{% include "x.md" %}\n```\n',
    );
  });

  it('accepts a synchronous readFile', async () => {
    const expected = expandVirtual(files, 'page.md');
    const { readFile } = memoryReader(files);
    await expect(
      resolveIncludesAsync(files['page.md'], { filePath: v('page.md'), root: VROOT, readFile }),
    ).resolves.toBe(expected);
  });

  it.each([
    ['not-found', { 'page.md': 'x\n{% include "missing.md" %}' }, {}],
    ['cycle', { 'page.md': '{% include "a.md" %}', 'a.md': '{% include "page.md" %}' }, {}],
    ['outside-root', { 'page.md': '{% include "../x.md" %}' }, {}],
    ['max-depth', { 'page.md': '{% include "a.md" %}', 'a.md': '{% include "b.md" %}', 'b.md': 'B' }, {}],
    ['extension', { 'page.md': '{% include "x.txt" %}' }, {}],
    ['limit', { 'page.md': '{% include "a.md" %}\n{% include "a.md" %}', 'a.md': 'A' }, { maxIncludes: 1 }],
  ])('rejects with the same %s error as the sync version', async (code, map, extra) => {
    const options = { maxDepth: 1, ...extra };
    const syncError = catchIncludeError(() => expandVirtual(map, 'page.md', options));
    const { readFile } = memoryReader(map);
    const asyncError = await resolveIncludesAsync(map['page.md'], {
      filePath: v('page.md'),
      root: VROOT,
      ...options,
      readFile: async (file) => readFile(file),
    }).then(
      () => undefined,
      (error: unknown) => error,
    );
    expect(asyncError).toBeInstanceOf(IncludeError);
    const e = asyncError as IncludeError;
    expect(e.code).toBe(code);
    expect(syncError.code).toBe(code);
    expect(e.message).toBe(syncError.message);
    expect(e.line).toBe(syncError.line);
    expect(e.from).toBe(syncError.from);
    expect(e.chain).toEqual(syncError.chain);
  });

  it('wraps a rejected readFile promise as read-failed', async () => {
    const cause = Object.assign(new Error('boom'), { code: 'EIO' });
    await expect(
      resolveIncludesAsync('{% include "x.md" %}', {
        filePath: v('page.md'),
        root: VROOT,
        readFile: () => Promise.reject(cause),
      }),
    ).rejects.toMatchObject({ code: 'read-failed', cause });
  });

  it('supports onError and onInclude', async () => {
    const calls: string[] = [];
    const out = await resolveIncludesAsync('{% include "a.md" %}\n{% include "nope.md" %}', {
      filePath: v('page.md'),
      root: VROOT,
      readFile: async (file) => memoryReader({ 'a.md': 'A' }).readFile(file),
      onError: (error) => `[${error.code}]`,
      onInclude: (file) => calls.push(file),
    });
    expect(out).toBe('A\n[not-found]');
    expect(calls).toEqual([v('a.md')]);
  });

  it('throws a TypeError when onError returns a promise', async () => {
    await expect(
      resolveIncludesAsync('{% include "nope.md" %}', {
        filePath: v('page.md'),
        root: VROOT,
        readFile: () => {
          throw enoent('nope.md');
        },
        onError: (async () => 'x') as never,
      }),
    ).rejects.toThrow('resolveIncludesAsync: options.onError must return a string');
  });
});

// ---------------------------------------------------------------------------
// Entry boundaries
// ---------------------------------------------------------------------------

describe('browser entries', () => {
  const srcDir = path.resolve(__dirname, '..');
  const includeModule = path.join(srcDir, 'include.ts');
  const builtins = new Set(builtinModules);

  /** Module specifiers a file loads at runtime (type-only imports and exports are erased). */
  function runtimeSpecifiers(file: string): string[] {
    const source = ts.createSourceFile(file, fs.readFileSync(file, 'utf8'), ts.ScriptTarget.Latest, true);
    const specifiers: string[] = [];
    const visit = (node: ts.Node) => {
      if (ts.isImportDeclaration(node) && !node.importClause?.isTypeOnly) {
        if (ts.isStringLiteral(node.moduleSpecifier)) specifiers.push(node.moduleSpecifier.text);
      } else if (ts.isExportDeclaration(node) && !node.isTypeOnly && node.moduleSpecifier) {
        if (ts.isStringLiteral(node.moduleSpecifier)) specifiers.push(node.moduleSpecifier.text);
      } else if (ts.isImportEqualsDeclaration(node) && ts.isExternalModuleReference(node.moduleReference)) {
        const expression = node.moduleReference.expression;
        if (ts.isStringLiteral(expression)) specifiers.push(expression.text);
      } else if (
        ts.isCallExpression(node) &&
        (node.expression.kind === ts.SyntaxKind.ImportKeyword ||
          (ts.isIdentifier(node.expression) && node.expression.text === 'require'))
      ) {
        const [argument] = node.arguments;
        if (argument && ts.isStringLiteralLike(argument)) specifiers.push(argument.text);
      }
      ts.forEachChild(node, visit);
    };
    visit(source);
    return specifiers;
  }

  function resolveRelative(from: string, specifier: string): string {
    const base = path.resolve(path.dirname(from), specifier);
    const candidates = [base, `${base}.ts`, `${base}.tsx`, path.join(base, 'index.ts'), path.join(base, 'index.tsx')];
    const found = candidates.find((candidate) => fs.existsSync(candidate) && fs.statSync(candidate).isFile());
    if (!found) throw new Error(`cannot resolve "${specifier}" from ${path.relative(srcDir, from)}`);
    return found;
  }

  /** Every source file reachable from `entry`, and every bare specifier they load. */
  function importGraph(entry: string) {
    const files = new Set<string>();
    const packages = new Set<string>();
    const pending = [entry];
    while (pending.length > 0) {
      const file = pending.pop()!;
      if (files.has(file)) continue;
      files.add(file);
      if (!/\.tsx?$/.test(file)) continue;
      for (const specifier of runtimeSpecifiers(file)) {
        if (specifier.startsWith('.')) pending.push(resolveRelative(file, specifier));
        else packages.add(specifier);
      }
    }
    return { files, packages };
  }

  it.each([['index.ts'], ['yaml.ts'], ['registry.ts'], ['spec.ts']])(
    'never loads node: built-ins or the include module from src/%s',
    (entry) => {
      const { files, packages } = importGraph(path.join(srcDir, entry));
      expect(files.size).toBeGreaterThan(0);
      expect([...files]).not.toContain(includeModule);
      const nodeOnly = [...packages].filter((name) => name.startsWith('node:') || builtins.has(name));
      expect(nodeOnly).toEqual([]);
    },
  );

  it('sees the include module and its node: imports when walking src/include.ts (sanity check)', () => {
    const { files, packages } = importGraph(includeModule);
    expect(files.has(includeModule)).toBe(true);
    expect(packages).toContain('node:fs');
  });
});
