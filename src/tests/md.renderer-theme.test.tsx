import React from 'react';
import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';
import { Md } from '../components/md';
import {
  RendererThemeContext,
  defaultRendererTheme,
  mergeRendererTheme,
  type MdRendererTheme,
} from '../rendererTheme';

describe('rendererTheme — default visuals (regression)', () => {
  test('inline code renders with secondary appearance by default', () => {
    const { container } = render(<Md content="text with `code` inline" />);
    const codeEl = container.querySelector('.font-mono[data-appearance]');
    expect(codeEl).toHaveAttribute('data-appearance', 'secondary');
  });

  test('blockquote Card renders with secondary + left bar by default', () => {
    const { container } = render(<Md content="> quoted text" />);
    const cardEl = container.querySelector('.border-l-\\[length\\:var\\(--bw\\)\\]');
    expect(cardEl).toHaveAttribute('data-appearance', 'secondary');
    expect(cardEl).not.toHaveClass('border-[length:var(--bw)]');
  });

  test('em renders italic by default', () => {
    const { container } = render(<Md content="*emphasis*" />);
    const em = container.querySelector('em');
    expect(em).toHaveClass('italic');
  });

  test('strong renders bold by default', () => {
    const { container } = render(<Md content="**bold**" />);
    const strong = container.querySelector('strong');
    expect(strong).toHaveClass('font-bold');
  });

  test('s renders line-through by default', () => {
    const { container } = render(<Md content="~~strike~~" />);
    const s = container.querySelector('s');
    expect(s).toHaveClass('line-through');
  });
});

describe('rendererTheme — per-renderer overrides via prop', () => {
  test('rendererTheme.mdCode overrides inline code appearance', () => {
    const { container } = render(
      <Md
        content="text with `code` inline"
        rendererTheme={{ mdCode: { primary: true } }}
      />
    );
    const codeEl = container.querySelector('.font-mono[data-appearance]');
    expect(codeEl).toHaveAttribute('data-appearance', 'primary');
  });

  test('rendererTheme.mdCode success overrides default secondary', () => {
    const { container } = render(
      <Md
        content="text with `code` inline"
        rendererTheme={{ mdCode: { success: true } }}
      />
    );
    const codeEl = container.querySelector('.font-mono[data-appearance]');
    expect(codeEl).toHaveAttribute('data-appearance', 'success');
  });

  test('rendererTheme.mdBlockquote overrides Card appearance only — keeps left bar', () => {
    const { container } = render(
      <Md
        content="> quoted"
        rendererTheme={{ mdBlockquote: { primary: true } }}
      />
    );
    const cardEl = container.querySelector('.border-l-\\[length\\:var\\(--bw\\)\\]');
    expect(cardEl).toHaveAttribute('data-appearance', 'primary');
  });

  test('rendererTheme.mdBlockquote with border:true clears noBorder/borderL group', () => {
    const { container } = render(
      <Md
        content="> quoted"
        rendererTheme={{ mdBlockquote: { border: true } }}
      />
    );
    expect(container.querySelector('.border-l-\\[length\\:var\\(--bw\\)\\]')).toBeNull();
    const card = container.querySelector('.vane-card');
    expect(card).toHaveClass('border-[length:var(--bw)]');
  });

  test('rendererTheme.mdEm can replace italic with bold', () => {
    const { container } = render(
      <Md
        content="*emphasis*"
        rendererTheme={{ mdEm: { italic: false, bold: true } }}
      />
    );
    const em = container.querySelector('em');
    expect(em).not.toHaveClass('italic');
    expect(em).toHaveClass('font-bold');
  });

  test('rendererTheme overrides do not affect siblings using the same VaneUI primitive', () => {
    // MdParagraph and MdEm both render <Text> — overriding mdEm must not affect mdParagraph
    const { container } = render(
      <Md
        content="paragraph with *em* inside"
        rendererTheme={{ mdEm: { uppercase: true } }}
      />
    );
    const em = container.querySelector('em');
    expect(em).toHaveClass('uppercase');
    const p = container.querySelector('p');
    expect(p).not.toHaveClass('uppercase');
  });

  test('rendererTheme.mdFence affects code blocks but not blockquotes', () => {
    const content = '```\ncode\n```\n\n> quoted';
    const { container } = render(
      <Md
        content={content}
        rendererTheme={{ mdFence: { success: true } }}
      />
    );
    const fenceCard = container.querySelector('pre')?.closest('.vane-card');
    expect(fenceCard).toHaveAttribute('data-appearance', 'success');
    const blockquoteCard = container.querySelector('.border-l-\\[length\\:var\\(--bw\\)\\]');
    expect(blockquoteCard).toHaveAttribute('data-appearance', 'secondary');
  });
});

describe('rendererTheme — multiple renderer overrides at once', () => {
  test('overriding mdCode and mdBlockquote independently', () => {
    const content = ['Para with `code` inline.', '', '> quoted text'].join('\n');
    const { container } = render(
      <Md
        content={content}
        rendererTheme={{
          mdCode: { success: true },
          mdBlockquote: { danger: true },
        }}
      />
    );
    const codeEl = container.querySelector('.font-mono[data-appearance]');
    expect(codeEl).toHaveAttribute('data-appearance', 'success');
    const blockquoteCard = container.querySelector('.border-l-\\[length\\:var\\(--bw\\)\\]');
    expect(blockquoteCard).toHaveAttribute('data-appearance', 'danger');
  });
});

describe('mergeRendererTheme — group-aware merge utility', () => {
  test('merges user keys over defaults when no group conflict', () => {
    const merged = mergeRendererTheme(defaultRendererTheme, {
      mdCode: { uppercase: true },
    });
    expect(merged.mdCode).toEqual({ secondary: true, uppercase: true });
  });

  test('clears appearance group from defaults when user sets any appearance key', () => {
    const merged = mergeRendererTheme(defaultRendererTheme, {
      mdBlockquote: { primary: true },
    });
    expect(merged.mdBlockquote).toEqual({
      primary: true,
      noBorder: true,
      borderL: true,
    });
    expect((merged.mdBlockquote as Record<string, unknown>).secondary).toBeUndefined();
  });

  test('clears border group from defaults when user sets border:true', () => {
    const merged = mergeRendererTheme(defaultRendererTheme, {
      mdBlockquote: { border: true },
    });
    const bq = merged.mdBlockquote as Record<string, unknown>;
    expect(bq.border).toBe(true);
    expect(bq.borderL).toBeUndefined();
    expect(bq.noBorder).toBeUndefined();
    expect(bq.secondary).toBe(true);
  });

  test('handles undefined user theme gracefully', () => {
    const merged = mergeRendererTheme(defaultRendererTheme, undefined);
    expect(merged).toEqual(defaultRendererTheme);
  });

  test('adds new slots not present in defaults', () => {
    const userTheme: MdRendererTheme = {
      mdHeading: { mono: true, uppercase: true },
    };
    const merged = mergeRendererTheme(defaultRendererTheme, userTheme);
    expect(merged.mdHeading).toEqual({ mono: true, uppercase: true });
    expect(merged.mdBlockquote).toEqual(defaultRendererTheme.mdBlockquote);
  });

  test('multiple group conflicts in the same slot are all handled', () => {
    const merged = mergeRendererTheme(defaultRendererTheme, {
      mdBlockquote: { primary: true, border: true },
    });
    const bq = merged.mdBlockquote as Record<string, unknown>;
    expect(bq.primary).toBe(true);
    expect(bq.border).toBe(true);
    expect(bq.secondary).toBeUndefined();
    expect(bq.noBorder).toBeUndefined();
    expect(bq.borderL).toBeUndefined();
  });
});

describe('mergeRendererTheme — group-aware merge for size/variant/shape', () => {
  test('size group: user sets lg, defaults\' xs is dropped', () => {
    const defaults: MdRendererTheme = { mdCode: { xs: true, secondary: true } };
    const merged = mergeRendererTheme(defaults, { mdCode: { lg: true } });
    const c = merged.mdCode as Record<string, unknown>;
    expect(c.lg).toBe(true);
    expect(c.xs).toBeUndefined();
    expect(c.secondary).toBe(true);
  });

  test('variant group: user sets filled, defaults\' outline is dropped', () => {
    const defaults: MdRendererTheme = { mdBlockquote: { outline: true, secondary: true } };
    const merged = mergeRendererTheme(defaults, { mdBlockquote: { filled: true } });
    const b = merged.mdBlockquote as Record<string, unknown>;
    expect(b.filled).toBe(true);
    expect(b.outline).toBeUndefined();
    expect(b.secondary).toBe(true);
  });

  test('shape group: user sets pill, defaults\' rounded is dropped', () => {
    const defaults: MdRendererTheme = { mdCode: { rounded: true, secondary: true } };
    const merged = mergeRendererTheme(defaults, { mdCode: { pill: true } });
    const c = merged.mdCode as Record<string, unknown>;
    expect(c.pill).toBe(true);
    expect(c.rounded).toBeUndefined();
    expect(c.secondary).toBe(true);
  });

  test('user setting falsy in a group does NOT trigger group-clearing', () => {
    const defaults: MdRendererTheme = { mdCode: { secondary: true } };
    const merged = mergeRendererTheme(defaults, { mdCode: { primary: false } });
    const c = merged.mdCode as Record<string, unknown>;
    expect(c.primary).toBe(false);
    expect(c.secondary).toBe(true);
  });
});

describe('per-renderer override coverage — every plumbed renderer reads its slot', () => {
  test('mdParagraph slot — applies to <Text tag="p">', () => {
    const { container } = render(
      <Md content="some paragraph" rendererTheme={{ mdParagraph: { uppercase: true } }} />
    );
    const p = container.querySelector('p');
    expect(p).toHaveClass('uppercase');
  });

  test('mdText slot — applies when MdText is explicitly mapped to a node', () => {
    const { container } = render(
      <Md
        content="hello"
        rendererTheme={{ mdText: { italic: true } }}
        config={{ nodes: { text: { render: 'MdText' } } }}
      />
    );
    const span = container.querySelector('span');
    expect(span).toHaveClass('italic');
  });

  test('mdHeading slot — applies alongside dynamic level→size mapping', () => {
    const { container } = render(
      <Md content="# Big" rendererTheme={{ mdHeading: { mono: true } }} />
    );
    const h1 = container.querySelector('h1');
    expect(h1).toHaveClass('font-mono');
    expect(h1).toHaveAttribute('data-size', 'xl');
  });

  test('mdLink slot — applies to MdLink', () => {
    const { container } = render(
      <Md
        content="[click](https://example.com)"
        rendererTheme={{ mdLink: { uppercase: true } }}
      />
    );
    const a = container.querySelector('a');
    expect(a).toHaveClass('uppercase');
    expect(a).toHaveAttribute('href', 'https://example.com');
  });

  test('mdList slot — applies alongside dynamic decimal/disc', () => {
    const content = ['- one', '- two'].join('\n');
    const { container } = render(
      <Md content={content} rendererTheme={{ mdList: { uppercase: true } }} />
    );
    const ul = container.querySelector('ul');
    expect(ul).toHaveClass('uppercase');
    expect(ul).toHaveClass('list-disc');
  });

  test('mdItem slot — applies to list items', () => {
    const content = ['- one', '- two'].join('\n');
    const { container } = render(
      <Md content={content} rendererTheme={{ mdItem: { bold: true } }} />
    );
    const li = container.querySelector('li');
    expect(li).toHaveClass('font-bold');
  });

  test('mdHr slot — applies to MdHr divider', () => {
    const content = ['text', '', '---', '', 'more'].join('\n');
    const { container } = render(
      <Md content={content} rendererTheme={{ mdHr: { lg: true } }} />
    );
    const hr = container.querySelector('[role="separator"]');
    expect(hr).toHaveAttribute('data-size', 'lg');
  });

  test('mdImage slot — applies to MdImage', () => {
    const { container } = render(
      <Md
        content="![alt](https://example.com/x.png)"
        rendererTheme={{ mdImage: { pill: true } }}
      />
    );
    const img = container.querySelector('img');
    expect(img).toHaveClass('rounded-full');
  });

  test('mdDocument slot — applies to top-level Col wrapper', () => {
    const { container } = render(
      <Md content="just text" rendererTheme={{ mdDocument: { itemsCenter: true } }} />
    );
    const col = container.firstChild as HTMLElement;
    expect(col).toHaveClass('items-center');
  });
});

describe('RendererThemeContext — direct provider usage', () => {
  test('wrapping with RendererThemeContext.Provider works without the rendererTheme prop', () => {
    const { container } = render(
      <RendererThemeContext.Provider
        value={{
          ...defaultRendererTheme,
          mdCode: { primary: true },
        }}
      >
        <Md content="text with `code` here" />
      </RendererThemeContext.Provider>
    );
    const codeEl = container.querySelector('.font-mono[data-appearance]');
    expect(codeEl).toHaveAttribute('data-appearance', 'primary');
  });

  test('the rendererTheme prop wins over an outer RendererThemeContext.Provider', () => {
    const { container } = render(
      <RendererThemeContext.Provider
        value={{ ...defaultRendererTheme, mdCode: { primary: true } }}
      >
        <Md
          content="text with `code` here"
          rendererTheme={{ mdCode: { success: true } }}
        />
      </RendererThemeContext.Provider>
    );
    const codeEl = container.querySelector('.font-mono[data-appearance]');
    expect(codeEl).toHaveAttribute('data-appearance', 'success');
  });
});

describe('Override every default in defaultRendererTheme — exhaustive', () => {
  // ── mdBlockquote.secondary (appearance) ─────────────────────────────────────
  test('mdBlockquote.secondary → replace with success', () => {
    const { container } = render(
      <Md content="> q" rendererTheme={{ mdBlockquote: { success: true } }} />
    );
    const card = container.querySelector('.border-l-\\[length\\:var\\(--bw\\)\\]');
    expect(card).toHaveAttribute('data-appearance', 'success');
  });

  test('mdBlockquote.secondary → replace with inherit (vaneui omits data-appearance for inherit)', () => {
    const { container } = render(
      <Md content="> q" rendererTheme={{ mdBlockquote: { inherit: true } }} />
    );
    const card = container.querySelector('.border-l-\\[length\\:var\\(--bw\\)\\]');
    expect(card).toBeTruthy();
    expect(card).not.toHaveAttribute('data-appearance', 'secondary');
  });

  // ── mdBlockquote.noBorder + borderL (border) ────────────────────────────────
  test('mdBlockquote.noBorder/borderL → replace with full border', () => {
    const { container } = render(
      <Md content="> q" rendererTheme={{ mdBlockquote: { border: true } }} />
    );
    const card = container.querySelector('.vane-card');
    expect(card).toHaveClass('border-[length:var(--bw)]');
    expect(card).not.toHaveClass('border-l-[length:var(--bw)]');
  });

  test('mdBlockquote.borderL → replace with borderR (different side, same group)', () => {
    const { container } = render(
      <Md content="> q" rendererTheme={{ mdBlockquote: { borderR: true } }} />
    );
    const card = container.querySelector('.vane-card');
    expect(card).toHaveClass('border-r-[length:var(--bw)]');
    expect(card).not.toHaveClass('border-l-[length:var(--bw)]');
  });

  // ── mdCode.secondary (appearance) ───────────────────────────────────────────
  test('mdCode.secondary → replace with primary', () => {
    const { container } = render(
      <Md content="`x`" rendererTheme={{ mdCode: { primary: true } }} />
    );
    const code = container.querySelector('.font-mono[data-appearance]');
    expect(code).toHaveAttribute('data-appearance', 'primary');
  });

  test('mdCode.secondary → replace with inherit (vaneui omits data-appearance for inherit)', () => {
    const { container } = render(
      <Md content="`x`" rendererTheme={{ mdCode: { inherit: true } }} />
    );
    const codeWithSecondary = container.querySelector('.font-mono[data-appearance="secondary"]');
    expect(codeWithSecondary).toBeNull();
    expect(container.querySelector('.font-mono')).toBeTruthy();
  });

  // ── mdEm.italic (fontStyle) ─────────────────────────────────────────────────
  test('mdEm.italic → replace with notItalic (same fontStyle group)', () => {
    const { container } = render(
      <Md content="*emph*" rendererTheme={{ mdEm: { notItalic: true } }} />
    );
    const em = container.querySelector('em');
    expect(em).toHaveClass('not-italic');
    expect(em).not.toHaveClass('italic');
  });

  test('mdEm.italic → disable explicitly with italic:false', () => {
    const { container } = render(
      <Md content="*emph*" rendererTheme={{ mdEm: { italic: false } }} />
    );
    const em = container.querySelector('em');
    expect(em).not.toHaveClass('italic');
  });

  // ── mdStrong.bold (fontWeight) ──────────────────────────────────────────────
  test('mdStrong.bold → replace with light (same fontWeight group)', () => {
    const { container } = render(
      <Md content="**word**" rendererTheme={{ mdStrong: { light: true } }} />
    );
    const strong = container.querySelector('strong');
    expect(strong).toHaveClass('font-light');
    expect(strong).not.toHaveClass('font-bold');
  });

  test('mdStrong.bold → replace with semibold (same fontWeight group)', () => {
    const { container } = render(
      <Md content="**word**" rendererTheme={{ mdStrong: { semibold: true } }} />
    );
    const strong = container.querySelector('strong');
    expect(strong).toHaveClass('font-semibold');
    expect(strong).not.toHaveClass('font-bold');
  });

  test('mdStrong.bold → disable explicitly with bold:false', () => {
    const { container } = render(
      <Md content="**word**" rendererTheme={{ mdStrong: { bold: false } }} />
    );
    const strong = container.querySelector('strong');
    expect(strong).not.toHaveClass('font-bold');
  });

  // ── mdS.lineThrough (textDecoration) ────────────────────────────────────────
  test('mdS.lineThrough → replace with underline (same textDecoration group)', () => {
    const { container } = render(
      <Md content="~~word~~" rendererTheme={{ mdS: { underline: true } }} />
    );
    const s = container.querySelector('s');
    expect(s).toHaveClass('underline');
    expect(s).not.toHaveClass('line-through');
  });

  test('mdS.lineThrough → replace with overline (same textDecoration group)', () => {
    const { container } = render(
      <Md content="~~word~~" rendererTheme={{ mdS: { overline: true } }} />
    );
    const s = container.querySelector('s');
    expect(s).toHaveClass('overline');
    expect(s).not.toHaveClass('line-through');
  });

  test('mdS.lineThrough → disable explicitly with lineThrough:false', () => {
    const { container } = render(
      <Md content="~~word~~" rendererTheme={{ mdS: { lineThrough: false } }} />
    );
    const s = container.querySelector('s');
    expect(s).not.toHaveClass('line-through');
  });

  // ── mdError.danger (appearance) ─────────────────────────────────────────────
  test('mdError.danger → replace with warning (appearance group)', () => {
    const content = '---\n: : : :\n  bad\n---\n\nbody';
    const malformedParser = (raw: string) => {
      void raw;
      throw new Error('test parse error');
    };
    const { container } = render(
      <Md
        content={content}
        parseFrontmatter={malformedParser}
        rendererTheme={{ mdError: { warning: true } }}
      />
    );
    const errorCard = Array.from(container.querySelectorAll('.vane-card')).find((el) =>
      el.textContent?.includes('Error:')
    );
    expect(errorCard).toHaveAttribute('data-appearance', 'warning');
  });

  test('mdError.danger renders by default', () => {
    const content = ['---', 'broken', '---', '', 'body'].join('\n');
    const malformedParser = (raw: string) => {
      void raw;
      throw new Error('test parse error');
    };
    const { container } = render(
      <Md content={content} parseFrontmatter={malformedParser} />
    );
    const errorCard = Array.from(container.querySelectorAll('.vane-card')).find((el) =>
      el.textContent?.includes('Error:')
    );
    expect(errorCard).toHaveAttribute('data-appearance', 'danger');
  });

  // ── mdTable.overflowAuto — wrapping Card around <table> ─────────────────────
  test('mdTable renders with overflowAuto by default', () => {
    const content = ['| a | b |', '|---|---|', '| 1 | 2 |'].join('\n');
    const { container } = render(<Md content={content} />);
    const tableCard = container.querySelector('table')?.parentElement;
    expect(tableCard).toHaveClass('overflow-auto');
  });

  test('mdTable.overflowAuto → replace with overflowVisible (overflow group)', () => {
    const content = ['| a | b |', '|---|---|', '| 1 | 2 |'].join('\n');
    const { container } = render(
      <Md content={content} rendererTheme={{ mdTable: { overflowVisible: true } }} />
    );
    const tableCard = container.querySelector('table')?.parentElement;
    expect(tableCard).toHaveClass('overflow-visible');
    expect(tableCard).not.toHaveClass('overflow-auto');
  });

  test('mdTable.shadow override applies to wrapping Card', () => {
    const content = ['| a |', '|---|', '| 1 |'].join('\n');
    const { container } = render(
      <Md content={content} rendererTheme={{ mdTable: { shadow: true } }} />
    );
    const tableCard = container.querySelector('table')?.parentElement;
    expect(tableCard).toHaveClass('shadow-(--shadow-base)');
  });
});

describe('Md instances — rendererTheme isolation', () => {
  test('two <Md> with different rendererTheme do not leak into each other', () => {
    const { container } = render(
      <>
        <div data-testid="instance-a">
          <Md
            content="text with `code` inside"
            rendererTheme={{ mdCode: { success: true } }}
          />
        </div>
        <div data-testid="instance-b">
          <Md
            content="text with `code` inside"
            rendererTheme={{ mdCode: { danger: true } }}
          />
        </div>
      </>
    );
    const a = container.querySelector('[data-testid="instance-a"] .font-mono[data-appearance]');
    const b = container.querySelector('[data-testid="instance-b"] .font-mono[data-appearance]');
    expect(a).toHaveAttribute('data-appearance', 'success');
    expect(b).toHaveAttribute('data-appearance', 'danger');
  });
});
