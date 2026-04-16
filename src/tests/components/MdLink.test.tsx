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

  describe('font-size inheritance', () => {
    test('link has inline fontSize:inherit style so it cascades from parent', () => {
      const content = '[Link text](https://example.com)';
      render(<Md content={content} />);
      const link = screen.getByRole('link');
      // MdLink applies fontSize:inherit + lineHeight:inherit so the anchor
      // picks up its parent typography's font-size (e.g., heading size).
      expect(link).toHaveStyle({ fontSize: 'inherit', lineHeight: 'inherit' });
    });

    test('link inside a heading inherits font-size from the heading', () => {
      const content = '### Heading 3 with [link text](https://example.com)';
      const { container } = render(<Md content={content} />);
      const heading = container.querySelector('h3');
      const link = container.querySelector('h3 a');

      expect(heading).toBeInTheDocument();
      expect(link).toBeInTheDocument();
      // Inline style forces the link to inherit font-size from the <h3>.
      // The heading itself emits the responsive --fs-desktop size — via
      // CSS cascade, the link's computed font-size resolves to the
      // heading's computed font-size.
      expect(link).toHaveStyle({ fontSize: 'inherit', lineHeight: 'inherit' });
      expect(link).toHaveAttribute('href', 'https://example.com');
      expect(link).toHaveTextContent('link text');
    });

    test('link inside h1/h2/h3 all receive the inherit style', () => {
      const content = [
        '# [h1 link](https://ex.com/1)',
        '## [h2 link](https://ex.com/2)',
        '### [h3 link](https://ex.com/3)',
      ].join('\n\n');
      const { container } = render(<Md content={content} />);
      const h1Link = container.querySelector('h1 a');
      const h2Link = container.querySelector('h2 a');
      const h3Link = container.querySelector('h3 a');

      for (const link of [h1Link, h2Link, h3Link]) {
        expect(link).toBeInTheDocument();
        expect(link).toHaveStyle({ fontSize: 'inherit' });
      }
    });

    test('user-provided style merges with the inherit defaults', () => {
      // MdLink is normally invoked by Markdoc, but we verify the component
      // directly allows callers (or custom config) to extend the style while
      // keeping the font-size inheritance.
      const MdLinkModule = require('../../components/links/MdLink');
      const { container } = render(
        <MdLinkModule.MdLink href="/x" style={{ textDecorationThickness: '2px' }}>
          custom
        </MdLinkModule.MdLink>
      );
      const link = container.querySelector('a');
      // Both the built-in inherit defaults and the user style are present
      expect(link).toHaveStyle({
        fontSize: 'inherit',
        lineHeight: 'inherit',
        textDecorationThickness: '2px',
      });
    });
  });
});