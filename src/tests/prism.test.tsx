import React from 'react';
import { render } from '@testing-library/react';
import { Md } from '../components/md';
import { prismHighlighter } from '../prism';
import { runWithTimeout } from './runWithTimeout';

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

  it('drops the line breaks at the end of the code and keeps the others', () => {
    const element = prismHighlighter()('a\n\nb\n\n\n', 'js') as React.ReactElement<{ code: string }>;
    expect(element.props.code).toBe('a\n\nb');
    const unchanged = prismHighlighter()('\n\na', 'js') as React.ReactElement<{ code: string }>;
    expect(unchanged.props.code).toBe('\n\na');
    const empty = prismHighlighter()('\n\n', 'js') as React.ReactElement<{ code: string }>;
    expect(empty.props.code).toBe('');
  });

  it('trims 80,000 blank lines before the last line in well under a second', () => {
    const code = `${'\n'.repeat(80000)}x\n`;
    const highlight = prismHighlighter();
    const start = performance.now();
    // Under a watchdog: a pattern that rescans the run from every line break takes seconds here.
    const element = runWithTimeout(() => highlight(code, 'text'), 1000) as React.ReactElement<{ code: string }>;
    expect(performance.now() - start).toBeLessThan(500);
    expect(element.props.code).toBe(code.slice(0, -1));
  });
});
