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
});
