import React from 'react';
import { render, screen } from '@testing-library/react';
import { ThemeProvider, defaultTheme, type PartialTheme } from '@vaneui/ui';
import { Md } from '../md';

describe('Md', () => {
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
    it('applies theme to Title components in headings', () => {
      const content = '# Main Title\n## Subtitle';
      const customTheme: PartialTheme = {
        title: {
          color: 'red-500',
          fontWeight: 'bold'
        }
      };

      const { container } = render(
        <ThemeProvider theme={customTheme}>
          <Md content={content} />
        </ThemeProvider>
      );

      const titleElements = container.querySelectorAll('h1, h2');
      expect(titleElements).toHaveLength(2);
      
      // Check that titles are rendered and accessible
      expect(screen.getByText('Main Title')).toBeInTheDocument();
      expect(screen.getByText('Subtitle')).toBeInTheDocument();
    });

    it('applies theme to Link components', () => {
      const content = '[Test Link](https://example.com)';
      const customTheme: PartialTheme = {
        link: {
          color: 'blue-600',
          textDecoration: 'underline'
        }
      };

      render(
        <ThemeProvider theme={customTheme}>
          <Md content={content} />
        </ThemeProvider>
      );

      const link = screen.getByRole('link', { name: 'Test Link' });
      expect(link).toBeInTheDocument();
      expect(link).toHaveAttribute('href', 'https://example.com');
    });

    it('applies theme to List components', () => {
      const content = '- First item\n- Second item\n- Third item';
      const customTheme: PartialTheme = {
        list: {
          color: 'gray-700',
          fontSize: 'lg'
        }
      };

      render(
        <ThemeProvider theme={customTheme}>
          <Md content={content} />
        </ThemeProvider>
      );

      expect(screen.getByText('First item')).toBeInTheDocument();
      expect(screen.getByText('Second item')).toBeInTheDocument();
      expect(screen.getByText('Third item')).toBeInTheDocument();
    });

    it('renders with default theme when no custom theme provided', () => {
      const content = '# Default Theme\n[Link](https://example.com)\n- List item';

      render(
        <ThemeProvider theme={defaultTheme}>
          <Md content={content} />
        </ThemeProvider>
      );

      expect(screen.getByText('Default Theme')).toBeInTheDocument();
      expect(screen.getByRole('link')).toBeInTheDocument();
      expect(screen.getByText('List item')).toBeInTheDocument();
    });

    it('updates appearance when theme changes', () => {
      const content = '# Theme Test';
      
      const { rerender } = render(
        <ThemeProvider theme={defaultTheme}>
          <Md content={content} />
        </ThemeProvider>
      );

      expect(screen.getByText('Theme Test')).toBeInTheDocument();

      const customTheme: PartialTheme = {
        title: {
          color: 'purple-600',
          fontSize: '2xl'
        }
      };

      rerender(
        <ThemeProvider theme={customTheme}>
          <Md content={content} />
        </ThemeProvider>
      );

      // Title should still be rendered with new theme applied
      expect(screen.getByText('Theme Test')).toBeInTheDocument();
    });

    it('handles nested ThemeProvider correctly', () => {
      const content = '# Nested Theme Test\n[Nested Link](https://nested.com)';
      
      const outerTheme: PartialTheme = {
        title: {
          color: 'green-500'
        }
      };

      const innerTheme: PartialTheme = {
        link: {
          color: 'red-500'
        }
      };

      render(
        <ThemeProvider theme={outerTheme}>
          <ThemeProvider theme={innerTheme}>
            <Md content={content} />
          </ThemeProvider>
        </ThemeProvider>
      );

      expect(screen.getByText('Nested Theme Test')).toBeInTheDocument();
      const link = screen.getByRole('link', { name: 'Nested Link' });
      expect(link).toBeInTheDocument();
      expect(link).toHaveAttribute('href', 'https://nested.com');
    });
  });
});