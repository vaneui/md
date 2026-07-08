import React from 'react';
import { render, screen } from '@testing-library/react';
import { Md } from '../components/md';
import { createMd } from '../createMd';
import { mergePresets, untrustedPreset, type MdPreset } from '../preset';
import { parseYamlFrontmatter } from '../yaml';
import type { HighlightFn } from '../context';

const hlA: HighlightFn = (code) => <div data-testid="hlA">{code}</div>;
const hlB: HighlightFn = (code) => <div data-testid="hlB">{code}</div>;

describe('mergePresets', () => {
  it('folds highlight (last wins), merges config, and composes transforms in order', () => {
    const order: string[] = [];
    const p1: MdPreset = { highlight: hlA, tags: { a: 1 }, transform: (t) => { order.push('t1'); return t; } };
    const p2: MdPreset = { highlight: hlB, tags: { b: 2 }, transform: (t) => { order.push('t2'); return t; } };
    const resolved = mergePresets(p1, p2);
    expect(resolved.highlight).toBe(hlB);
    expect(resolved.config?.tags).toEqual({ a: 1, b: 2 });
    resolved.transform!(null as any);
    expect(order).toEqual(['t1', 't2']);
  });

  it('warns in dev on a conflicting key and last wins', () => {
    const warn = jest.spyOn(console, 'warn').mockImplementation(() => {});
    const resolved = mergePresets({ tags: { dup: 1 } }, { tags: { dup: 2 } });
    expect(warn).toHaveBeenCalledWith(expect.stringContaining('tags.dup'));
    expect(resolved.config?.tags).toEqual({ dup: 2 });
    warn.mockRestore();
  });
});

describe('createMd().use() + presets prop', () => {
  it('bakes a highlight preset into a component', () => {
    const Doc = createMd().use({ highlight: hlA });
    render(<Doc content={'```ts\nx\n```'} />);
    expect(screen.getByTestId('hlA')).toBeInTheDocument();
  });

  it('supports the presets prop directly on <Md>', () => {
    render(<Md content={'```ts\nx\n```'} presets={[{ highlight: hlA }]} />);
    expect(screen.getByTestId('hlA')).toBeInTheDocument();
  });

  it('lets an explicit prop win over a preset value', () => {
    const Doc = createMd().use({ highlight: hlA });
    render(<Doc content={'```ts\nx\n```'} highlight={hlB} />);
    expect(screen.queryByTestId('hlA')).toBeNull();
    expect(screen.getByTestId('hlB')).toBeInTheDocument();
  });
});

describe('untrustedPreset', () => {
  const registry = {
    Link: (p: any) => <a data-testid="lnk" href={p.href}>{p.children}</a>,
  };
  const md = ['```vaneui', 'Link:', '  href: ftp://files.example', '  text: Click', '```'].join('\n');

  it('applies strictSanitizePolicy: drops an ftp: href the floor would allow', () => {
    render(
      <Md content={md} presets={[untrustedPreset]} parseFrontmatter={parseYamlFrontmatter} components={registry} />,
    );
    expect(screen.getByTestId('lnk')).not.toHaveAttribute('href');
  });

  it('without the preset, the floor still allows ftp: (only script protocols are blocked)', () => {
    render(<Md content={md} parseFrontmatter={parseYamlFrontmatter} components={registry} />);
    expect(screen.getByTestId('lnk')).toHaveAttribute('href', 'ftp://files.example');
  });
});
