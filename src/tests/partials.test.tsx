import React from 'react';
import { render, screen } from '@testing-library/react';
import Markdoc, { Tag, type Config, type Node } from '@markdoc/markdoc';
import { Md } from '../components/md';
import { MdStream } from '../stream';
import { createMd } from '../createMd';
import { mergePresets } from '../preset';
import { headingAnchors } from '../transform';
import { defaultNodesConfig, defaultTagsConfig } from '../config/default-config';
import { parseMarkdown, preparePartials } from '../tags';
import type { MdConfig } from '../types';

/** All error renderings (block card or inline span) that carry the "Error:" label. */
function errors(container: HTMLElement): Element[] {
  return Array.from(container.querySelectorAll('[data-appearance]')).filter(
    (el) => el.firstElementChild?.textContent === 'Error:',
  );
}

function renderMd(content: string, config?: MdConfig, props: Partial<React.ComponentProps<typeof Md>> = {}) {
  return render(<Md content={content} config={config} {...props} />);
}

/** Runs `fn` and fails if React logged anything (for example a DOM nesting warning). */
function withoutConsoleErrors<T>(fn: () => T): T {
  const consoleError = jest.spyOn(console, 'error');
  try {
    const result = fn();
    expect(consoleError).not.toHaveBeenCalled();
    return result;
  } finally {
    consoleError.mockRestore();
  }
}

describe('partials: sources', () => {
  it('renders a Markdown-string partial through the VaneUI renderers', () => {
    const { container } = renderMd('{% partial file="intro.md" /%}', {
      partials: { 'intro.md': '## Welcome\n\nSome **bold** text.' },
    });
    const heading = container.querySelector('h2');
    expect(heading).toHaveTextContent('Welcome');
    expect(heading).toHaveClass('vane-title');
    expect(container.querySelector('p')).toHaveClass('vane-text');
    expect(container.querySelector('strong')).toHaveClass('font-bold');
    expect(errors(container)).toHaveLength(0);
  });

  it('renders a pre-parsed AST partial', () => {
    const { container } = renderMd('{% partial file="ast.md" /%}', {
      partials: { 'ast.md': Markdoc.parse('# From AST') },
    });
    expect(container.querySelector('h1')).toHaveTextContent('From AST');
  });

  it('renders a Node[] partial in order', () => {
    const { container } = renderMd('{% partial file="list.md" /%}', {
      partials: { 'list.md': [Markdoc.parse('# One'), Markdoc.parse('Two')] },
    });
    expect(container.querySelector('h1')).toHaveTextContent('One');
    expect(container.querySelector('p')).toHaveTextContent('Two');
    expect(container.textContent!.indexOf('One')).toBeLessThan(container.textContent!.indexOf('Two'));
  });

  it('renders nested partials', () => {
    const { container } = renderMd('{% partial file="outer.md" /%}', {
      partials: {
        'outer.md': '# Outer\n\n{% partial file="inner.md" /%}',
        'inner.md': 'Inner text',
      },
    });
    expect(container.querySelector('h1')).toHaveTextContent('Outer');
    expect(screen.getByText('Inner text')).toBeInTheDocument();
    expect(errors(container)).toHaveLength(0);
  });

  it('applies the variables attribute inside the partial', () => {
    renderMd('{% partial file="greet.md" variables={name: "Ada"} /%}', {
      partials: { 'greet.md': 'Hello {% $name %}' },
    });
    expect(screen.getByText('Hello Ada')).toBeInTheDocument();
  });

  it('exposes page variables and $markdoc.frontmatter inside the partial', () => {
    renderMd(
      '{% partial file="p.md" /%}',
      { variables: { product: 'VaneUI' }, partials: { 'p.md': '{% $product %} by {% $markdoc.frontmatter.author %}' } },
      { frontmatter: { author: 'Jane' } },
    );
    expect(screen.getByText('VaneUI by Jane')).toBeInTheDocument();
  });

  it('sets $$partial:filename for the partial scope', () => {
    const filename = {
      transform: (_node: Node, config: Config) => String(config.variables?.['$$partial:filename']),
    };
    renderMd('{% partial file="named.md" /%}', {
      tags: { filename },
      partials: { 'named.md': 'File: {% filename /%}' },
    });
    expect(screen.getByText('File: named.md')).toBeInTheDocument();
  });

  it('renders the same partial twice but parses it once, and never parses unused partials', () => {
    const parse = jest.spyOn(Markdoc, 'parse');
    try {
      const { container } = renderMd('{% partial file="p.md" /%}\n\n{% partial file="p.md" /%}', {
        partials: { 'p.md': '# Repeated', 'unused.md': '# Unused' },
      });
      expect(container.querySelectorAll('h1')).toHaveLength(2);
      const files = parse.mock.calls.map(([, file]) => file);
      expect(files.filter((f) => f === 'p.md')).toHaveLength(1);
      expect(files).not.toContain('unused.md');
    } finally {
      parse.mockRestore();
    }
  });

  it('re-parses on the next render, so an updated partial source shows up', () => {
    const { container, rerender } = renderMd('{% partial file="p.md" /%}', { partials: { 'p.md': 'First' } });
    expect(container).toHaveTextContent('First');
    rerender(<Md content={'{% partial file="p.md" /%}'} config={{ partials: { 'p.md': 'Second' } }} />);
    expect(container).toHaveTextContent('Second');
    expect(container).not.toHaveTextContent('First');
  });

  it('works with defaultTagsConfig outside <Md>, including string partials', () => {
    const tree = Markdoc.transform(Markdoc.parse('{% partial file="s.md" /%}'), {
      tags: defaultTagsConfig,
      partials: { 's.md': 'Plain string' },
    });
    expect(JSON.stringify(tree)).toContain('Plain string');
  });

  it('renders a partial named __proto__ as a plain key', () => {
    const partials = JSON.parse('{"__proto__": "Proto partial"}');
    const { container } = renderMd('{% partial file="__proto__" /%}', { partials });
    expect(screen.getByText('Proto partial')).toBeInTheDocument();
    expect(errors(container)).toHaveLength(0);
  });
});

describe('partials: parse cache', () => {
  function parsedFiles(parse: jest.SpyInstance, file: string): number {
    return parse.mock.calls.filter(([, arg]) => arg === file).length;
  }

  it('reuses parsed partials across renders', () => {
    const parse = jest.spyOn(Markdoc, 'parse');
    try {
      const content = '{% partial file="across.md" /%}';
      const { container, rerender } = renderMd(content, { partials: { 'across.md': 'Across renders' } });
      rerender(<Md content={content} config={{ partials: { 'across.md': 'Across renders' } }} />);
      expect(container).toHaveTextContent('Across renders');
      expect(parsedFiles(parse, 'across.md')).toBe(1);
    } finally {
      parse.mockRestore();
    }
  });

  it('does not re-parse partials while MdStream content grows', () => {
    const parse = jest.spyOn(Markdoc, 'parse');
    try {
      const partials = { 'streamed.md': 'Streamed cached partial' };
      const content = '# Page\n\n{% partial file="streamed.md" /%}\n\nToken';
      const { container, rerender } = render(<MdStream content={content} config={{ partials }} />);
      rerender(<MdStream content={`${content} more`} config={{ partials }} />);
      rerender(<MdStream content={`${content} more tokens`} config={{ partials }} />);
      expect(container).toHaveTextContent('Streamed cached partial');
      expect(container).toHaveTextContent('Token more tokens');
      expect(parsedFiles(parse, 'streamed.md')).toBe(1);
    } finally {
      parse.mockRestore();
    }
  });

  it('renders the same cached partial with different variables, within and across renders', () => {
    const partials = { 'hello-cached.md': 'Hello {% $who %}' };
    const content = '{% partial file="hello-cached.md" variables={who: "Ada"} /%}\n\n{% partial file="hello-cached.md" variables={who: "Lin"} /%}';
    const { rerender } = renderMd(content, { partials });
    expect(screen.getByText('Hello Ada')).toBeInTheDocument();
    expect(screen.getByText('Hello Lin')).toBeInTheDocument();
    rerender(<Md content={content.replace('Ada', 'Bo')} config={{ partials }} />);
    expect(screen.getByText('Hello Bo')).toBeInTheDocument();
    expect(screen.getByText('Hello Lin')).toBeInTheDocument();
    expect(screen.queryByText('Hello Ada')).toBeNull();
  });

  it('does not mutate a shared parsed partial when rendering it', () => {
    const ast = Markdoc.parse('Hi {% $who %}');
    const before = JSON.stringify(ast);
    renderMd('{% partial file="shared.md" variables={who: "A"} /%}\n\nInline {% partial file="shared.md" variables={who: "B"} /%}.', {
      partials: { 'shared.md': ast },
    });
    expect(screen.getByText('Hi A')).toBeInTheDocument();
    expect(screen.getByText(/^Inline Hi B\.$/)).toBeInTheDocument();
    expect(JSON.stringify(ast)).toBe(before);
  });

  it('prepares writable, configurable entries that become data properties after the first parse', () => {
    const prepared = preparePartials({ 'lazy.md': 'Lazy', 'ast.md': Markdoc.parse('AST') })!;
    expect(Object.getOwnPropertyDescriptor(prepared, 'ast.md')).toMatchObject({
      enumerable: true,
      writable: true,
      configurable: true,
    });
    expect(Object.getOwnPropertyDescriptor(prepared, 'lazy.md')).toMatchObject({ enumerable: true, configurable: true });
    const parsed = prepared['lazy.md'];
    expect(Object.getOwnPropertyDescriptor(prepared, 'lazy.md')).toEqual({
      value: parsed,
      enumerable: true,
      writable: true,
      configurable: true,
    });
    expect(() => {
      prepared['ast.md'] = 'replaced';
      prepared['lazy.md'] = 'replaced';
    }).not.toThrow();
  });

  /** Reads `name` from a fresh preparePartials object, so the shared cache decides whether it is parsed. */
  function load(name: string, source: string): Node {
    return preparePartials({ [name]: source })![name] as Node;
  }

  it('evicts the least recently used sources once they add up to more than 2,000,000 characters', () => {
    const parse = jest.spyOn(Markdoc, 'parse');
    try {
      // Nine sources of 240,000 characters: eight fit in the budget, the ninth evicts the oldest.
      const big = (i: number) => [`big-${i}.md`, `${i} ${'a'.repeat(239_998)}`] as const;
      for (let i = 0; i < 9; i++) load(...big(i));
      expect(parse).toHaveBeenCalledTimes(9);
      parse.mockClear();
      for (let i = 1; i < 9; i++) load(...big(i));
      expect(parse).not.toHaveBeenCalled();
      load(...big(0));
      expect(parsedFiles(parse, 'big-0.md')).toBe(1);
      // big-1 was the least recently used when big-0 came back.
      load(...big(1));
      expect(parsedFiles(parse, 'big-1.md')).toBe(1);
    } finally {
      parse.mockRestore();
    }
  });

  it('parses a source over 250,000 characters on every use without evicting cached ones', () => {
    const parse = jest.spyOn(Markdoc, 'parse');
    try {
      load('small-kept.md', 'Small');
      const huge = 'b'.repeat(250_000);
      load('huge.md', huge);
      load('huge.md', huge);
      expect(parsedFiles(parse, 'huge.md')).toBe(2);
      load('small-kept.md', 'Small');
      expect(parsedFiles(parse, 'small-kept.md')).toBe(1);
    } finally {
      parse.mockRestore();
    }
  });

  it('keys the cache so that no name and source pair collides with another', () => {
    const textOf = (ast: Node) => [...ast.walk()].find((node) => node.type === 'text')?.attributes.content;
    // Joined with a NUL separator, both pairs below would read "a\0b\0c".
    const first = load('a\0b', 'c');
    const second = load('a', 'b\0c');
    expect(second).not.toBe(first);
    expect(textOf(first)).toBe('c');
    expect(textOf(second)).toMatch(/^b.c$/);
  });

  it('lets a custom tag assign config.partials entries during the render', () => {
    const swap = {
      selfClosing: true,
      transform: (_node: Node, config: Config) => {
        config.partials!['before.md'] = 'Swapped';
        config.partials!['added.md'] = 'Added';
        return null;
      },
    };
    const { container } = renderMd('{% swap /%}\n\n{% partial file="before.md" /%}\n\n{% partial file="added.md" /%}', {
      tags: { swap },
      partials: { 'before.md': 'Original' },
    });
    expect(screen.getByText('Swapped')).toBeInTheDocument();
    expect(screen.getByText('Added')).toBeInTheDocument();
    expect(errors(container)).toHaveLength(0);
  });
});

describe('partials: validation', () => {
  it('reports an unknown partial like Markdoc does', () => {
    const ast = Markdoc.parse('{% partial file="nope.md" /%}');
    const result = Markdoc.validate(ast, { tags: defaultTagsConfig, partials: {} });
    expect(result).toHaveLength(1);
    expect(result[0].error).toMatchObject({ id: 'attribute-value-invalid', level: 'error' });
    expect(result[0].error.message).toContain('nope.md');
  });

  it('accepts a known partial, including a Markdown-string one', () => {
    const ast = Markdoc.parse('{% partial file="yes.md" /%}');
    expect(Markdoc.validate(ast, { tags: defaultTagsConfig, partials: { 'yes.md': 'Yes' } })).toEqual([]);
  });

  it('does not treat Object.prototype names as known partials', () => {
    const ast = Markdoc.parse('{% partial file="toString" /%}');
    expect(Markdoc.validate(ast, { tags: defaultTagsConfig, partials: {} })).toHaveLength(1);
  });
});

describe('partials: errors', () => {
  it('renders a visible error for a missing partial and keeps rendering the page', () => {
    const { container } = renderMd('# Title\n\n{% partial file="missing.md" /%}\n\nAfter the partial.');
    const [error] = errors(container);
    expect(error).toHaveTextContent('Partial "missing.md" not found. Add it to config.partials.');
    expect(container.querySelector('h1')).toHaveTextContent('Title');
    expect(screen.getByText('After the partial.')).toBeInTheDocument();
  });

  it('treats Object.prototype names as missing instead of crashing', () => {
    const { container } = renderMd('{% partial file="toString" /%}', { partials: {} });
    expect(errors(container)[0]).toHaveTextContent('Partial "toString" not found.');
  });

  it('reports a direct cycle instead of overflowing the stack', () => {
    let result: ReturnType<typeof renderMd> | undefined;
    expect(() => {
      result = renderMd('{% partial file="self.md" /%}', {
        partials: { 'self.md': 'Self\n\n{% partial file="self.md" /%}' },
      });
    }).not.toThrow();
    expect(screen.getByText('Self')).toBeInTheDocument();
    expect(errors(result!.container)[0]).toHaveTextContent('Partial cycle: self.md -> self.md');
  });

  it('reports an indirect cycle with the full chain', () => {
    const { container } = renderMd('{% partial file="a.md" /%}\n\nPage end.', {
      partials: {
        'a.md': 'A\n\n{% partial file="b.md" /%}',
        'b.md': 'B\n\n{% partial file="a.md" /%}',
      },
    });
    expect(errors(container)).toHaveLength(1);
    expect(errors(container)[0]).toHaveTextContent('Partial cycle: a.md -> b.md -> a.md');
    expect(screen.getByText('A')).toBeInTheDocument();
    expect(screen.getByText('B')).toBeInTheDocument();
    expect(screen.getByText('Page end.')).toBeInTheDocument();
  });

  it.each([
    ['the chain', '"$$vaneui:partialChain": []'],
    ['the budget', '"$$vaneui:partialBudget": {used: 0}'],
    ['the link-text flag', '"$$vaneui:inLink": false'],
    ['the partial file name', '"$$partial:filename": "other.md"'],
  ])('ignores %s in the variables attribute, so it cannot reset cycle tracking', (_label, reserved) => {
    // The tag sets these keys itself, so they change nothing: the inner self.md
    // renders with the same variables as the outer one, a direct cycle.
    const { container } = renderMd('{% partial file="self.md" /%}', {
      partials: { 'self.md': `Self\n\n{% partial file="self.md" variables={${reserved}} /%}` },
    });
    expect(screen.getAllByText('Self')).toHaveLength(1);
    const found = errors(container);
    expect(found).toHaveLength(1);
    expect(found[0]).toHaveTextContent(/^Error: Partial cycle: self\.md -> self\.md$/);
  });

  it('caps nesting at 16 levels', () => {
    const partials: Record<string, string> = {};
    for (let i = 1; i <= 17; i++) partials[`p${i}.md`] = `Level ${i}\n\n{% partial file="p${i + 1}.md" /%}`;
    const { container } = renderMd('{% partial file="p1.md" /%}', { partials });
    expect(screen.getByText('Level 16')).toBeInTheDocument();
    expect(screen.queryByText('Level 17')).toBeNull();
    const [error] = errors(container);
    expect(error).toHaveTextContent('Partial depth limit of 16 exceeded: p1.md -> p2.md');
    expect(error).toHaveTextContent('-> p17.md');
  });

  it('styles block errors with mdError and inline errors with mdErrorInline', () => {
    const { container } = renderMd(
      '{% partial file="block.md" /%}\n\nText {% partial file="inline.md" /%} here.',
      undefined,
      { rendererTheme: { mdError: { warning: true }, mdErrorInline: { info: true } } },
    );
    const [block, inline] = errors(container);
    expect(block).toHaveTextContent('Partial "block.md" not found.');
    expect(block).toHaveAttribute('data-appearance', 'warning');
    expect(inline).toHaveTextContent('Partial "inline.md" not found.');
    expect(inline.tagName).toBe('SPAN');
    expect(inline).toHaveAttribute('data-appearance', 'info');
  });

  it('renders a partial error inside a paragraph as phrasing content', () => {
    const { container } = withoutConsoleErrors(() => renderMd('Text {% partial file="nope.md" /%} here.'));
    const p = container.querySelector('p')!;
    const [error] = errors(container);
    expect(error.tagName).toBe('SPAN');
    expect(p).toContainElement(error as HTMLElement);
    expect(p.querySelector('div, p')).toBeNull();
  });

  it('never places a custom MdError inline or passes it an inline prop', () => {
    const received: Record<string, unknown>[] = [];
    const CustomError: React.FC<React.PropsWithChildren> = (props) => {
      received.push(props as Record<string, unknown>);
      return <div className="custom-error">{props.children}</div>;
    };
    const { container } = withoutConsoleErrors(() =>
      renderMd('{% partial file="block.md" /%}\n\nText {% partial file="inline.md" /%} here.', {
        components: { MdError: CustomError },
      }),
    );
    expect(received).toHaveLength(1);
    expect(received[0]).not.toHaveProperty('inline');
    expect(container.querySelector('.custom-error')).toHaveTextContent('Partial "block.md" not found.');
    expect(container.querySelector('p .custom-error')).toBeNull();
    const inline = errors(container).find((el) => el.textContent?.includes('inline.md'));
    expect(inline?.tagName).toBe('SPAN');
  });

  it('says the file name is empty when the file attribute resolves to nothing', () => {
    const { container } = renderMd('{% partial file=$nothing /%}\n\n{% partial file="" /%}');
    const found = errors(container);
    expect(found).toHaveLength(2);
    for (const el of found) {
      expect(el).toHaveTextContent('Partial tag has an empty file name.');
      expect(el).not.toHaveTextContent('missing');
    }
  });

  it('says the file attribute is missing when there is none', () => {
    const { container } = renderMd('{% partial /%}');
    expect(errors(container)[0]).toHaveTextContent('Partial tag is missing its file attribute.');
  });
});

describe('partials: recursion', () => {
  const tree = { name: 'root', child: { name: 'branch', child: { name: 'leaf' } } };
  const treePartial = [
    'Node {% $node.name %}',
    '',
    '{% if $node.child %}',
    '{% partial file="tree.md" variables={node: $node.child} /%}',
    '{% /if %}',
  ].join('\n');

  it('renders a recursive partial guarded by if when its variables change', () => {
    const { container } = renderMd('{% partial file="tree.md" variables={node: $tree} /%}', {
      variables: { tree },
      partials: { 'tree.md': treePartial },
    });
    expect(screen.getByText('Node root')).toBeInTheDocument();
    expect(screen.getByText('Node branch')).toBeInTheDocument();
    expect(screen.getByText('Node leaf')).toBeInTheDocument();
    expect(errors(container)).toHaveLength(0);
  });

  it('reports a cycle when the same file comes back with the same variables', () => {
    const { container } = renderMd('{% partial file="loop.md" variables={n: 1} /%}', {
      partials: { 'loop.md': 'Loop\n\n{% partial file="loop.md" variables={n: 1} /%}' },
    });
    expect(screen.getByText('Loop')).toBeInTheDocument();
    expect(errors(container)).toHaveLength(1);
    expect(errors(container)[0]).toHaveTextContent('Partial cycle: loop.md -> loop.md');
  });

  it('compares variables independently of key order', () => {
    const { container } = renderMd('{% partial file="keys.md" variables={a: 1, b: 2} /%}', {
      partials: { 'keys.md': 'Keys\n\n{% partial file="keys.md" variables={b: 2, a: 1} /%}' },
    });
    expect(errors(container)[0]).toHaveTextContent('Partial cycle: keys.md -> keys.md');
  });

  it('allows the same file again once a partial in between has set other variables', () => {
    // a.md -> b.md (sets stop) -> a.md is not an infinite loop: the inner a.md sees stop.
    const { container } = renderMd('{% partial file="a.md" /%}', {
      partials: {
        'a.md': '{% if $stop %}\nStopped in a\n{% else /%}\n{% partial file="b.md" variables={stop: true} /%}\n{% /if %}',
        'b.md': 'In b\n\n{% partial file="a.md" /%}',
      },
    });
    expect(screen.getByText('In b')).toBeInTheDocument();
    expect(screen.getByText('Stopped in a')).toBeInTheDocument();
    expect(errors(container)).toHaveLength(0);
  });

  it('reports a cycle when the same cyclic value comes back', () => {
    const cyclic: Record<string, unknown> = { name: 'cyclic' };
    cyclic.self = cyclic;
    let result: ReturnType<typeof renderMd> | undefined;
    expect(() => {
      result = renderMd('{% partial file="cyc.md" variables={value: $cyclic} /%}', {
        variables: { cyclic },
        partials: { 'cyc.md': 'Cyc {% $value.name %}\n\n{% partial file="cyc.md" variables={value: $cyclic} /%}' },
      });
    }).not.toThrow();
    expect(screen.getAllByText('Cyc cyclic')).toHaveLength(1);
    expect(errors(result!.container)).toHaveLength(1);
    expect(errors(result!.container)[0]).toHaveTextContent(/^Error: Partial cycle: cyc\.md -> cyc\.md$/);
  });

  describe('with cyclic data (nodes that link back to their parent)', () => {
    type NavNode = { name: string; parent: NavNode | null; first?: NavNode; second?: NavNode };
    const navPartial = [
      'Node {% $node.name %}',
      '',
      '{% if $node.first %}',
      '{% partial file="nav.md" variables={node: $node.first} /%}',
      '{% /if %}',
      '',
      '{% if $node.second %}',
      '{% partial file="nav.md" variables={node: $node.second} /%}',
      '{% /if %}',
    ].join('\n');

    function navTree(): NavNode {
      const root: NavNode = { name: 'root', parent: null };
      const a: NavNode = { name: 'a', parent: root };
      const b: NavNode = { name: 'b', parent: root };
      const a1: NavNode = { name: 'a1', parent: a };
      root.first = a;
      root.second = b;
      a.first = a1;
      return root;
    }

    it('recurses into each child without reporting a cycle', () => {
      const { container } = renderMd('{% partial file="nav.md" variables={node: $nav} /%}', {
        variables: { nav: navTree() },
        partials: { 'nav.md': navPartial },
      });
      expect(Array.from(container.querySelectorAll('p'), (p) => p.textContent)).toEqual([
        'Node root',
        'Node a',
        'Node a1',
        'Node b',
      ]);
      expect(errors(container)).toHaveLength(0);
    });

    it('still reports a cycle when a node comes back', () => {
      const root = navTree();
      root.first!.first = root; // a's first child is root again
      const { container } = renderMd('{% partial file="nav.md" variables={node: $nav} /%}', {
        variables: { nav: root },
        partials: { 'nav.md': navPartial },
      });
      expect(screen.getAllByText('Node root')).toHaveLength(1);
      expect(screen.getByText('Node a')).toBeInTheDocument();
      expect(screen.getByText('Node b')).toBeInTheDocument();
      const found = errors(container);
      expect(found).toHaveLength(1);
      expect(found[0]).toHaveTextContent(/^Error: Partial cycle: nav\.md -> nav\.md -> nav\.md$/);
    });
  });

  it('treats structurally equal copies as the same variables, even for deep data', () => {
    type Link = { value: number; next: Link | null };
    const copy = (list: Link): Link => {
      const head: Link = { value: list.value, next: null };
      for (let from = list.next, to = head; from; from = from.next) to = to.next = { value: from.value, next: null };
      return head;
    };
    let list: Link = { value: 0, next: null };
    for (let i = 1; i < 30_000; i++) list = { value: i, next: list };
    let result: ReturnType<typeof renderMd> | undefined;
    expect(() => {
      result = renderMd('{% partial file="copy.md" variables={list: copy($list)} /%}', {
        variables: { list },
        functions: { copy: { transform: (parameters: Record<string, unknown>) => copy(parameters[0] as Link) } },
        partials: { 'copy.md': 'Copy {% $list.value %}\n\n{% partial file="copy.md" variables={list: copy($list)} /%}' },
      });
    }).not.toThrow();
    expect(screen.getAllByText('Copy 29999')).toHaveLength(1);
    expect(errors(result!.container)[0]).toHaveTextContent(/^Error: Partial cycle: copy\.md -> copy\.md$/);
  });

  it('compares other objects and functions by identity', () => {
    const { container } = renderMd('{% partial file="when.md" variables={at: stamp()} /%}', {
      functions: { stamp: { transform: () => new Date(0) } },
      partials: { 'when.md': 'When\n\n{% partial file="when.md" variables={at: stamp()} /%}' },
    });
    // Each call returns a new Date, so the variables never repeat: the depth cap stops it.
    expect(screen.getAllByText('When')).toHaveLength(16);
    expect(errors(container)[0]).toHaveTextContent('Partial depth limit of 16 exceeded');
  });

  it('caps recursion whose variables never repeat at 16 levels', () => {
    const { container } = renderMd('{% partial file="deep.md" variables={path: "x"} /%}', {
      functions: { append: { transform: (parameters: Record<string, unknown>) => `${parameters[0]}x` } },
      partials: { 'deep.md': 'Deep\n\n{% partial file="deep.md" variables={path: append($path)} /%}' },
    });
    expect(screen.getAllByText('Deep')).toHaveLength(16);
    expect(errors(container)[0]).toHaveTextContent('Partial depth limit of 16 exceeded');
  });

  it.each([
    ['a string', 'not a chain'],
    ['an object', { file: 'x.md' }],
    ['an array with junk entries', [null, 1, 'x.md']],
  ])('does not throw when the chain variable is %s', (_label, value) => {
    const { container } = renderMd('{% partial file="ok.md" /%}', {
      variables: { '$$vaneui:partialChain': value },
      partials: { 'ok.md': 'Chain ok' },
    });
    expect(screen.getByText('Chain ok')).toBeInTheDocument();
    expect(errors(container)).toHaveLength(0);
  });
});

describe('partials: render budget', () => {
  const limitMessage = 'exceeds the limit of 1000 partial tags per render. It and any later partial tags are not rendered.';

  /** Renders `fn`, failing if it throws or takes longer than `ms`. */
  function quickly<T>(fn: () => T, ms = 3000): T {
    const start = performance.now();
    let result: T | undefined;
    expect(() => {
      result = fn();
    }).not.toThrow();
    expect(performance.now() - start).toBeLessThan(ms);
    return result!;
  }

  /** Every Tag named `name` in a transformed tree. */
  function tagsNamed(tree: unknown, name: string): Tag[] {
    if (Array.isArray(tree)) return tree.flatMap((child) => tagsNamed(child, name));
    if (!Tag.isTag(tree)) return [];
    return [...(tree.name === name ? [tree] : []), ...tree.children.flatMap((child) => tagsNamed(child, name))];
  }

  /** The text strings of a transformed tree, in order. */
  function strings(tree: unknown): string[] {
    if (typeof tree === 'string') return [tree];
    if (Array.isArray(tree)) return tree.flatMap(strings);
    return Tag.isTag(tree) ? tree.children.flatMap(strings) : [];
  }

  function inlineTags(count: number, file = 'w.md'): string {
    return Array.from({ length: count }, () => `{% partial file="${file}" /%}`).join(' ');
  }

  const config = { nodes: defaultNodesConfig, tags: defaultTagsConfig, partials: { 'w.md': 'w' } };

  it('stops a block partial that fans out exponentially, with one error and no crash', () => {
    const tag = '{% partial file="fan.md" variables={x: [$x]} /%}';
    const { container } = quickly(() =>
      renderMd('{% partial file="fan.md" /%}\n\nAfter the partials.', {
        partials: { 'fan.md': `Leaf\n\n${tag}\n\n${tag}` },
      }),
    );
    const found = errors(container);
    const limit = found.filter((el) => el.textContent?.includes(limitMessage));
    expect(limit).toHaveLength(1);
    expect(limit[0]).toHaveTextContent(`Partial "fan.md" ${limitMessage}`);
    expect(limit[0].tagName).not.toBe('SPAN');
    // Every one of the 1000 partial tags either rendered or hit the depth cap.
    const depth = found.filter((el) => el.textContent?.includes('Partial depth limit of 16 exceeded'));
    expect(depth.length).toBeGreaterThan(0);
    expect(screen.getAllByText('Leaf').length + depth.length).toBe(1000);
    expect(found).toHaveLength(depth.length + 1);
    expect(screen.getByText('After the partials.')).toBeInTheDocument();
  });

  it('stops an inline partial that fans out exponentially, inside its paragraph', () => {
    const tag = '{% partial file="fan-inline.md" variables={x: [$x]} /%}';
    const { container } = quickly(() =>
      withoutConsoleErrors(() =>
        renderMd('Start {% partial file="fan-inline.md" /%} end.\n\nAfter the partials.', {
          partials: { 'fan-inline.md': `x ${tag} ${tag}` },
        }),
      ),
    );
    const limit = errors(container).filter((el) => el.textContent?.includes(limitMessage));
    expect(limit).toHaveLength(1);
    expect(limit[0].tagName).toBe('SPAN');
    const paragraphs = container.querySelectorAll('p');
    expect(paragraphs).toHaveLength(2);
    expect(paragraphs[0]).toContainElement(limit[0] as HTMLElement);
    expect(paragraphs[0].textContent).toMatch(/^Start x /);
    expect(paragraphs[0].textContent).toMatch(/ end\.$/);
    expect(paragraphs[1]).toHaveTextContent('After the partials.');
  });

  it('renders 1000 partial tags, then one error, then nothing', () => {
    const tree = Markdoc.transform(Markdoc.parse(`${inlineTags(1000)}\n\n${inlineTags(5)}`), config);
    const [limit, ...rest] = tagsNamed(tree, 'MdErrorInline');
    expect(rest).toHaveLength(0);
    expect(strings(limit)).toEqual([`Partial "w.md" ${limitMessage}`]);
    expect(strings(tree).filter((text) => text === 'w')).toHaveLength(1000);
  });

  it('counts partial errors against the budget too', () => {
    const tree = Markdoc.transform(Markdoc.parse(`${inlineTags(1000, 'missing.md')} ${inlineTags(1)}`), config);
    const found = tagsNamed(tree, 'MdErrorInline').map((tag) => strings(tag).join(''));
    expect(found).toHaveLength(1001);
    expect(found[999]).toContain('Partial "missing.md" not found.');
    expect(found[1000]).toBe(`Partial "w.md" ${limitMessage}`);
    expect(strings(tree)).not.toContain('w');
  });

  it('shares one budget between the page, partials and link text', () => {
    const source = `${inlineTags(997)} {% partial file="two.md" /%} [{% partial file="w.md" /%} {% partial file="w.md" /%}](/u)`;
    const tree = Markdoc.transform(Markdoc.parse(source), {
      ...config,
      partials: { ...config.partials, 'two.md': inlineTags(2) },
    });
    // 997 + two.md + its 2 = 1000, so both partials in the link text are over the budget.
    const [link] = tagsNamed(tree, 'MdLink');
    expect(strings(link)).toEqual([`Partial "w.md" ${limitMessage}`, ' ']);
    expect(tagsNamed(tree, 'MdErrorInline')).toHaveLength(1);
  });

  it('starts a new budget for every transform, even of the same AST and config', () => {
    const ast = Markdoc.parse(inlineTags(600));
    for (let i = 0; i < 3; i++) {
      const tree = Markdoc.transform(ast, config);
      expect(tagsNamed(tree, 'MdErrorInline')).toHaveLength(0);
      expect(strings(tree).filter((text) => text === 'w')).toHaveLength(600);
    }
  });

  it('starts a new budget for every render and every <Md>', () => {
    const content = inlineTags(600);
    const partials = { 'w.md': 'w' };
    const { container, rerender } = render(
      <>
        <Md content={content} config={{ partials }} />
        <Md content={content} config={{ partials }} />
      </>,
    );
    rerender(
      <>
        <Md content={content} config={{ partials }} />
        <Md content={content} config={{ partials }} />
      </>,
    );
    expect(errors(container)).toHaveLength(0);
    const paragraphs = container.querySelectorAll('p');
    expect(paragraphs).toHaveLength(2);
    for (const p of Array.from(paragraphs)) expect(p.textContent!.replace(/\s/g, '')).toBe('w'.repeat(600));
  });
});

describe('partials: inline use', () => {
  it('unwraps a one-paragraph partial inside a paragraph', () => {
    const { container } = withoutConsoleErrors(() =>
      renderMd('Hello {% partial file="name.md" /%}!', { partials: { 'name.md': 'VaneUI' } }),
    );
    const paragraphs = container.querySelectorAll('p');
    expect(paragraphs).toHaveLength(1);
    expect(paragraphs[0]).toHaveTextContent(/^Hello VaneUI!$/);
    expect(container.querySelector('p p, p div')).toBeNull();
  });

  it('unwraps a partial inside a heading and keeps inline formatting', () => {
    const { container } = withoutConsoleErrors(() =>
      renderMd('# Welcome to {% partial file="brand.md" /%}', { partials: { 'brand.md': '**Vane**UI' } }),
    );
    const heading = container.querySelector('h1')!;
    expect(heading).toHaveTextContent(/^Welcome to VaneUI$/);
    expect(heading.querySelector('strong')).toHaveTextContent('Vane');
    expect(heading.querySelector('p, div')).toBeNull();
  });

  it('joins several paragraphs with a space', () => {
    const { container } = withoutConsoleErrors(() =>
      renderMd('Say {% partial file="two.md" /%} now.', { partials: { 'two.md': 'one\n\ntwo' } }),
    );
    expect(container.querySelectorAll('p')).toHaveLength(1);
    expect(container.querySelector('p')).toHaveTextContent(/^Say one two now\.$/);
  });

  it('renders an inline error when the partial has block content', () => {
    const { container } = withoutConsoleErrors(() =>
      renderMd('Text {% partial file="block.md" /%} here.\n\n# Heading {% partial file="block.md" /%}', {
        partials: { 'block.md': 'Intro\n\n- a list' },
      }),
    );
    const found = errors(container);
    expect(found).toHaveLength(2);
    for (const el of found) {
      expect(el.tagName).toBe('SPAN');
      expect(el).toHaveTextContent('Partial "block.md" contains block content and cannot be used inline');
    }
    expect(container.querySelector('p')).toContainElement(found[0] as HTMLElement);
    expect(container.querySelector('h1')).toContainElement(found[1] as HTMLElement);
    expect(container.querySelector('li')).toBeNull();
  });

  it('still renders block partials in full', () => {
    const { container } = renderMd('{% partial file="blocks.md" /%}', { partials: { 'blocks.md': 'Intro\n\n- a list' } });
    expect(container.querySelector('p')).toHaveTextContent('Intro');
    expect(container.querySelector('li')).toHaveTextContent('a list');
  });

  it('unwraps inside table cells and list item text too', () => {
    const { container } = withoutConsoleErrors(() =>
      renderMd('| Name |\n|---|\n| {% partial file="name.md" /%} |\n\n- Built with {% partial file="name.md" /%}', {
        partials: { 'name.md': '**VaneUI**' },
      }),
    );
    const cell = container.querySelector('td')!;
    expect(cell).toHaveTextContent(/^VaneUI$/);
    expect(cell.querySelector('strong')).toHaveTextContent('VaneUI');
    expect(container.querySelector('li')).toHaveTextContent(/^Built with VaneUI$/);
    expect(container.querySelector('td p, li p')).toBeNull();
  });

  describe('inside link text', () => {
    it('unwraps a partial without links', () => {
      const { container } = withoutConsoleErrors(() =>
        renderMd('[See {% partial file="name.md" /%}](/docs)', { partials: { 'name.md': '*VaneUI*' } }),
      );
      const links = container.querySelectorAll('a');
      expect(links).toHaveLength(1);
      expect(links[0]).toHaveAttribute('href', '/docs');
      expect(links[0]).toHaveTextContent(/^See VaneUI$/);
      expect(links[0].querySelector('em')).toHaveTextContent('VaneUI');
    });

    it('renders an inline error instead of nesting a link', () => {
      const { container } = withoutConsoleErrors(() =>
        renderMd('[See {% partial file="linked.md" /%}](/docs) after.', {
          partials: { 'linked.md': 'Hi **[inner](/inner)**' },
        }),
      );
      expect(container.querySelector('a a')).toBeNull();
      expect(container.querySelector('a[href="/inner"]')).toBeNull();
      const link = container.querySelector('a')!;
      const [error] = errors(container);
      expect(error.tagName).toBe('SPAN');
      expect(link).toContainElement(error as HTMLElement);
      expect(error).toHaveTextContent(
        /^Error: Partial "linked\.md" contains a link and cannot be used inside link text\.$/,
      );
      expect(container.querySelector('p')).toHaveTextContent(/ after\.$/);
    });

    it('checks partials nested in the link text partial as well', () => {
      const { container } = withoutConsoleErrors(() =>
        renderMd('[See {% partial file="outer.md" /%}](/docs)', {
          partials: { 'outer.md': 'outer {% partial file="inner.md" /%}', 'inner.md': '[inner](/inner)' },
        }),
      );
      expect(container.querySelectorAll('a')).toHaveLength(1);
      const link = container.querySelector('a')!;
      expect(link).toHaveTextContent(/^See outer Error: Partial "inner\.md" contains a link/);
    });

    it('checks partials inside link text that a partial contains', () => {
      const { container } = withoutConsoleErrors(() =>
        renderMd('{% partial file="card.md" /%}', {
          partials: { 'card.md': 'Read [the {% partial file="linked.md" /%}](/guide).', 'linked.md': '[guide](/g)' },
        }),
      );
      expect(container.querySelectorAll('a')).toHaveLength(1);
      expect(errors(container)[0]).toHaveTextContent('Partial "linked.md" contains a link');
    });

    it('still renders links from a partial used elsewhere inline', () => {
      const { container } = withoutConsoleErrors(() =>
        renderMd('Built with {% partial file="brand.md" /%}.', { partials: { 'brand.md': '[VaneUI](/ui)' } }),
      );
      expect(container.querySelector('p a')).toHaveAttribute('href', '/ui');
      expect(errors(container)).toHaveLength(0);
    });

    it('keeps the render name of a link node override built on the default', () => {
      const MyLink: React.FC<React.PropsWithChildren<{ href?: string }>> = ({ href, children }) => (
        <a className="my-link" href={href}>
          {children}
        </a>
      );
      const { container } = renderMd('[See {% partial file="name.md" /%}](/docs)', {
        nodes: { link: { ...defaultNodesConfig.link, render: 'MyLink' } },
        components: { MyLink },
        partials: { 'name.md': 'VaneUI' },
      });
      expect(container.querySelector('a.my-link')).toHaveTextContent(/^See VaneUI$/);
      expect(container.querySelector('a.my-link')).toHaveAttribute('href', '/docs');
    });
  });

  it('validates inline use without a placement error', () => {
    const ast = Markdoc.parse('Hello {% partial file="name.md" /%}!');
    expect(Markdoc.validate(ast, { tags: defaultTagsConfig, partials: { 'name.md': 'x' } })).toEqual([]);
  });
});

describe('partials: config sources', () => {
  it('merges preset partials and warns when two presets define the same name', () => {
    const warn = jest.spyOn(console, 'warn').mockImplementation(() => {});
    try {
      const resolved = mergePresets(
        { partials: { 'a.md': 'first', 'b.md': 'B' } },
        { partials: { 'a.md': 'second' } },
      );
      expect(resolved.config?.partials).toEqual({ 'a.md': 'second', 'b.md': 'B' });
      expect(warn).toHaveBeenCalledWith(expect.stringContaining('partials.a.md'));
    } finally {
      warn.mockRestore();
    }
  });

  it('renders partials contributed by a preset', () => {
    const Doc = createMd().use({ partials: { 'note.md': 'From the preset' } });
    render(<Doc content={'{% partial file="note.md" /%}'} />);
    expect(screen.getByText('From the preset')).toBeInTheDocument();
  });

  it('keeps a __proto__ key from a preset as a plain key', () => {
    const resolved = mergePresets({ partials: JSON.parse('{"__proto__": "Preset proto"}') });
    const partials = resolved.config!.partials!;
    expect(Object.getPrototypeOf(partials)).toBe(Object.prototype);
    expect(Object.prototype.hasOwnProperty.call(partials, '__proto__')).toBe(true);
    const Doc = createMd().use({ partials: JSON.parse('{"__proto__": "Preset proto"}') });
    render(<Doc content={'{% partial file="__proto__" /%}'} />);
    expect(screen.getByText('Preset proto')).toBeInTheDocument();
  });

  it('lets an explicit config.partials entry win over a preset one, per key', () => {
    render(
      <Md
        content={'{% partial file="a.md" /%}\n\n{% partial file="b.md" /%}'}
        presets={[{ partials: { 'a.md': 'Preset A', 'b.md': 'Preset B' } }]}
        config={{ partials: { 'a.md': 'Explicit A' } }}
      />,
    );
    expect(screen.getByText('Explicit A')).toBeInTheDocument();
    expect(screen.queryByText('Preset A')).toBeNull();
    expect(screen.getByText('Preset B')).toBeInTheDocument();
  });

  it('runs the transform hook over partial content (headingAnchors)', () => {
    const { container } = renderMd(
      '{% partial file="h.md" /%}',
      { partials: { 'h.md': '## Getting Started' } },
      { transform: headingAnchors() },
    );
    expect(container.querySelector('h2')).toHaveAttribute('id', 'getting-started');
  });

  it('passes partials through MdStream', () => {
    const { container } = render(
      <MdStream content={'# Page\n\n{% partial file="s.md" /%}'} config={{ partials: { 's.md': 'Streamed partial' } }} />,
    );
    expect(screen.getByText('Streamed partial')).toBeInTheDocument();
    expect(errors(container)).toHaveLength(0);
  });

  it('lets config.tags.partial override the default tag', () => {
    const partial = { selfClosing: true, transform: () => new Tag('MdText', {}, ['custom partial']) };
    const { container } = renderMd('{% partial file="missing.md" /%}', { tags: { partial } });
    expect(screen.getByText('custom partial')).toBeInTheDocument();
    expect(errors(container)).toHaveLength(0);
  });
});

describe('include tag (unresolved file includes)', () => {
  const unresolved = 'Include "x.md" was not resolved. Pass the source through resolveIncludes from @vaneui/md/include';

  it('shows an error for an unclosed include and still renders the rest of the document', () => {
    const { container } = renderMd('# Before\n\n{% include "x.md" %}\n\n## After\n\nTail paragraph.');
    const [error] = errors(container);
    expect(error).toHaveTextContent('It expands include tags that sit alone on their line');
    expect(error).toHaveTextContent(unresolved);
    expect(container.querySelector('h1')).toHaveTextContent('Before');
    expect(container.querySelector('h2')).toHaveTextContent('After');
    expect(screen.getByText('Tail paragraph.')).toBeInTheDocument();
    // The rest of the document is not trapped inside the error.
    expect(error).not.toContainElement(container.querySelector('h2'));
  });

  it('handles the self-closing form and the file attribute', () => {
    const { container } = renderMd('{% include "a.md" /%}\n\n{% include file="b.md" /%}\n\nAfter.');
    const found = errors(container);
    expect(found).toHaveLength(2);
    expect(found[0]).toHaveTextContent('Include "a.md" was not resolved.');
    expect(found[1]).toHaveTextContent('Include "b.md" was not resolved.');
    expect(screen.getByText('After.')).toBeInTheDocument();
  });

  it('treats an explicitly closed include as self-closing: one error, then the former children', () => {
    const { container } = renderMd('{% include "x.md" %}\nInside the tag.\n{% /include %}\n\nAfter.');
    const found = errors(container);
    expect(found).toHaveLength(1);
    expect(found[0]).toHaveTextContent(unresolved);
    expect(found[0]).not.toHaveTextContent('Inside the tag.');
    expect(screen.getByText('Inside the tag.')).toBeInTheDocument();
    expect(screen.getByText('After.')).toBeInTheDocument();
  });

  it('ignores a stray closing include tag', () => {
    const { container } = renderMd('{% include "x.md" /%}\n\nMiddle.\n\n{% /include %}\n\nAfter.');
    expect(errors(container)).toHaveLength(1);
    expect(screen.getByText('Middle.')).toBeInTheDocument();
    expect(screen.getByText('After.')).toBeInTheDocument();
  });

  it('does not pair an include inside a blockquote with a closing tag outside it', () => {
    const { container } = renderMd('> {% include "x.md" %}\n> Quoted.\n\n{% /include %}\n\nTail.');
    expect(errors(container)).toHaveLength(1);
    const quote = container.querySelector('.vane-card[data-appearance="secondary"]')!;
    expect(quote).toHaveTextContent('Quoted.');
    expect(quote).not.toHaveTextContent('Tail.');
    expect(screen.getByText('Tail.')).toBeInTheDocument();
  });

  it('renders one error in MdStream for a closed include split across blocks', () => {
    const { container } = render(<MdStream content={'{% include "x.md" %}\n\nInside.\n\n{% /include %}\n\nAfter.'} />);
    expect(errors(container)).toHaveLength(1);
    expect(screen.getByText('Inside.')).toBeInTheDocument();
    expect(screen.getByText('After.')).toBeInTheDocument();
  });

  it('keeps an inline include inside its paragraph without block-in-p nesting', () => {
    const consoleError = jest.spyOn(console, 'error');
    try {
      const { container } = renderMd('Before {% include "x.md" %} after.\n\nNext paragraph.\n\n- item');
      const paragraphs = container.querySelectorAll('p');
      expect(paragraphs).toHaveLength(2);
      const [first, second] = Array.from(paragraphs);
      const [error] = errors(container);
      expect(error.tagName).toBe('SPAN');
      expect(error).toHaveTextContent(unresolved);
      expect(first).toContainElement(error as HTMLElement);
      expect(first).toHaveTextContent(/^Before .* after\.$/);
      expect(second).toHaveTextContent('Next paragraph.');
      expect(container.querySelector('p p, p div, p ul, p li')).toBeNull();
      expect(container.querySelector('li')).toHaveTextContent('item');
      expect(consoleError).not.toHaveBeenCalled();
    } finally {
      consoleError.mockRestore();
    }
  });

  it('does not swallow the following list items when used in a list item', () => {
    const { container } = renderMd('- {% include "x.md" %}\n- second\n\nAfter list.');
    const items = container.querySelectorAll('li');
    expect(items).toHaveLength(2);
    expect(items[0]).toHaveTextContent('Include "x.md" was not resolved.');
    expect(items[1]).toHaveTextContent('second');
    expect(container.querySelector('li li')).toBeNull();
    expect(screen.getByText('After list.')).toBeInTheDocument();
  });

  it('applies the unclosed-include repair inside string partials too', () => {
    const { container } = renderMd('{% partial file="p.md" /%}\n\nPage tail.', {
      partials: { 'p.md': 'Partial {% include "x.md" %} text.\n\nPartial tail.' },
    });
    expect(errors(container)[0].tagName).toBe('SPAN');
    expect(screen.getByText('Partial tail.')).toBeInTheDocument();
    expect(screen.getByText('Page tail.')).toBeInTheDocument();
    expect(container.querySelector('p p')).toBeNull();
  });

  it('leaves include syntax inside code fences and inline code alone', () => {
    const { container } = renderMd('```md\n{% include "x.md" %}\n```\n\nUse `{% include "y.md" %}` inline.');
    expect(errors(container)).toHaveLength(0);
    expect(container.querySelector('pre')).toHaveTextContent('{% include "x.md" %}');
    expect(container.querySelector('code:not(pre code)')).toHaveTextContent('{% include "y.md" %}');
  });

  it('lets config.tags.include override the default tag', () => {
    const include = {
      attributes: { primary: { type: String, render: false } },
      transform: (node: Node) => new Tag('MdText', {}, [`included ${node.attributes.primary}`]),
    };
    const { container } = renderMd('{% include "x.md" /%}', { tags: { include } });
    expect(screen.getByText('included x.md')).toBeInTheDocument();
    expect(errors(container)).toHaveLength(0);
  });
});

describe('self-closing parse rule for include and partial', () => {
  /** A container tag that reports how many children it received. */
  const counting = {
    transform: (node: Node) => new Tag('MdText', {}, [`${node.tag} children: ${node.children.length}`]),
  };

  it('does not let an unclosed partial swallow the rest of the page', () => {
    const { container } = renderMd('{% partial file="a.md" %}\n\n## Rest of page\n\nMore text.', {
      partials: { 'a.md': 'Partial body' },
    });
    expect(screen.getByText('Partial body')).toBeInTheDocument();
    expect(container.querySelector('h2')).toHaveTextContent('Rest of page');
    expect(screen.getByText('More text.')).toBeInTheDocument();
    expect(errors(container)).toHaveLength(0);
  });

  it('marks both default tags as self-closing', () => {
    expect(defaultTagsConfig.include.selfClosing).toBe(true);
    expect(defaultTagsConfig.partial.selfClosing).toBe(true);
  });

  it('keeps the rule when config.tags passes the library tag itself', () => {
    const { container } = renderMd('{% include "x.md" %}\nInside.\n{% /include %}', {
      tags: { include: defaultTagsConfig.include },
    });
    expect(errors(container)).toHaveLength(1);
    expect(screen.getByText('Inside.')).toBeInTheDocument();
  });

  it('does not apply to an include tag replaced through config.tags', () => {
    renderMd('{% include "x.md" %}\nInside.\n{% /include %}', { tags: { include: counting } });
    expect(screen.getByText('include children: 1')).toBeInTheDocument();
    expect(screen.queryByText('Inside.')).toBeNull();
  });

  it('does not apply to a partial tag replaced through a preset', () => {
    render(<Md content={'{% partial file="x.md" %}\nInside.\n{% /partial %}'} presets={[{ tags: { partial: counting } }]} />);
    expect(screen.getByText('partial children: 1')).toBeInTheDocument();
  });

  it('applies to string partials rendered outside <Md> only for the library tags in config.tags', () => {
    const source = 'Partial {% include "x.md" %} text.\n\nOutside tail.';
    const own = JSON.stringify(
      Markdoc.transform(Markdoc.parse('{% partial file="out.md" /%}'), {
        tags: defaultTagsConfig,
        partials: { 'out.md': source },
      }),
    );
    expect(own).toContain('MdErrorInline');
    expect(own).toContain('Outside tail.');
    const custom = JSON.stringify(
      Markdoc.transform(Markdoc.parse('{% partial file="out.md" /%}'), {
        tags: { ...defaultTagsConfig, include: counting },
        partials: { 'out.md': source },
      }),
    );
    // Not self-closing: the custom tag takes the rest of the paragraph as a child.
    expect(custom).toContain('include children: 1');
    expect(custom).not.toContain('MdErrorInline');
  });

  it.each([
    ['frontmatter', '---\ntitle: Hi\n---\n\n# {% $markdoc.frontmatter.title %}\n\nBody text.'],
    ['fences containing tags', '```md\n{% callout %}\nhi\n{% /callout %}\n{% note %}\n```\n\nAfter the fence.'],
    ['tables', '| a | b |\n|---|---|\n| 1 | {% $x %} |\n| **2** | `c` |'],
    ['if/else', '{% if $a %}\nA\n{% else /%}\nB {% $b %}\n{% /if %}'],
    ['lists', '- one\n- two {% .highlight %}\n  1. nested\n  2. more\n\n3. ordered'],
    ['quotes', '> quoted {% $x %}\n>\n> {% callout type="note" %}\n> inner\n> {% /callout %}'],
    ['words and inline code only', 'Mention include and partial, and `{% include "x.md" %}` in code.'],
  ])('is a strict no-op for documents without those tags (%s)', (_label, source) => {
    expect(parseMarkdown(source)).toEqual(Markdoc.parse(source));
  });

  it('leaves include and partial tags alone when no tag names are given', () => {
    const source = '{% include "x.md" %}\nInside.\n{% /include %}\n\n{% partial file="a.md" %}\nBody\n{% /partial %}';
    expect(parseMarkdown(source, { selfClosingTags: [] })).toEqual(Markdoc.parse(source));
  });

  it('only repairs the tag names it is given', () => {
    const source = '{% include "x.md" %}\nA\n{% /include %}\n\n{% partial file="p.md" %}\nB\n{% /partial %}';
    const [include, , partial] = parseMarkdown(source, { selfClosingTags: ['include'] }).children;
    expect(include).toMatchObject({ tag: 'include', children: [] });
    expect(partial).toMatchObject({ tag: 'partial' });
    expect(partial.children).toHaveLength(1);
  });
});
