import React from 'react';
import { render, screen } from '@testing-library/react';
import { Md } from '../components/md';
import { parseYamlFrontmatter } from '../yaml';
import type { HighlightFn } from '../context';

const fakeHighlight: HighlightFn = (code, language) => (
  <div data-testid="hl" data-lang={language ?? ''}>{code}</div>
);

describe('highlight hook', () => {
  it('renders code fences through the highlight hook when provided', () => {
    const md = ['```ts', 'const x = 1;', '```'].join('\n');
    render(<Md content={md} highlight={fakeHighlight} />);
    const hl = screen.getByTestId('hl');
    expect(hl).toHaveAttribute('data-lang', 'ts');
    expect(hl.textContent).toContain('const x = 1;');
  });

  it('falls back to a plain <pre> when no hook is provided', () => {
    const md = ['```ts', 'const x = 1;', '```'].join('\n');
    const { container } = render(<Md content={md} />);
    expect(screen.queryByTestId('hl')).toBeNull();
    expect(container.querySelector('pre')).toBeInTheDocument();
  });

  it('does not route vaneui fences through the highlight hook', () => {
    const md = ['```vaneui', 'Text: Hi', '```'].join('\n');
    render(
      <Md
        content={md}
        highlight={fakeHighlight}
        parseFrontmatter={parseYamlFrontmatter}
        components={{ Text: ({ children }: any) => <p data-testid="vaneui-text">{children}</p> }}
      />,
    );
    expect(screen.queryByTestId('hl')).toBeNull();
    expect(screen.getByTestId('vaneui-text')).toHaveTextContent('Hi');
  });

  it('lets a config.components.MdFence override win over the hook', () => {
    const md = ['```ts', 'x', '```'].join('\n');
    const CustomFence = ({ content }: any) => <div data-testid="custom-fence">{content}</div>;
    render(
      <Md content={md} highlight={fakeHighlight} config={{ components: { MdFence: CustomFence } }} />,
    );
    expect(screen.queryByTestId('hl')).toBeNull();
    expect(screen.getByTestId('custom-fence')).toHaveTextContent('x');
  });
});
