import React from 'react';
import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';
import { Md } from '../../components/md';

describe('MdLink Component', () => {
  test('renders link with href and content', () => {
    const content = '[Link text](https://example.com)';
    render(<Md content={content} />);
    const link = screen.getByRole('link', { name: 'Link text' });
    expect(link).toBeInTheDocument();
    expect(link).toHaveAttribute('href', 'https://example.com');
    // VaneUI Link component classes
    expect(link).toHaveClass('hover:underline', 'w-fit');
    expect(link).toHaveClass('text-(--link-text)', 'font-sans', 'underline');
  });

  test('renders link with title attribute', () => {
    const content = '[Link text](https://example.com "Link title")';
    render(<Md content={content} />);
    const link = screen.getByRole('link');
    expect(link).toHaveAttribute('title', 'Link title');
    expect(link).toHaveTextContent('Link text');
  });

  test('renders multiple links in content', () => {
    const content = 'Visit [Google](https://google.com) or [GitHub](https://github.com)';
    render(<Md content={content} />);
    const links = screen.getAllByRole('link');
    expect(links).toHaveLength(2);
    expect(links[0]).toHaveAttribute('href', 'https://google.com');
    expect(links[1]).toHaveAttribute('href', 'https://github.com');
  });

  describe('font-size inheritance via VaneUI inheritSize default', () => {
    test('link inherits font-size via VaneUI inheritSize prop (no inline style)', () => {
      const content = '[Link text](https://example.com)';
      render(<Md content={content} />);
      const link = screen.getByRole('link');
      // VaneUI Link defaults to inheritSize: true — emits text-(length:--fs-em)
      expect(link).toHaveClass('text-(length:--fs-em)');
      expect(link).toHaveClass('leading-[inherit]');
      // No inline fontSize style (hack removed)
      expect(link).not.toHaveAttribute('style');
    });

    test('link inside a heading inherits font-size via class', () => {
      const content = '### Heading 3 with [link text](https://example.com)';
      const { container } = render(<Md content={content} />);
      const link = container.querySelector('h3 a');

      expect(link).toBeInTheDocument();
      expect(link).toHaveClass('text-(length:--fs-em)');
      expect(link).toHaveClass('leading-[inherit]');
      expect(link).toHaveAttribute('href', 'https://example.com');
      // Link keeps its own appearance (blue color) via data-appearance
      expect(link).toHaveAttribute('data-appearance', 'link');
    });

    test('link inside h1/h2/h3 all receive inheritSize class', () => {
      const content = [
        '# [h1 link](https://ex.com/1)',
        '## [h2 link](https://ex.com/2)',
        '### [h3 link](https://ex.com/3)',
      ].join('\n\n');
      const { container } = render(<Md content={content} />);
      for (const tag of ['h1', 'h2', 'h3']) {
        const link = container.querySelector(`${tag} a`);
        expect(link).toBeInTheDocument();
        expect(link).toHaveClass('text-(length:--fs-em)');
      }
    });
  });
});