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
  test('rendererTheme.code overrides inline code appearance', () => {
    const { container } = render(
      <Md
        content="text with `code` inline"
        rendererTheme={{ code: { primary: true } }}
      />
    );
    const codeEl = container.querySelector('.font-mono[data-appearance]');
    expect(codeEl).toHaveAttribute('data-appearance', 'primary');
  });

  test('rendererTheme.code success overrides default secondary', () => {
    const { container } = render(
      <Md
        content="text with `code` inline"
        rendererTheme={{ code: { success: true } }}
      />
    );
    const codeEl = container.querySelector('.font-mono[data-appearance]');
    expect(codeEl).toHaveAttribute('data-appearance', 'success');
  });

  test('rendererTheme.blockquote overrides Card appearance only — keeps left bar', () => {
    const { container } = render(
      <Md
        content="> quoted"
        rendererTheme={{ blockquote: { primary: true } }}
      />
    );
    const cardEl = container.querySelector('.border-l-\\[length\\:var\\(--bw\\)\\]');
    expect(cardEl).toHaveAttribute('data-appearance', 'primary');
  });

  test('rendererTheme.blockquote with border:true clears noBorder/borderL group', () => {
    const { container } = render(
      <Md
        content="> quoted"
        rendererTheme={{ blockquote: { border: true } }}
      />
    );
    // With border:true, the border group is reset → no borderL, full border instead
    expect(container.querySelector('.border-l-\\[length\\:var\\(--bw\\)\\]')).toBeNull();
    const card = container.querySelector('.vane-card');
    expect(card).toHaveClass('border-[length:var(--bw)]');
  });

  test('rendererTheme.em can replace italic with bold', () => {
    const { container } = render(
      <Md
        content="*emphasis*"
        rendererTheme={{ em: { italic: false, bold: true } }}
      />
    );
    const em = container.querySelector('em');
    expect(em).not.toHaveClass('italic');
    expect(em).toHaveClass('font-bold');
  });

  test('rendererTheme overrides do not affect siblings using the same VaneUI primitive', () => {
    // MdParagraph and MdEm both render <Text> — overriding .em must not affect paragraph
    const { container } = render(
      <Md
        content="paragraph with *em* inside"
        rendererTheme={{ em: { uppercase: true } }}
      />
    );
    const em = container.querySelector('em');
    expect(em).toHaveClass('uppercase');
    const p = container.querySelector('p');
    expect(p).not.toHaveClass('uppercase');
  });

  test('rendererTheme.fence affects code blocks but not blockquotes', () => {
    const content = '```\ncode\n```\n\n> quoted';
    const { container } = render(
      <Md
        content={content}
        rendererTheme={{ fence: { success: true } }}
      />
    );
    const fenceCard = container.querySelector('pre')?.closest('.vane-card');
    expect(fenceCard).toHaveAttribute('data-appearance', 'success');
    // Blockquote keeps its default secondary
    const blockquoteCard = container.querySelector('.border-l-\\[length\\:var\\(--bw\\)\\]');
    expect(blockquoteCard).toHaveAttribute('data-appearance', 'secondary');
  });
});

describe('rendererTheme — multiple renderer overrides at once', () => {
  test('overriding code and blockquote independently', () => {
    const content = ['Para with `code` inline.', '', '> quoted text'].join('\n');
    const { container } = render(
      <Md
        content={content}
        rendererTheme={{
          code: { success: true },
          blockquote: { danger: true },
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
      code: { uppercase: true },
    });
    expect(merged.code).toEqual({ secondary: true, uppercase: true });
  });

  test('clears appearance group from defaults when user sets any appearance key', () => {
    const merged = mergeRendererTheme(defaultRendererTheme, {
      blockquote: { primary: true },
    });
    expect(merged.blockquote).toEqual({
      primary: true,
      noBorder: true,
      borderL: true,
    });
    expect((merged.blockquote as Record<string, unknown>).secondary).toBeUndefined();
  });

  test('clears border group from defaults when user sets border:true', () => {
    const merged = mergeRendererTheme(defaultRendererTheme, {
      blockquote: { border: true },
    });
    const bq = merged.blockquote as Record<string, unknown>;
    expect(bq.border).toBe(true);
    expect(bq.borderL).toBeUndefined();
    expect(bq.noBorder).toBeUndefined();
    // Appearance untouched
    expect(bq.secondary).toBe(true);
  });

  test('handles undefined user theme gracefully', () => {
    const merged = mergeRendererTheme(defaultRendererTheme, undefined);
    expect(merged).toEqual(defaultRendererTheme);
  });

  test('adds new slots not present in defaults', () => {
    const userTheme: MdRendererTheme = {
      heading: { mono: true, uppercase: true },
    };
    const merged = mergeRendererTheme(defaultRendererTheme, userTheme);
    expect(merged.heading).toEqual({ mono: true, uppercase: true });
    // Existing defaults preserved
    expect(merged.blockquote).toEqual(defaultRendererTheme.blockquote);
  });

  test('multiple group conflicts in the same slot are all handled', () => {
    const merged = mergeRendererTheme(defaultRendererTheme, {
      blockquote: { primary: true, border: true },
    });
    const bq = merged.blockquote as Record<string, unknown>;
    expect(bq.primary).toBe(true);
    expect(bq.border).toBe(true);
    expect(bq.secondary).toBeUndefined();
    expect(bq.noBorder).toBeUndefined();
    expect(bq.borderL).toBeUndefined();
  });
});

describe('mergeRendererTheme — group-aware merge for size/variant/shape', () => {
  test('size group: user sets lg, defaults\' xs is dropped', () => {
    const defaults: MdRendererTheme = { code: { xs: true, secondary: true } };
    const merged = mergeRendererTheme(defaults, { code: { lg: true } });
    const c = merged.code as Record<string, unknown>;
    expect(c.lg).toBe(true);
    expect(c.xs).toBeUndefined();
    expect(c.secondary).toBe(true);
  });

  test('variant group: user sets filled, defaults\' outline is dropped', () => {
    const defaults: MdRendererTheme = { blockquote: { outline: true, secondary: true } };
    const merged = mergeRendererTheme(defaults, { blockquote: { filled: true } });
    const b = merged.blockquote as Record<string, unknown>;
    expect(b.filled).toBe(true);
    expect(b.outline).toBeUndefined();
    expect(b.secondary).toBe(true);
  });

  test('shape group: user sets pill, defaults\' rounded is dropped', () => {
    const defaults: MdRendererTheme = { code: { rounded: true, secondary: true } };
    const merged = mergeRendererTheme(defaults, { code: { pill: true } });
    const c = merged.code as Record<string, unknown>;
    expect(c.pill).toBe(true);
    expect(c.rounded).toBeUndefined();
    expect(c.secondary).toBe(true);
  });

  test('user setting falsy in a group does NOT trigger group-clearing', () => {
    // Only truthy values in a group trigger the cleanup; explicit false is preserved.
    const defaults: MdRendererTheme = { code: { secondary: true } };
    const merged = mergeRendererTheme(defaults, { code: { primary: false } });
    const c = merged.code as Record<string, unknown>;
    expect(c.primary).toBe(false);
    expect(c.secondary).toBe(true);
  });
});

describe('per-renderer override coverage — every plumbed renderer reads its slot', () => {
  test('paragraph slot — applies to <Text tag="p">', () => {
    const { container } = render(
      <Md content="some paragraph" rendererTheme={{ paragraph: { uppercase: true } }} />
    );
    const p = container.querySelector('p');
    expect(p).toHaveClass('uppercase');
  });

  test('text slot — applies when MdText is explicitly mapped to a node', () => {
    // MdText is not invoked by default Markdoc rendering (plain inline text is
    // emitted as string text nodes). Map it explicitly via config.nodes.text
    // so the renderer is reached, then verify the slot flows through.
    const { container } = render(
      <Md
        content="hello"
        rendererTheme={{ text: { italic: true } }}
        config={{ nodes: { text: { render: 'MdText' } } }}
      />
    );
    const span = container.querySelector('span');
    expect(span).toHaveClass('italic');
  });

  test('heading slot — applies alongside dynamic level→size mapping', () => {
    const { container } = render(
      <Md content="# Big" rendererTheme={{ heading: { mono: true } }} />
    );
    const h1 = container.querySelector('h1');
    expect(h1).toHaveClass('font-mono');
    // Dynamic size mapping for h1 → xl is preserved (data-size attribute)
    expect(h1).toHaveAttribute('data-size', 'xl');
  });

  test('link slot — applies to MdLink', () => {
    const { container } = render(
      <Md
        content="[click](https://example.com)"
        rendererTheme={{ link: { uppercase: true } }}
      />
    );
    const a = container.querySelector('a');
    expect(a).toHaveClass('uppercase');
    expect(a).toHaveAttribute('href', 'https://example.com');
  });

  test('list slot — applies alongside dynamic decimal/disc', () => {
    const content = ['- one', '- two'].join('\n');
    const { container } = render(
      <Md content={content} rendererTheme={{ list: { uppercase: true } }} />
    );
    const ul = container.querySelector('ul');
    expect(ul).toHaveClass('uppercase');
    expect(ul).toHaveClass('list-disc');
  });

  test('item slot — applies to list items', () => {
    const content = ['- one', '- two'].join('\n');
    const { container } = render(
      <Md content={content} rendererTheme={{ item: { bold: true } }} />
    );
    const li = container.querySelector('li');
    expect(li).toHaveClass('font-bold');
  });

  test('hr slot — applies to MdHr divider', () => {
    const content = ['text', '', '---', '', 'more'].join('\n');
    const { container } = render(
      <Md content={content} rendererTheme={{ hr: { lg: true } }} />
    );
    const hr = container.querySelector('[role="separator"]');
    expect(hr).toHaveAttribute('data-size', 'lg');
  });

  test('image slot — applies to MdImage', () => {
    const { container } = render(
      <Md
        content="![alt](https://example.com/x.png)"
        rendererTheme={{ image: { pill: true } }}
      />
    );
    const img = container.querySelector('img');
    expect(img).toHaveClass('rounded-full');
  });

  test('document slot — applies to top-level Col wrapper', () => {
    const { container } = render(
      <Md content="just text" rendererTheme={{ document: { itemsCenter: true } }} />
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
          code: { primary: true },
        }}
      >
        <Md content="text with `code` here" />
      </RendererThemeContext.Provider>
    );
    const codeEl = container.querySelector('.font-mono[data-appearance]');
    expect(codeEl).toHaveAttribute('data-appearance', 'primary');
  });

  test('the rendererTheme prop wins over an outer RendererThemeContext.Provider', () => {
    // The Md component re-provides the merged context internally, so prop trumps outer.
    const { container } = render(
      <RendererThemeContext.Provider
        value={{ ...defaultRendererTheme, code: { primary: true } }}
      >
        <Md
          content="text with `code` here"
          rendererTheme={{ code: { success: true } }}
        />
      </RendererThemeContext.Provider>
    );
    const codeEl = container.querySelector('.font-mono[data-appearance]');
    expect(codeEl).toHaveAttribute('data-appearance', 'success');
  });
});

describe('Override every default in defaultRendererTheme — exhaustive', () => {
  // For each entry in defaultRendererTheme, prove the consumer can both
  // (a) replace the prop with a sibling in the same mutually-exclusive group, and
  // (b) explicitly disable the default by setting it to false.

  // ── blockquote.secondary (appearance) ───────────────────────────────────────
  test('blockquote.secondary → replace with success', () => {
    const { container } = render(
      <Md content="> q" rendererTheme={{ blockquote: { success: true } }} />
    );
    const card = container.querySelector('.border-l-\\[length\\:var\\(--bw\\)\\]');
    expect(card).toHaveAttribute('data-appearance', 'success');
  });

  test('blockquote.secondary → replace with inherit (vaneui omits data-appearance for inherit)', () => {
    const { container } = render(
      <Md content="> q" rendererTheme={{ blockquote: { inherit: true } }} />
    );
    const card = container.querySelector('.border-l-\\[length\\:var\\(--bw\\)\\]');
    expect(card).toBeTruthy();
    // `inherit` means "no color override" — vaneui does NOT emit data-appearance.
    // The override is proven by the absence of data-appearance="secondary".
    expect(card).not.toHaveAttribute('data-appearance', 'secondary');
  });

  // ── blockquote.noBorder + borderL (border) ──────────────────────────────────
  test('blockquote.noBorder/borderL → replace with full border', () => {
    const { container } = render(
      <Md content="> q" rendererTheme={{ blockquote: { border: true } }} />
    );
    const card = container.querySelector('.vane-card');
    expect(card).toHaveClass('border-[length:var(--bw)]');
    expect(card).not.toHaveClass('border-l-[length:var(--bw)]');
  });

  test('blockquote.borderL → replace with borderR (different side, same group)', () => {
    const { container } = render(
      <Md content="> q" rendererTheme={{ blockquote: { borderR: true } }} />
    );
    const card = container.querySelector('.vane-card');
    expect(card).toHaveClass('border-r-[length:var(--bw)]');
    expect(card).not.toHaveClass('border-l-[length:var(--bw)]');
  });

  // ── code.secondary (appearance) ─────────────────────────────────────────────
  test('code.secondary → replace with primary', () => {
    const { container } = render(
      <Md content="`x`" rendererTheme={{ code: { primary: true } }} />
    );
    const code = container.querySelector('.font-mono[data-appearance]');
    expect(code).toHaveAttribute('data-appearance', 'primary');
  });

  test('code.secondary → replace with inherit (vaneui omits data-appearance for inherit)', () => {
    const { container } = render(
      <Md content="`x`" rendererTheme={{ code: { inherit: true } }} />
    );
    // With `inherit` set, the secondary default is dropped via the appearance
    // group merge. vaneui doesn't emit data-appearance for inherit, so the
    // override is proven by the absence of data-appearance="secondary".
    const codeWithSecondary = container.querySelector('.font-mono[data-appearance="secondary"]');
    expect(codeWithSecondary).toBeNull();
    expect(container.querySelector('.font-mono')).toBeTruthy();
  });

  // ── em.italic (fontStyle) ───────────────────────────────────────────────────
  test('em.italic → replace with notItalic (same fontStyle group)', () => {
    const { container } = render(
      <Md content="*emph*" rendererTheme={{ em: { notItalic: true } }} />
    );
    const em = container.querySelector('em');
    expect(em).toHaveClass('not-italic');
    expect(em).not.toHaveClass('italic');
  });

  test('em.italic → disable explicitly with italic:false', () => {
    const { container } = render(
      <Md content="*emph*" rendererTheme={{ em: { italic: false } }} />
    );
    const em = container.querySelector('em');
    expect(em).not.toHaveClass('italic');
  });

  // ── strong.bold (fontWeight) ────────────────────────────────────────────────
  test('strong.bold → replace with light (same fontWeight group)', () => {
    const { container } = render(
      <Md content="**word**" rendererTheme={{ strong: { light: true } }} />
    );
    const strong = container.querySelector('strong');
    expect(strong).toHaveClass('font-light');
    expect(strong).not.toHaveClass('font-bold');
  });

  test('strong.bold → replace with semibold (same fontWeight group)', () => {
    const { container } = render(
      <Md content="**word**" rendererTheme={{ strong: { semibold: true } }} />
    );
    const strong = container.querySelector('strong');
    expect(strong).toHaveClass('font-semibold');
    expect(strong).not.toHaveClass('font-bold');
  });

  test('strong.bold → disable explicitly with bold:false', () => {
    const { container } = render(
      <Md content="**word**" rendererTheme={{ strong: { bold: false } }} />
    );
    const strong = container.querySelector('strong');
    expect(strong).not.toHaveClass('font-bold');
  });

  // ── s.lineThrough (textDecoration) ──────────────────────────────────────────
  test('s.lineThrough → replace with underline (same textDecoration group)', () => {
    const { container } = render(
      <Md content="~~word~~" rendererTheme={{ s: { underline: true } }} />
    );
    const s = container.querySelector('s');
    expect(s).toHaveClass('underline');
    expect(s).not.toHaveClass('line-through');
  });

  test('s.lineThrough → replace with overline (same textDecoration group)', () => {
    const { container } = render(
      <Md content="~~word~~" rendererTheme={{ s: { overline: true } }} />
    );
    const s = container.querySelector('s');
    expect(s).toHaveClass('overline');
    expect(s).not.toHaveClass('line-through');
  });

  test('s.lineThrough → disable explicitly with lineThrough:false', () => {
    const { container } = render(
      <Md content="~~word~~" rendererTheme={{ s: { lineThrough: false } }} />
    );
    const s = container.querySelector('s');
    expect(s).not.toHaveClass('line-through');
  });

  // ── error.danger (appearance) — MdError is invoked via Md when frontmatter parsing fails
  test('error.danger → replace with warning (appearance group)', () => {
    // Trigger MdError by passing malformed YAML to parseFrontmatter
    const content = '---\n: : : :\n  bad\n---\n\nbody';
    const malformedParser = (raw: string) => {
      void raw;
      throw new Error('test parse error');
    };
    const { container } = render(
      <Md
        content={content}
        parseFrontmatter={malformedParser}
        rendererTheme={{ error: { warning: true } }}
      />
    );
    // The error Card is the one that contains "Error:" text
    const errorCard = Array.from(container.querySelectorAll('.vane-card')).find((el) =>
      el.textContent?.includes('Error:')
    );
    expect(errorCard).toHaveAttribute('data-appearance', 'warning');
  });

  test('error.danger renders by default', () => {
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

  // ── table.overflowAuto — wrapping Card around <table>
  test('table renders with overflowAuto by default', () => {
    const content = ['| a | b |', '|---|---|', '| 1 | 2 |'].join('\n');
    const { container } = render(<Md content={content} />);
    const tableCard = container.querySelector('table')?.parentElement;
    expect(tableCard).toHaveClass('overflow-auto');
  });

  test('table.overflowAuto → replace with overflowVisible (overflow group)', () => {
    const content = ['| a | b |', '|---|---|', '| 1 | 2 |'].join('\n');
    const { container } = render(
      <Md content={content} rendererTheme={{ table: { overflowVisible: true } }} />
    );
    const tableCard = container.querySelector('table')?.parentElement;
    expect(tableCard).toHaveClass('overflow-visible');
    expect(tableCard).not.toHaveClass('overflow-auto');
  });

  test('table.shadow override applies to wrapping Card', () => {
    const content = ['| a |', '|---|', '| 1 |'].join('\n');
    const { container } = render(
      <Md content={content} rendererTheme={{ table: { shadow: true } }} />
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
            rendererTheme={{ code: { success: true } }}
          />
        </div>
        <div data-testid="instance-b">
          <Md
            content="text with `code` inside"
            rendererTheme={{ code: { danger: true } }}
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
