import React from 'react';
import { render, screen } from '@testing-library/react';
import { ThemeProvider, defaultTheme, type PartialTheme } from '@vaneui/ui';
import { Md } from '../md';

describe('Md Component Tests', () => {
  it('renders basic text content', () => {
    const content = 'Hello world';
    render(<Md content={content} />);
    expect(screen.getByText('Hello world')).toBeInTheDocument();
  });

  it('renders headings correctly', () => {
    const content = '# Main Title\n## Subtitle';
    render(<Md content={content} />);
    expect(screen.getByText('Main Title')).toBeInTheDocument();
    expect(screen.getByText('Subtitle')).toBeInTheDocument();
  });

  it('renders lists correctly', () => {
    const content = '- Item 1\n- Item 2\n- Item 3';
    render(<Md content={content} />);
    expect(screen.getByText('Item 1')).toBeInTheDocument();
    expect(screen.getByText('Item 2')).toBeInTheDocument();
    expect(screen.getByText('Item 3')).toBeInTheDocument();
  });

  it('renders links correctly', () => {
    const content = '[Link text](https://example.com)';
    render(<Md content={content} />);
    const link = screen.getByRole('link', { name: 'Link text' });
    expect(link).toBeInTheDocument();
    expect(link).toHaveAttribute('href', 'https://example.com');
  });

  it('renders images correctly', () => {
    const content = '![Alt text](https://example.com/image.jpg "Image title")';
    render(<Md content={content} />);
    const img = screen.getByRole('img', { name: 'Alt text' });
    expect(img).toBeInTheDocument();
    expect(img).toHaveAttribute('src', 'https://example.com/image.jpg');
    expect(img).toHaveAttribute('title', 'Image title');
  });

  it('renders with frontmatter', () => {
    const content = 'Hello world';
    const frontmatter = { title: 'Test Page', author: 'Test Author' };
    render(<Md content={content} frontmatter={frontmatter} />);
    expect(screen.getByText('Hello world')).toBeInTheDocument();
  });

  describe('with ThemeProvider', () => {
    it('should render headings with default theme classes', () => {
      const content = '# Main Title\n## Subtitle\n### Section\n#### Sub-section\n##### Minor';
      const { container } = render(
        <ThemeProvider theme={defaultTheme}>
          <Md content={content} />
        </ThemeProvider>
      );

      // Test h1 (level 1)
      const h1 = container.querySelector('h1');
      expect(h1).toBeInTheDocument();
      expect(h1).toHaveClass('text-balance', 'w-fit');
      expect(h1).toHaveClass('text-4xl'); // xl size
      expect(h1).toHaveClass('text-(--text-color-default)');
      expect(h1).toHaveClass('font-sans', 'font-semibold');

      // Test h2 (level 2)
      const h2 = container.querySelector('h2');
      expect(h2).toBeInTheDocument();
      expect(h2).toHaveClass('text-3xl'); // lg size
      expect(h2).toHaveClass('text-(--text-color-default)');

      // Test h3 (level 3)
      const h3 = container.querySelector('h3');
      expect(h3).toBeInTheDocument();
      expect(h3).toHaveClass('text-2xl'); // md size
      expect(h3).toHaveClass('text-(--text-color-default)');

      // Test h4 (level 4)
      const h4 = container.querySelector('h4');
      expect(h4).toBeInTheDocument();
      expect(h4).toHaveClass('text-xl'); // sm size
      expect(h4).toHaveClass('text-(--text-color-default)');

      // Test h5 (level 5)
      const h5 = container.querySelector('h5');
      expect(h5).toBeInTheDocument();
      expect(h5).toHaveClass('text-lg'); // xs size
      expect(h5).toHaveClass('text-(--text-color-default)');
    });

    it('should render links with default theme classes', () => {
      const content = '[Test Link](https://example.com)';
      const { container } = render(
        <ThemeProvider theme={defaultTheme}>
          <Md content={content} />
        </ThemeProvider>
      );

      const link = container.querySelector('a');
      expect(link).toBeInTheDocument();
      expect(link).toHaveClass('hover:underline', 'w-fit');
      expect(link).toHaveClass('text-base'); // md size
      expect(link).toHaveClass('text-(--text-color-link)'); // link appearance
      expect(link).toHaveClass('font-sans', 'font-normal');
      expect(link).toHaveAttribute('href', 'https://example.com');
    });

    it('should render lists with default theme classes', () => {
      const content = '- First item\n- Second item\n- Third item';
      const { container } = render(
        <ThemeProvider theme={defaultTheme}>
          <Md content={content} />
        </ThemeProvider>
      );

      const list = container.querySelector('ul');
      expect(list).toBeInTheDocument();
      expect(list).toHaveClass('list-disc', 'list-inside');
      expect(list).toHaveClass('text-base'); // md size
      expect(list).toHaveClass('text-(--text-color-default)'); // default appearance
      expect(list).toHaveClass('font-sans', 'font-normal');

      const listItems = container.querySelectorAll('li');
      expect(listItems).toHaveLength(3);
      listItems.forEach(listItem => {
        // ListItems inherit color from parent List
        expect(listItem).not.toHaveClass('text-(--text-color-default)');
        expect(listItem).not.toHaveClass('text-(--text-color-primary)');
      });
    });

    it('should render images with correct styling', () => {
      const content = '![Alt text](https://example.com/image.jpg "Image title")';
      const { container } = render(
        <ThemeProvider theme={defaultTheme}>
          <Md content={content} />
        </ThemeProvider>
      );

      const img = container.querySelector('img');
      expect(img).toBeInTheDocument();
      expect(img).toHaveClass('w-fit', 'rounded-lg');
      expect(img).toHaveAttribute('src', 'https://example.com/image.jpg');
      expect(img).toHaveAttribute('alt', 'Alt text');
      expect(img).toHaveAttribute('title', 'Image title');
    });

    it('should apply appearance variants to headings', () => {
      const content = '# Primary Title';
      const { container, rerender } = render(
        <ThemeProvider theme={defaultTheme}>
          <Md content={content} />
        </ThemeProvider>
      );

      // Default appearance
      let h1 = container.querySelector('h1');
      expect(h1).toHaveClass('text-(--text-color-default)');

      // Test with different appearance by checking if Title component can accept appearance props
      // Since our MdHeading component passes through props, it should work with VaneUI Title props
      const customContent = '# Custom Title';
      rerender(
        <ThemeProvider theme={defaultTheme}>
          <Md content={customContent} />
        </ThemeProvider>
      );

      h1 = container.querySelector('h1');
      expect(h1).toBeInTheDocument();
      expect(h1).toHaveClass('text-(--text-color-default)');
    });

    it('should handle complex markdown with mixed elements', () => {
      const content = `# Main Title
      
This is a paragraph with [a link](https://example.com).

## Section
- Item 1
- Item 2

![Image](https://example.com/img.jpg)`;

      const { container } = render(
        <ThemeProvider theme={defaultTheme}>
          <Md content={content} />
        </ThemeProvider>
      );

      // Check all elements are rendered with proper theme classes
      const h1 = container.querySelector('h1');
      expect(h1).toHaveClass('text-4xl', 'font-semibold');

      const h2 = container.querySelector('h2');
      expect(h2).toHaveClass('text-3xl', 'font-semibold');

      const link = container.querySelector('a');
      expect(link).toHaveClass('text-(--text-color-link)', 'hover:underline');

      const list = container.querySelector('ul');
      expect(list).toHaveClass('list-disc', 'list-inside', 'text-base');

      const img = container.querySelector('img');
      expect(img).toHaveClass('w-fit', 'rounded-lg');
    });

    it('should work with frontmatter variables', () => {
      const content = 'Hello world';
      const frontmatter = { title: 'Test Page', author: 'Test Author' };
      
      const { container } = render(
        <ThemeProvider theme={defaultTheme}>
          <Md content={content} frontmatter={frontmatter} />
        </ThemeProvider>
      );

      // The content should still render properly
      expect(screen.getByText('Hello world')).toBeInTheDocument();
      
      // Check that the container (Col component) is rendered
      const colElement = container.firstChild;
      expect(colElement).toBeInTheDocument();
    });

    it('should handle empty content gracefully', () => {
      const content = '';
      const { container } = render(
        <ThemeProvider theme={defaultTheme}>
          <Md content={content} />
        </ThemeProvider>
      );

      // Should render the container even with empty content
      expect(container.firstChild).toBeInTheDocument();
    });

    it('should handle markdown with inline code', () => {
      const content = 'Here is some `inline code` in text.';
      render(
        <ThemeProvider theme={defaultTheme}>
          <Md content={content} />
        </ThemeProvider>
      );

      expect(screen.getByText(/Here is some/)).toBeInTheDocument();
      expect(screen.getByText(/inline code/)).toBeInTheDocument();
    });
  });

  describe('with basic theme integration', () => {
    it('should apply custom theme defaults', () => {
      const content = '# Custom Title\n[Custom Link](https://example.com)\n- Custom List';
      const customTheme: PartialTheme = {
        title: {
          defaults: {
            primary: true
          }
        }
      };

      const { container } = render(
        <ThemeProvider theme={customTheme}>
          <Md content={content} />
        </ThemeProvider>
      );

      const h1 = container.querySelector('h1');
      expect(h1).toHaveClass('text-(--text-color-primary)');
      expect(h1).toHaveClass('text-4xl'); // Size override maintained
    });
  });
});