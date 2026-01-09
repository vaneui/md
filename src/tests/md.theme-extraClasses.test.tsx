import React from 'react';
import { render } from '@testing-library/react';
import { ThemeProvider, type ThemeExtraClasses } from '@vaneui/ui';
import { Md } from '../components/md';

describe('Md Component - ExtraClasses Tests', () => {
  describe('with extraClasses configuration', () => {
    it('should apply extraClasses to text components', () => {
      const content = 'Some paragraph text';

      const extraClasses: ThemeExtraClasses = {
        text: {
          md: 'leading-9 w-full',
        },
      };

      const { container } = render(
        <ThemeProvider extraClasses={extraClasses}>
          <Md content={content} />
        </ThemeProvider>
      );

      const p = container.querySelector('p');
      expect(p).toBeInTheDocument();
      expect(p).toHaveClass('leading-9', 'w-full');
    });

    it('should apply extraClasses to title components by size', () => {
      const content = '# Heading 1\n## Heading 2\n### Heading 3';

      const extraClasses: ThemeExtraClasses = {
        title: {
          xs: 'pt-2',
          sm: 'pt-3',
          md: 'pt-4',
          lg: 'pt-5',
          xl: 'pt-6',
        },
      };

      const { container } = render(
        <ThemeProvider extraClasses={extraClasses}>
          <Md content={content} />
        </ThemeProvider>
      );

      const h1 = container.querySelector('h1');
      const h2 = container.querySelector('h2');
      const h3 = container.querySelector('h3');

      expect(h1).toBeInTheDocument();
      expect(h2).toBeInTheDocument();
      expect(h3).toBeInTheDocument();

      // H1 uses xl size, H2 uses lg size, H3 uses md size
      expect(h1).toHaveClass('pt-6');
      expect(h2).toHaveClass('pt-5');
      expect(h3).toHaveClass('pt-4');
    });

    it('should apply extraClasses to link components', () => {
      const content = '[Test Link](https://example.com)';

      const extraClasses: ThemeExtraClasses = {
        link: {
          md: 'hover:text-blue-600 transition-colors',
        },
      };

      const { container } = render(
        <ThemeProvider extraClasses={extraClasses}>
          <Md content={content} />
        </ThemeProvider>
      );

      const link = container.querySelector('a');
      expect(link).toBeInTheDocument();
      expect(link).toHaveClass('hover:text-blue-600', 'transition-colors');
    });

    it('should apply extraClasses to list components', () => {
      const content = '- Item 1\n- Item 2\n- Item 3';

      const extraClasses: ThemeExtraClasses = {
        list: {
          md: 'space-y-2 ml-4',
        },
      };

      const { container } = render(
        <ThemeProvider extraClasses={extraClasses}>
          <Md content={content} />
        </ThemeProvider>
      );

      const list = container.querySelector('ul');
      expect(list).toBeInTheDocument();
      expect(list).toHaveClass('space-y-2', 'ml-4');
    });

    it('should merge extraClasses with existing theme classes', () => {
      const content = 'Paragraph with merged classes';

      const extraClasses: ThemeExtraClasses = {
        text: {
          md: 'leading-relaxed custom-class',
        },
      };

      const { container } = render(
        <ThemeProvider extraClasses={extraClasses}>
          <Md content={content} />
        </ThemeProvider>
      );

      const p = container.querySelector('p');
      expect(p).toBeInTheDocument();
      // Should have both the extra classes and existing theme classes
      expect(p).toHaveClass('leading-relaxed', 'custom-class');
      expect(p).toHaveClass('text-(length:--fs)'); // Default text size class
    });

    it('should apply multiple extraClasses to different components', () => {
      const content = `# Title with extra classes

Paragraph with extra classes

[Link with extra classes](https://example.com)

- List item with extra classes`;

      const extraClasses: ThemeExtraClasses = {
        text: {
          md: 'leading-7 w-full',
        },
        title: {
          xl: 'pt-6 border-b',
        },
        link: {
          md: 'font-medium',
        },
        list: {
          md: 'pl-6',
        },
      };

      const { container } = render(
        <ThemeProvider extraClasses={extraClasses}>
          <Md content={content} />
        </ThemeProvider>
      );

      const h1 = container.querySelector('h1');
      const p = container.querySelector('p');
      const link = container.querySelector('a');
      const list = container.querySelector('ul');

      expect(h1).toHaveClass('pt-6', 'border-b');
      expect(p).toHaveClass('leading-7', 'w-full');
      expect(link).toHaveClass('font-medium');
      expect(list).toHaveClass('pl-6');
    });

    it('should apply extraClasses based on appearance', () => {
      const content = '# Primary Title';

      const extraClasses: ThemeExtraClasses = {
        title: {
          primary: 'shadow-sm',
        },
      };

      const { container } = render(
        <ThemeProvider extraClasses={extraClasses}>
          <Md content={content} />
        </ThemeProvider>
      );

      const h1 = container.querySelector('h1');
      expect(h1).toBeInTheDocument();
      expect(h1).toHaveClass('shadow-sm');
    });

    it('should combine extraClasses with themeDefaults', () => {
      const content = '# Combined Title';

      const extraClasses: ThemeExtraClasses = {
        title: {
          xl: 'mt-8 mb-4',
          danger: 'border-red-500',
        },
      };

      const { container } = render(
        <ThemeProvider
          themeDefaults={{ title: { danger: true } }}
          extraClasses={extraClasses}
        >
          <Md content={content} />
        </ThemeProvider>
      );

      const h1 = container.querySelector('h1');
      expect(h1).toBeInTheDocument();
      expect(h1).toHaveClass('mt-8', 'mb-4'); // from size extraClasses
      expect(h1).toHaveClass('border-red-500'); // from appearance extraClasses
      expect(h1).toHaveAttribute('data-appearance', 'danger');
    });

    it('should handle extraClasses with rerender', () => {
      const content = '# Dynamic Extra Classes';

      const extraClasses1: ThemeExtraClasses = {
        title: {
          xl: 'bg-blue-100',
        },
      };

      const extraClasses2: ThemeExtraClasses = {
        title: {
          xl: 'bg-green-100',
        },
      };

      const { container, rerender } = render(
        <ThemeProvider extraClasses={extraClasses1}>
          <Md content={content} />
        </ThemeProvider>
      );

      let h1 = container.querySelector('h1');
      expect(h1).toHaveClass('bg-blue-100');

      rerender(
        <ThemeProvider extraClasses={extraClasses2}>
          <Md content={content} />
        </ThemeProvider>
      );

      h1 = container.querySelector('h1');
      expect(h1).toHaveClass('bg-green-100');
      expect(h1).not.toHaveClass('bg-blue-100');
    });
  });
});
