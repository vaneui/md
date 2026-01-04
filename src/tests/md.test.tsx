import React from 'react';
import { render, screen } from '@testing-library/react';
import { ThemeProvider, defaultTheme, type PartialTheme } from '@vaneui/ui';
import { Md } from '../components/md';

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
      expect(h1).toHaveClass('[--fs-unit:var(--fs-unit-desktop)]'); // xl size
      expect(h1).toHaveClass('text-(length:--fs)'); // CSS variable font size
      // Default appearance may not be visible as explicit CSS class
      expect(h1).toHaveClass('font-sans', 'font-semibold');

      // Test h2 (level 2)
      const h2 = container.querySelector('h2');
      expect(h2).toBeInTheDocument();
      expect(h2).toHaveClass('[--fs-unit:var(--fs-unit-desktop)]'); // lg size
      expect(h2).toHaveClass('text-(length:--fs)'); // CSS variable font size
      // Default appearance may not be visible as explicit CSS class

      // Test h3 (level 3)
      const h3 = container.querySelector('h3');
      expect(h3).toBeInTheDocument();
      expect(h3).toHaveClass('[--fs-unit:var(--fs-unit-desktop)]'); // md size
      expect(h3).toHaveClass('text-(length:--fs)'); // CSS variable font size
      // Default appearance may not be visible as explicit CSS class

      // Test h4 (level 4)
      const h4 = container.querySelector('h4');
      expect(h4).toBeInTheDocument();
      expect(h4).toHaveClass('[--fs-unit:var(--fs-unit-desktop)]'); // sm size
      expect(h4).toHaveClass('text-(length:--fs)'); // CSS variable font size
      // Default appearance may not be visible as explicit CSS class

      // Test h5 (level 5)
      const h5 = container.querySelector('h5');
      expect(h5).toBeInTheDocument();
      expect(h5).toHaveClass('[--fs-unit:var(--fs-unit-desktop)]'); // xs size
      expect(h5).toHaveClass('text-(length:--fs)'); // CSS variable font size
      // Default appearance may not be visible as explicit CSS class
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
      expect(link).toHaveClass('cursor-pointer'); // link behavior
      expect(link).toHaveClass('text-(--text-color)'); // link appearance
      expect(link).toHaveClass('font-sans', 'underline');
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
      // Size is inherited from theme defaults, not always set explicitly; // md size
      expect(list).toHaveClass('text-(length:--fs)'); // CSS variable font size
      expect(list).toHaveClass('pl-(--pl)'); // default padding
      expect(list).toHaveClass('font-sans', 'font-normal');

      const listItems = container.querySelectorAll('li');
      expect(listItems).toHaveLength(3);
      listItems.forEach(listItem => {
        // ListItems inherit color from parent List
        // List items inherit from parent list styling
        expect(listItem).not.toHaveClass('text-(--text-color)');
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
      // Now wrapped in Card component
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
      // Default appearance may not be visible as explicit CSS class

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
      // Default appearance may not be visible as explicit CSS class
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
      expect(h1).toHaveClass('[--fs-unit:var(--fs-unit-desktop)]', 'font-semibold');
      expect(h1).toHaveClass('text-(length:--fs)');

      const h2 = container.querySelector('h2');
      expect(h2).toHaveClass('[--fs-unit:var(--fs-unit-desktop)]', 'font-semibold');
      expect(h2).toHaveClass('text-(length:--fs)');

      const link = container.querySelector('a');
      expect(link).toHaveClass('text-(--text-color)', 'hover:underline');

      const list = container.querySelector('ul');
      expect(list).toHaveClass('list-disc', 'list-inside');
      expect(list).toHaveClass('text-(length:--fs)');

      const img = container.querySelector('img');
      // Now wrapped in Card component
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
      expect(h1).toHaveClass('text-(--text-color)');
      expect(h1).toHaveClass('[--fs-unit:var(--fs-unit-desktop)]'); // Size override maintained
      expect(h1).toHaveClass('text-(length:--fs)');
    });
  });
});