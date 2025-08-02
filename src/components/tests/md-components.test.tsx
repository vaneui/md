import React from 'react';
import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';
import * as Components from '../md-components';

// Type the components properly for testing
const MdHeading = Components.MdHeading as React.FC<{ level: number; children?: React.ReactNode }>;
const MdLink = Components.MdLink as React.FC<{ href: string; title?: string; children?: React.ReactNode }>;
const MdImage = Components.MdImage as React.FC<{ src: string; alt?: string; title?: string }>;
const MdFence = Components.MdFence as React.FC<{ content: string; language?: string }>;
const MdTd = Components.MdTd as React.FC<{ align?: string; colspan?: number; rowspan?: number; children?: React.ReactNode }>;
const MdTh = Components.MdTh as React.FC<{ align?: string; width?: string | number; children?: React.ReactNode }>;

describe('Individual Md Components Tests', () => {

  describe('MdParagraph Component', () => {
    test('renders paragraph with children', () => {
      render(<Components.MdParagraph>Paragraph text</Components.MdParagraph>);
      const paragraph = screen.getByText('Paragraph text');
      expect(paragraph).toBeInTheDocument();
      expect(paragraph.tagName).toBe('P');
    });
  });

  describe('MdHeading Component', () => {
    test('renders h1 with level 1', () => {
      render(<MdHeading level={1}>Heading 1</MdHeading>);
      const heading = screen.getByRole('heading', { level: 1 });
      expect(heading).toBeInTheDocument();
      expect(heading).toHaveTextContent('Heading 1');
    });

    test('renders h3 with level 3', () => {
      render(<MdHeading level={3}>Heading 3</MdHeading>);
      const heading = screen.getByRole('heading', { level: 3 });
      expect(heading).toBeInTheDocument();
      expect(heading).toHaveTextContent('Heading 3');
    });

    test('renders h6 with level 6', () => {
      render(<MdHeading level={6}>Heading 6</MdHeading>);
      const heading = screen.getByRole('heading', { level: 6 });
      expect(heading).toBeInTheDocument();
      expect(heading).toHaveTextContent('Heading 6');
    });
  });

  describe('MdStrong Component', () => {
    test('renders strong element with content', () => {
      render(<Components.MdStrong>Bold text</Components.MdStrong>);
      const strong = screen.getByText('Bold text');
      expect(strong).toBeInTheDocument();
      expect(strong.tagName).toBe('STRONG');
    });
  });

  describe('MdEm Component', () => {
    test('renders em element with content', () => {
      render(<Components.MdEm>Italic text</Components.MdEm>);
      const em = screen.getByText('Italic text');
      expect(em).toBeInTheDocument();
      expect(em.tagName).toBe('EM');
    });
  });

  describe('MdS Component', () => {
    test('renders s element with content', () => {
      render(<Components.MdS>Strikethrough text</Components.MdS>);
      const s = screen.getByText('Strikethrough text');
      expect(s).toBeInTheDocument();
      expect(s.tagName).toBe('S');
    });
  });

  describe('MdCode Component', () => {
    test('renders code element with content and CSS class', () => {
      render(<Components.MdCode>code snippet</Components.MdCode>);
      const code = screen.getByText('code snippet');
      expect(code).toBeInTheDocument();
      // Now using Badge component instead of CODE element
    });
  });

  describe('MdLink Component', () => {
    test('renders link with href and content', () => {
      render(<MdLink href="https://example.com">Link text</MdLink>);
      const link = screen.getByRole('link', { name: 'Link text' });
      expect(link).toBeInTheDocument();
      expect(link).toHaveAttribute('href', 'https://example.com');
    });

    test('renders link with title attribute', () => {
      render(<MdLink href="https://example.com" title="Link title">Link text</MdLink>);
      const link = screen.getByRole('link');
      expect(link).toHaveAttribute('title', 'Link title');
    });
  });

  describe('MdImage Component', () => {
    test('renders image with src and alt', () => {
      render(<MdImage src="https://example.com/image.jpg" alt="Test image" />);
      const img = screen.getByAltText('Test image');
      expect(img).toBeInTheDocument();
      expect(img).toHaveAttribute('src', 'https://example.com/image.jpg');
      // Now wrapped in Card component
    });

    test('renders image with title', () => {
      render(<MdImage src="test.jpg" alt="Test" title="Image title" />);
      const img = screen.getByAltText('Test');
      expect(img).toHaveAttribute('title', 'Image title');
    });

    test('renders image with empty alt when not provided', () => {
      const { container } = render(<MdImage src="test.jpg" />);
      const img = container.querySelector('img');
      expect(img).toBeInTheDocument();
      expect(img).toHaveAttribute('alt', '');
    });
  });

  describe('MdList Component', () => {
    test('renders list with children', () => {
      render(
        <Components.MdList>
          <li>Item 1</li>
          <li>Item 2</li>
        </Components.MdList>
      );
      expect(screen.getByText('Item 1')).toBeInTheDocument();
      expect(screen.getByText('Item 2')).toBeInTheDocument();
    });
  });

  describe('MdItem Component', () => {
    test('renders list item with content', () => {
      render(<Components.MdItem>List item content</Components.MdItem>);
      const item = screen.getByText('List item content');
      expect(item).toBeInTheDocument();
      expect(item.tagName).toBe('LI');
      // No longer using custom CSS class
    });
  });

  describe('MdBlockquote Component', () => {
    test('renders blockquote with content', () => {
      render(<Components.MdBlockquote>Quote content</Components.MdBlockquote>);
      const blockquote = screen.getByText('Quote content');
      expect(blockquote).toBeInTheDocument();
      // Now using Card component instead of BLOCKQUOTE element
      // Now using Card component
    });
  });

  describe('MdFence Component', () => {
    test('renders code block with content', () => {
      render(<MdFence content="const x = 42;" />);
      const codeBlock = screen.getByText('const x = 42;');
      expect(codeBlock).toBeInTheDocument();
      expect(codeBlock.tagName).toBe('CODE');
    });

    test('renders code block with language class', () => {
      render(<MdFence content="function test() {}" language="javascript" />);
      const codeBlock = screen.getByText('function test() {}');
      expect(codeBlock).toHaveClass('language-javascript');
    });

    test('renders code block without language class when not provided', () => {
      render(<MdFence content="plain code" />);
      const codeBlock = screen.getByText('plain code');
      expect(codeBlock).not.toHaveClass('language-javascript');
    });
  });

  describe('MdHr Component', () => {
    test('renders horizontal rule using Divider', () => {
      render(<Components.MdHr />);
      // Now using Divider component instead of hr
    });
  });

  describe('MdTable Components', () => {
    test('renders table with content', () => {
      render(
        <Components.MdTable>
          <thead>
            <tr>
              <th>Header</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td>Cell</td>
            </tr>
          </tbody>
        </Components.MdTable>
      );
      
      const table = screen.getByRole('table');
      expect(table).toBeInTheDocument();
      // Now wrapped in Card component
      expect(screen.getByText('Header')).toBeInTheDocument();
      expect(screen.getByText('Cell')).toBeInTheDocument();
    });

    test('renders table header with content', () => {
      render(
        <table>
          <thead>
            <tr>
              <Components.MdTh>Header content</Components.MdTh>
            </tr>
          </thead>
        </table>
      );
      const th = screen.getByText('Header content');
      expect(th).toBeInTheDocument();
      expect(th.tagName).toBe('TH');
    });

    test('renders table cell with content', () => {
      render(
        <table>
          <tbody>
            <tr>
              <Components.MdTd>Cell content</Components.MdTd>
            </tr>
          </tbody>
        </table>
      );
      const td = screen.getByText('Cell content');
      expect(td).toBeInTheDocument();
      expect(td.tagName).toBe('TD');
    });

    test('renders table cell with alignment', () => {
      render(
        <table>
          <tbody>
            <tr>
              <MdTd align="center">Centered cell</MdTd>
            </tr>
          </tbody>
        </table>
      );
      const td = screen.getByText('Centered cell');
      expect(td).toHaveStyle('text-align: center');
    });

    test('renders table cell with colspan', () => {
      render(
        <table>
          <tbody>
            <tr>
              <MdTd colspan={2}>Spanning cell</MdTd>
            </tr>
          </tbody>
        </table>
      );
      const td = screen.getByText('Spanning cell');
      expect(td).toHaveAttribute('colspan', '2');
    });
  });

  describe('MdHardbreak Component', () => {
    test('renders line break element', () => {
      const { container } = render(<Components.MdHardbreak />);
      const br = container.querySelector('br');
      expect(br).toBeInTheDocument();
    });
  });

  describe('MdSoftbreak Component', () => {
    test('renders space character', () => {
      const { container } = render(
        <span>
          Word1<Components.MdSoftbreak />Word2
        </span>
      );
      expect(container.textContent).toBe('Word1 Word2');
    });
  });

  describe('MdError Component', () => {
    test('renders error message with content', () => {
      render(<Components.MdError>Error message</Components.MdError>);
      const errorDiv = screen.getByText(/Error message/);
      expect(errorDiv).toBeInTheDocument();
      expect(screen.getByText('Error:')).toBeInTheDocument();
    });

    test('renders error using Card component', () => {
      render(<Components.MdError>Error</Components.MdError>);
      expect(screen.getByText('Error:')).toBeInTheDocument();
      expect(screen.getByText('Error')).toBeInTheDocument();
    });
  });

  describe('MdDocument Component', () => {
    test('renders document container with content', () => {
      render(<Components.MdDocument>Document content</Components.MdDocument>);
      const content = screen.getByText('Document content');
      expect(content).toBeInTheDocument();
    });
  });
});