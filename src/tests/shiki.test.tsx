import React from 'react';
import { render } from '@testing-library/react';

// shiki v4 is ESM-only; mock its sync core + engine so this test exercises the
// wrapper logic (loaded-language routing, dangerouslySetInnerHTML output,
// unknown-language fallback) without loading the real ESM package under jest.
jest.mock('shiki/engine/javascript', () => ({
  createJavaScriptRegexEngine: () => ({}),
}));
jest.mock('shiki/core', () => ({
  createHighlighterCoreSync: () => ({
    getLoadedThemes: () => ['mock-theme'],
    getLoadedLanguages: () => ['ts'],
    codeToHtml: (code: string) => `<pre class="shiki"><code>${code}</code></pre>`,
  }),
}));

import { Md } from '../components/md';
import { shikiHighlighter } from '../shiki';
import { runWithTimeout } from './runWithTimeout';

const hl = shikiHighlighter({ langs: [], themes: [], theme: 'mock-theme' });

describe('shikiHighlighter (mocked engine)', () => {
  it('renders codeToHtml output for a loaded language', () => {
    const md = ['```ts', 'const x = 1;', '```'].join('\n');
    const { container } = render(<Md content={md} highlight={hl} />);
    expect(container.querySelector('.vaneui-md-shiki')).toBeInTheDocument();
    expect(container.querySelector('pre.shiki')).toBeInTheDocument();
    expect(container.textContent).toContain('const x = 1;');
  });

  it('falls back to a plain <pre> for an unloaded language', () => {
    const md = ['```rust', 'fn main() {}', '```'].join('\n');
    const { container } = render(<Md content={md} highlight={hl} />);
    expect(container.querySelector('.vaneui-md-shiki')).toBeNull();
    expect(container.querySelector('pre')).toBeInTheDocument();
    expect(container.textContent).toContain('fn main() {}');
  });

  it('drops the line breaks at the end of the code and keeps the others', () => {
    const md = ['```ts', '', 'a', '', 'b', '', '', '```'].join('\n');
    const { container } = render(<Md content={md} highlight={hl} />);
    expect(container.querySelector('pre.shiki code')?.textContent).toBe('\na\n\nb');
  });

  it('trims 80,000 blank lines before the last line in well under a second', () => {
    const code = `${'\n'.repeat(80000)}x\n`;
    for (const language of ['ts', 'rust']) {
      const start = performance.now();
      // Under a watchdog: a pattern that rescans the run from every line break takes seconds here.
      const element = runWithTimeout(() => hl(code, language), 1000);
      expect(performance.now() - start).toBeLessThan(500);
      expect(render(<>{element}</>).container.textContent).toBe(code.slice(0, -1));
    }
  });
});
