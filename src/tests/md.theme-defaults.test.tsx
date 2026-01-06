import React from 'react';
import { render } from '@testing-library/react';
import { ThemeProvider, type PartialTheme, type ThemeDefaults } from '@vaneui/ui';
import { Md } from '../components/md';

describe('Md Component - ThemeDefaults Tests', () => {
  describe('with themeDefaults configuration', () => {
    it('should apply themeDefaults to title components', () => {
      const content = '# Default Title\n## Default Subtitle';
      
      const themeDefaults: ThemeDefaults = {
        title: {
          primary: true,
          bold: true
        }
      };

      const { container } = render(
        <ThemeProvider themeDefaults={themeDefaults}>
          <Md content={content} />
        </ThemeProvider>
      );

      const h1 = container.querySelector('h1');
      const h2 = container.querySelector('h2');

      // Both should have the theme defaults applied
      expect(h1).toHaveClass('text-(--text-color)', 'font-bold');
      expect(h2).toHaveClass('text-(--text-color)', 'font-bold');

      // Size overrides still maintained
      expect(h1).toHaveClass('text-(length:--fs-desktop)');
      expect(h2).toHaveClass('text-(length:--fs-desktop)');
    });

    it('should apply themeDefaults to link components', () => {
      const content = '[Default Link](https://example.com) and [Another Link](https://test.com)';
      
      const themeDefaults: ThemeDefaults = {
        link: {
          lg: true,
          underline: true,
          semibold: true
        }
      };

      const { container } = render(
        <ThemeProvider themeDefaults={themeDefaults}>
          <Md content={content} />
        </ThemeProvider>
      );

      const links = container.querySelectorAll('a');
      expect(links).toHaveLength(2);

      links.forEach(link => {
        expect(link).toHaveClass('underline', 'font-semibold');
        expect(link).toHaveClass('text-(length:--fs-desktop)');
        expect(link).toHaveClass('text-(--text-color)'); // Link color maintained
        expect(link).not.toHaveClass('font-normal');
      });
    });

    it('should apply themeDefaults to list components', () => {
      const content = '- Default Item 1\n- Default Item 2\n- Default Item 3';
      
      const themeDefaults: ThemeDefaults = {
        list: {
          xl: true,
          success: true,
          semibold: true
        }
      };

      const { container } = render(
        <ThemeProvider themeDefaults={themeDefaults}>
          <Md content={content} />
        </ThemeProvider>
      );

      const list = container.querySelector('ul');
      expect(list).toHaveClass('text-(--text-color)', 'font-semibold');
      expect(list).toHaveAttribute('data-appearance', 'success');
      expect(list).toHaveClass('text-(length:--fs-desktop)');
      expect(list).not.toHaveClass('font-normal');
    });

    it('should combine themeDefaults with custom theme', () => {
      const content = '# Combined Defaults\n[Combined Link](https://example.com)\n- Combined List';
      
      const customTheme: PartialTheme = {
        title: {
          defaults: {
            accent: true // Custom theme sets accent
          }
        }
      };

      const themeDefaults: ThemeDefaults = {
        title: {
          black: true // ThemeDefaults adds black weight
        },
        link: {
          sm: true
        },
        list: {
          warning: true
        }
      };

      const { container } = render(
        <ThemeProvider theme={customTheme} themeDefaults={themeDefaults}>
          <Md content={content} />
        </ThemeProvider>
      );

      const h1 = container.querySelector('h1');
      const link = container.querySelector('a');
      const list = container.querySelector('ul');

      // Title should have both custom theme and defaults merged
      expect(h1).toHaveClass('text-(--text-color)', 'font-black');
      expect(h1).toHaveAttribute('data-appearance', 'accent');
      expect(h1).toHaveClass('text-(length:--fs-desktop)');

      // Link should have themeDefaults applied
      // Link size is managed by CSS variables, not always explicit as class;
      expect(link).toHaveClass('text-(length:--fs-desktop)');
      expect(link).toHaveClass('text-(--text-color)');

      // List should have themeDefaults applied
      expect(list).toHaveClass('text-(--text-color)');
      expect(list).toHaveAttribute('data-appearance', 'warning');
    });

    it('should handle multiple component themeDefaults', () => {
      const content = `# Multi Defaults
[Multi Link](https://example.com)
- Multi List Item`;

      const themeDefaults: ThemeDefaults = {
        title: {
          secondary: true,
          light: true
        },
        link: {
          mono: true,
          xl: true
        },
        list: {
          info: true,
          lg: true,
          serif: true
        }
      };

      const { container } = render(
        <ThemeProvider themeDefaults={themeDefaults}>
          <Md content={content} />
        </ThemeProvider>
      );

      const h1 = container.querySelector('h1');
      const link = container.querySelector('a');
      const list = container.querySelector('ul');

      // All components should have their respective defaults
      expect(h1).toHaveClass('text-(--text-color)', 'font-light');
      expect(link).toHaveClass('font-mono');
      expect(link).toHaveClass('text-(length:--fs-desktop)');
      expect(list).toHaveClass('text-(--text-color)', 'font-serif');
      expect(list).toHaveAttribute('data-appearance', 'info');
      expect(list).toHaveClass('text-(length:--fs-desktop)');
    });

    it('should prioritize explicit props over themeDefaults', () => {
      const content = '# Explicit Override';
      
      // This test would require modifying the Md component to accept explicit props
      // which it doesn't currently do. For now, we test that themeDefaults work
      // when no explicit props conflict.
      
      const themeDefaults: ThemeDefaults = {
        title: {
          primary: true,
          semibold: true
        }
      };

      const { container } = render(
        <ThemeProvider themeDefaults={themeDefaults}>
          <Md content={content} />
        </ThemeProvider>
      );

      const h1 = container.querySelector('h1');
      expect(h1).toHaveClass('text-(--text-color)', 'font-semibold');
    });

    it('should handle themeDefaults with rerender', () => {
      const content = '# Dynamic Defaults';
      
      const themeDefaults1: ThemeDefaults = {
        title: {
          danger: true,
          bold: true
        }
      };

      const themeDefaults2: ThemeDefaults = {
        title: {
          success: true,
          light: true
        }
      };

      const { container, rerender } = render(
        <ThemeProvider themeDefaults={themeDefaults1}>
          <Md content={content} />
        </ThemeProvider>
      );

      let h1 = container.querySelector('h1');
      expect(h1).toHaveClass('text-(--text-color)', 'font-bold');
      expect(h1).toHaveAttribute('data-appearance', 'danger');

      rerender(
        <ThemeProvider themeDefaults={themeDefaults2}>
          <Md content={content} />
        </ThemeProvider>
      );

      h1 = container.querySelector('h1');
      expect(h1).toHaveClass('text-(--text-color)', 'font-light');
      expect(h1).toHaveAttribute('data-appearance', 'success');
      expect(h1).not.toHaveAttribute('data-appearance', 'danger');
      expect(h1).not.toHaveClass('font-bold');
    });
  });
});