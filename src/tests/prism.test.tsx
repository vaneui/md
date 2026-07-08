import React from 'react';
import { render } from '@testing-library/react';
import { Md } from '../components/md';
import { prismHighlighter } from '../prism';

describe('prismHighlighter', () => {
  it('renders token spans for a known language', () => {
    const md = ['```tsx', 'const x = 1;', '```'].join('\n');
    const { container } = render(<Md content={md} highlight={prismHighlighter()} />);
    const pre = container.querySelector('pre');
    expect(pre).toBeInTheDocument();
    // prism-react-renderer splits code into per-token <span>s.
    expect(container.querySelectorAll('span').length).toBeGreaterThan(0);
    expect(pre?.textContent).toContain('const x = 1;');
  });

  it('still renders the code text for an unknown language', () => {
    const md = ['```', 'just plain text', '```'].join('\n');
    const { container } = render(<Md content={md} highlight={prismHighlighter()} />);
    expect(container.textContent).toContain('just plain text');
  });
});
