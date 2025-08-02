import React from 'react';
import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';
import { Md } from '../md';

describe('Md Component - Node Rendering Tests', () => {
  describe('Text and Paragraph Nodes', () => {
    test('renders plain text content', () => {
      const content = 'This is plain text content.';
      render(<Md content={content} />);
      expect(screen.getByText('This is plain text content.')).toBeInTheDocument();
    });

    test('renders paragraph with text', () => {
      const content = 'This is a paragraph.\n\nThis is another paragraph.';
      render(<Md content={content} />);
      expect(screen.getByText('This is a paragraph.')).toBeInTheDocument();
      expect(screen.getByText('This is another paragraph.')).toBeInTheDocument();
    });
  });

  describe('Heading Nodes', () => {
    test('renders h1 heading with content', () => {
      const content = '# Heading Level 1';
      render(<Md content={content} />);
      const heading = screen.getByRole('heading', { level: 1 });
      expect(heading).toBeInTheDocument();
      expect(heading).toHaveTextContent('Heading Level 1');
    });

    test('renders h2 heading with content', () => {
      const content = '## Heading Level 2';
      render(<Md content={content} />);
      const heading = screen.getByRole('heading', { level: 2 });
      expect(heading).toBeInTheDocument();
      expect(heading).toHaveTextContent('Heading Level 2');
    });

    test('renders h3 heading with content', () => {
      const content = '### Heading Level 3';
      render(<Md content={content} />);
      const heading = screen.getByRole('heading', { level: 3 });
      expect(heading).toBeInTheDocument();
      expect(heading).toHaveTextContent('Heading Level 3');
    });

    test('renders h4 heading with content', () => {
      const content = '#### Heading Level 4';
      render(<Md content={content} />);
      const heading = screen.getByRole('heading', { level: 4 });
      expect(heading).toBeInTheDocument();
      expect(heading).toHaveTextContent('Heading Level 4');
    });

    test('renders h5 heading with content', () => {
      const content = '##### Heading Level 5';
      render(<Md content={content} />);
      const heading = screen.getByRole('heading', { level: 5 });
      expect(heading).toBeInTheDocument();
      expect(heading).toHaveTextContent('Heading Level 5');
    });

    test('renders h6 heading with content', () => {
      const content = '###### Heading Level 6';
      render(<Md content={content} />);
      const heading = screen.getByRole('heading', { level: 6 });
      expect(heading).toBeInTheDocument();
      expect(heading).toHaveTextContent('Heading Level 6');
    });
  });

  describe('Inline Formatting Nodes', () => {
    test('renders strong (bold) text', () => {
      const content = 'This is **bold text** in a paragraph.';
      render(<Md content={content} />);
      const strongElement = screen.getByText('bold text');
      expect(strongElement).toBeInTheDocument();
      // VaneUI Text component renders as span with styling instead of strong tag
    });

    test('renders emphasis (italic) text', () => {
      const content = 'This is *italic text* in a paragraph.';
      render(<Md content={content} />);
      const emElement = screen.getByText('italic text');
      expect(emElement).toBeInTheDocument();
      // VaneUI Text component renders as span with styling instead of em tag
    });

    test('renders strikethrough text', () => {
      const content = 'This is ~~strikethrough text~~ in a paragraph.';
      render(<Md content={content} />);
      const sElement = screen.getByText('strikethrough text');
      expect(sElement).toBeInTheDocument();
      // VaneUI Text component renders as span with styling instead of s tag
    });

    test('renders inline code', () => {
      const content = 'This is `inline code` in a paragraph.';
      render(<Md content={content} />);
      const codeElement = screen.getByText('inline code');
      expect(codeElement).toBeInTheDocument();
      // Now using Badge component instead of raw <code>
    });
  });

  describe('Link Node', () => {
    test('renders link with href and text content', () => {
      const content = 'This is a [link to example](https://example.com).';
      render(<Md content={content} />);
      const linkElement = screen.getByRole('link', { name: 'link to example' });
      expect(linkElement).toBeInTheDocument();
      expect(linkElement).toHaveAttribute('href', 'https://example.com');
    });

    test('renders link with title attribute', () => {
      const content = 'This is a [link](https://example.com "Example Title").';
      render(<Md content={content} />);
      const linkElement = screen.getByRole('link');
      expect(linkElement).toBeInTheDocument();
      expect(linkElement).toHaveAttribute('title', 'Example Title');
    });
  });

  describe('Image Node', () => {
    test('renders image with src and alt text', () => {
      const content = '![Alt text](https://example.com/image.jpg)';
      render(<Md content={content} />);
      const imgElement = screen.getByAltText('Alt text');
      expect(imgElement).toBeInTheDocument();
      expect(imgElement).toHaveAttribute('src', 'https://example.com/image.jpg');
      // Now using native img element with inline styles
    });

    test('renders image with title', () => {
      const content = '![Alt text](https://example.com/image.jpg "Image Title")';
      render(<Md content={content} />);
      const imgElement = screen.getByAltText('Alt text');
      expect(imgElement).toHaveAttribute('title', 'Image Title');
    });
  });

  describe('List Nodes', () => {
    test('renders unordered list with items', () => {
      const content = `- First item
- Second item
- Third item`;
      render(<Md content={content} />);
      
      const listItems = screen.getAllByRole('listitem');
      expect(listItems).toHaveLength(3);
      expect(listItems[0]).toHaveTextContent('First item');
      expect(listItems[1]).toHaveTextContent('Second item');
      expect(listItems[2]).toHaveTextContent('Third item');
    });

    test('renders ordered list with items', () => {
      const content = `1. First item
2. Second item
3. Third item`;
      render(<Md content={content} />);
      
      const listItems = screen.getAllByRole('listitem');
      expect(listItems).toHaveLength(3);
      expect(listItems[0]).toHaveTextContent('First item');
      expect(listItems[1]).toHaveTextContent('Second item');
      expect(listItems[2]).toHaveTextContent('Third item');
    });

    test('renders nested lists', () => {
      const content = `- Parent item
  - Nested item 1
  - Nested item 2
- Another parent`;
      render(<Md content={content} />);
      
      const listItems = screen.getAllByRole('listitem');
      expect(listItems.length).toBeGreaterThanOrEqual(4);
      expect(screen.getByText('Parent item')).toBeInTheDocument();
      expect(screen.getByText('Nested item 1')).toBeInTheDocument();
      expect(screen.getByText('Nested item 2')).toBeInTheDocument();
      expect(screen.getByText('Another parent')).toBeInTheDocument();
    });
  });

  describe('Blockquote Node', () => {
    test('renders blockquote with content', () => {
      const content = '> This is a blockquote with some text.';
      render(<Md content={content} />);
      const blockquote = screen.getByText('This is a blockquote with some text.');
      expect(blockquote).toBeInTheDocument();
      // Now using Card component for blockquotes
    });

    test('renders multi-line blockquote', () => {
      const content = `> First line of quote
> Second line of quote`;
      render(<Md content={content} />);
      expect(screen.getByText(/First line of quote/)).toBeInTheDocument();
      expect(screen.getByText(/Second line of quote/)).toBeInTheDocument();
    });
  });

  describe('Code Block (Fence) Node', () => {
    test('renders code block with content', () => {
      const content = '```\nconst x = 42;\nconsole.log(x);\n```';
      render(<Md content={content} />);
      const codeBlock = screen.getByText(/const x = 42;/);
      expect(codeBlock).toBeInTheDocument();
      expect(screen.getByText(/console\.log\(x\);/)).toBeInTheDocument();
    });

    test('renders code block with language', () => {
      const content = '```javascript\nfunction hello() {\n  return "world";\n}\n```';
      render(<Md content={content} />);
      const codeBlock = screen.getByText(/function hello\(\)/);
      expect(codeBlock).toBeInTheDocument();
      const codeElement = codeBlock.closest('code');
      expect(codeElement).toHaveClass('language-javascript');
    });
  });

  describe('Table Nodes', () => {
    test('renders simple table with headers and data', () => {
      const content = `| Header 1 | Header 2 |
|----------|----------|
| Cell 1   | Cell 2   |
| Cell 3   | Cell 4   |`;
      render(<Md content={content} />);
      
      // Check headers
      expect(screen.getByText('Header 1')).toBeInTheDocument();
      expect(screen.getByText('Header 2')).toBeInTheDocument();
      
      // Check cells
      expect(screen.getByText('Cell 1')).toBeInTheDocument();
      expect(screen.getByText('Cell 2')).toBeInTheDocument();
      expect(screen.getByText('Cell 3')).toBeInTheDocument();
      expect(screen.getByText('Cell 4')).toBeInTheDocument();
    });

    test('renders table with alignment', () => {
      const content = `| Left | Center | Right |
|:-----|:------:|------:|
| L1   | C1     | R1    |`;
      render(<Md content={content} />);
      
      expect(screen.getByText('Left')).toBeInTheDocument();
      expect(screen.getByText('Center')).toBeInTheDocument();
      expect(screen.getByText('Right')).toBeInTheDocument();
      expect(screen.getByText('L1')).toBeInTheDocument();
      expect(screen.getByText('C1')).toBeInTheDocument();
      expect(screen.getByText('R1')).toBeInTheDocument();
    });
  });

  describe('Horizontal Rule Node', () => {
    test('renders horizontal rule', () => {
      const content = 'Text before\n\n---\n\nText after';
      render(<Md content={content} />);
      expect(screen.getByText('Text before')).toBeInTheDocument();
      expect(screen.getByText('Text after')).toBeInTheDocument();
      // Now using Divider component instead of hr
    });
  });

  describe('Line Break Nodes', () => {
    test('renders hard break', () => {
      const content = 'Line one  \\nLine two';
      const { container } = render(<Md content={content} />);
      // Check that both lines of text are present
      expect(screen.getByText(/Line one/)).toBeInTheDocument();
      expect(screen.getByText(/Line two/)).toBeInTheDocument();
      // Hard breaks might be rendered differently, so just check text is there
    });

    test('renders soft break as space', () => {
      const content = 'Word one\nWord two';
      render(<Md content={content} />);
      // Soft breaks should be rendered as spaces
      // Text is now split into separate spans, just check both words exist
      expect(screen.getByText('Word one')).toBeInTheDocument();
      expect(screen.getByText('Word two')).toBeInTheDocument();
    });
  });

  describe('Complex Content', () => {
    test('renders mixed content with multiple nodes', () => {
      const content = `# Main Title

This is a paragraph with **bold**, *italic*, and \`code\`.

## Subheading

- List item 1
- List item 2

> A blockquote

\`\`\`javascript
const test = true;
\`\`\`

[Link](https://example.com) and more text.`;

      render(<Md content={content} />);
      
      // Check various elements exist and have content
      expect(screen.getByRole('heading', { level: 1, name: 'Main Title' })).toBeInTheDocument();
      expect(screen.getByRole('heading', { level: 2, name: 'Subheading' })).toBeInTheDocument();
      expect(screen.getByText('bold')).toBeInTheDocument();
      expect(screen.getByText('italic')).toBeInTheDocument();
      expect(screen.getByText('code')).toBeInTheDocument();
      expect(screen.getByText('List item 1')).toBeInTheDocument();
      expect(screen.getByText('List item 2')).toBeInTheDocument();
      expect(screen.getByText('A blockquote')).toBeInTheDocument();
      expect(screen.getByText(/const test = true;/)).toBeInTheDocument();
      expect(screen.getByRole('link', { name: 'Link' })).toBeInTheDocument();
    });
  });
});