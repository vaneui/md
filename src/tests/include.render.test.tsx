import React from 'react';
import * as path from 'node:path';
import { render, screen } from '@testing-library/react';
import Markdoc from '@markdoc/markdoc';
import { Md } from '../components/md';
import { resolveIncludes } from '../include';

const root = path.resolve(path.sep, 'virtual-docs');

/** Resolve `entry` from an in-memory file map rooted at `root`. */
function resolveVirtual(files: Record<string, string>, entry: string) {
  return resolveIncludes(files[entry], {
    filePath: path.join(root, ...entry.split('/')),
    root,
    readFile: (file) => {
      const content = files[path.relative(root, file).split(path.sep).join('/')];
      if (content === undefined) {
        throw Object.assign(new Error(`ENOENT: ${file}`), { code: 'ENOENT' });
      }
      return content;
    },
  });
}

describe('resolveIncludes + <Md>', () => {
  it('renders headings and text from an included file', () => {
    const files = {
      'guide/page.md':
        '---\ntitle: Guide\n---\n\n# Guide\n\n{% include "parts/intro.md" %}\n\nAfter the include.\n',
      'guide/parts/intro.md':
        '---\ntitle: Intro partial\n---\n\n## Included heading\n\nIncluded paragraph.\n\n- Included item\n',
    };

    render(<Md content={resolveVirtual(files, 'guide/page.md')} />);

    expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent('Guide');
    expect(screen.getByRole('heading', { level: 2 })).toHaveTextContent('Included heading');
    expect(screen.getByText('Included paragraph.')).toBeInTheDocument();
    expect(screen.getByText('Included item')).toBeInTheDocument();
    expect(screen.getByText('After the include.')).toBeInTheDocument();
    // The partial's frontmatter was stripped, so it does not render as text.
    expect(screen.queryByText(/Intro partial/)).not.toBeInTheDocument();
  });

  it('keeps an include inside a list item in that item', () => {
    const files = {
      'page.md': '- First item\n\n  {% include "part.md" %}\n- Second item\n\nAfter the list.\n',
      'part.md': 'Included paragraph.\n\n```js\nif (x) {\n\treturn 1;\n}\n```\n\n- Nested item\n',
    };
    const content = resolveVirtual(files, 'page.md');
    // The included code keeps its tab: only the indentation before it is new.
    expect(content).toBe(
      '- First item\n\n  Included paragraph.\n\n  ```js\n  if (x) {\n  \treturn 1;\n  }\n  ```\n\n  - Nested item\n- Second item\n\nAfter the list.\n',
    );
    const fences = (source: string) =>
      [...Markdoc.parse(source).walk()]
        .filter((node) => node.type === 'fence')
        .map((node) => node.attributes.content);
    expect(fences(content)).toEqual(fences(files['part.md']));

    const { container } = render(<Md content={content} />);
    const items = container.querySelectorAll(':scope > div > ul > li');
    expect(items).toHaveLength(2);
    expect(items[0]).toContainElement(screen.getByText('Included paragraph.'));
    expect(items[0]).toContainElement(screen.getByText('Nested item'));
    const code = items[0].querySelector('pre code');
    expect(code).not.toBeNull();
    expect(code!.textContent).toBe('if (x) {\n\treturn 1;\n}\n');
    expect(items[1]).toHaveTextContent('Second item');
    expect(items[1]).not.toHaveTextContent('Included paragraph.');
    expect(screen.getByText('After the list.').closest('li')).toBeNull();
  });

  it('keeps an include inside a blockquote in that quote', () => {
    const files = {
      'page.md': '> **Note**\n>\n> {% include "part.md" %}\n\nAfter the quote.\n',
      'part.md': 'Quoted paragraph.\n\n- Quoted item\n\n```\ncode\n```\n',
    };
    const content = resolveVirtual(files, 'page.md');
    expect(content).toBe(
      '> **Note**\n>\n> Quoted paragraph.\n>\n> - Quoted item\n>\n> ```\n> code\n> ```\n\nAfter the quote.\n',
    );

    render(<Md content={content} />);
    const quote = screen.getByText('Note').closest('.vane-card');
    expect(quote).not.toBeNull();
    expect(quote).toHaveAttribute('data-appearance', 'secondary');
    expect(quote).toContainElement(screen.getByText('Quoted paragraph.'));
    expect(quote).toContainElement(screen.getByText('Quoted item'));
    expect(quote!.querySelector('pre code')).toHaveTextContent('code');
    expect(quote).not.toContainElement(screen.getByText('After the quote.'));
  });

  it('closes a fence an included file leaves open, so the page after it still renders', () => {
    const files = {
      'page.md': '{% include "open.md" %}\n\n# After\n',
      'open.md': '```\nunclosed code\n',
    };

    render(<Md content={resolveVirtual(files, 'page.md')} />);

    expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent('After');
    expect(screen.getByText('unclosed code')).toBeInTheDocument();
  });
});
