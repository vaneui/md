import React from 'react';
import { render } from '@testing-library/react';
import { ThemeProvider, type ThemeProps, type PartialTheme } from '@vaneui/ui';
import { Md } from '../md';

describe('Md Component - ThemeOverride Tests', () => {
  describe('with themeOverride function', () => {
    it('should override title themes with custom appearance and typography', () => {
      const content = '# Override Title\n## Override Subtitle';
      
      const themeOverride = (theme: ThemeProps): ThemeProps => {
        // Direct property assignment for title themes
        theme.title.base = 'border-l-4 border-red-500 pl-4 py-2';
        
        // Override text appearance
        theme.title.themes.appearance.text.danger = {
          base: 'text-red-700',
          hover: 'hover:text-red-800',
          active: 'active:text-red-900'
        };
        theme.title.themes.appearance.text.warning = {
          base: 'text-orange-600',
          hover: 'hover:text-orange-700',
          active: 'active:text-orange-800'
        };
        
        // Override text sizes
        theme.title.themes.size.text.xxl = 'text-6xl';
        theme.title.themes.size.text.xxxl = 'text-7xl';
        
        // Override typography
        theme.title.themes.typography.fontWeight.extrabold = 'font-extrabold tracking-tight';
        theme.title.themes.typography.fontWeight.black = 'font-black tracking-tighter drop-shadow-sm';
        theme.title.themes.typography.fontFamily.display = 'font-serif';
        
        return theme;
      };

      const { container } = render(
        <ThemeProvider themeOverride={themeOverride}>
          <Md content={content} />
        </ThemeProvider>
      );

      const h1 = container.querySelector('h1');
      const h2 = container.querySelector('h2');

      expect(h1).toHaveClass('border-l-4', 'border-red-500', 'pl-4', 'py-2');
      expect(h2).toHaveClass('border-l-4', 'border-red-500', 'pl-4', 'py-2');
    });

    it('should override link themes with custom appearance and size', () => {
      const content = '[Override Link](https://example.com) and [Another Link](https://test.com)';
      
      const themeOverride = (theme: ThemeProps): ThemeProps => {
        // Direct property assignment for link themes
        theme.link.base = 'transition-colors duration-200 hover:scale-105';
        
        // Override text appearance
        theme.link.themes.appearance.text.primary = {
          base: 'text-blue-600',
          hover: 'hover:text-blue-700',
          active: 'active:text-blue-800'
        };
        theme.link.themes.appearance.text.secondary = {
          base: 'text-purple-600',
          hover: 'hover:text-purple-700',
          active: 'active:text-purple-800'
        };
        
        // Override text sizes
        theme.link.themes.size.text.xl = 'text-xl';
        theme.link.themes.size.text.xxl = 'text-2xl';
        
        // Override typography
        theme.link.themes.typography.fontWeight.bold = 'font-bold';
        theme.link.themes.typography.fontWeight.extrabold = 'font-extrabold';
        theme.link.themes.typography.textDecoration.underline = 'underline decoration-2';
        theme.link.themes.typography.textDecoration['double-underline'] = 'underline decoration-double decoration-2';
        
        return theme;
      };

      const { container } = render(
        <ThemeProvider themeOverride={themeOverride}>
          <Md content={content} />
        </ThemeProvider>
      );

      const links = container.querySelectorAll('a');
      expect(links).toHaveLength(2);

      links.forEach(link => {
        expect(link).toHaveClass('transition-colors', 'duration-200', 'hover:scale-105');
        expect(link).toBeInTheDocument();
        expect(link).toHaveAttribute('href');
      });
    });

    it('should override list themes with appearance and size customization', () => {
      const content = '- Override Item 1\n- Override Item 2\n- Override Item 3';
      
      const themeOverride = (theme: ThemeProps): ThemeProps => {
        // Direct property assignment for list themes
        theme.list.base = 'space-y-3 bg-gray-50 p-4 rounded-lg border border-gray-200';
        
        // Override text appearance
        theme.list.themes.appearance.text.info = {
          base: 'text-blue-700',
          hover: 'hover:text-blue-800',
          active: 'active:text-blue-900'
        };
        theme.list.themes.appearance.text.success = {
          base: 'text-green-700',
          hover: 'hover:text-green-800',
          active: 'active:text-green-900'
        };
        
        // Override text sizes
        theme.list.themes.size.text.lg = 'text-lg';
        theme.list.themes.size.text.xl = 'text-xl leading-relaxed';
        
        // Override padding left sizes
        theme.list.themes.size.paddingLeft.xl = 'pl-8';
        theme.list.themes.size.paddingLeft.xxl = 'pl-12';
        
        // Override typography
        theme.list.themes.typography.fontWeight.medium = 'font-medium';
        theme.list.themes.typography.fontWeight.semibold = 'font-semibold';
        theme.list.themes.typography.fontFamily.mono = 'font-mono';
        
        return theme;
      };

      const { container } = render(
        <ThemeProvider themeOverride={themeOverride}>
          <Md content={content} />
        </ThemeProvider>
      );

      const list = container.querySelector('ul');
      
      expect(list).toHaveClass('space-y-3', 'bg-gray-50', 'p-4', 'rounded-lg', 'border', 'border-gray-200');
      expect(list).toBeInTheDocument();
    });

    it('should combine themeOverride with custom theme', () => {
      const content = '# Combined Theme\n[Combined Link](https://example.com)\n- Combined List';
      
      const customTheme: PartialTheme = {
        title: {
          defaults: {
            primary: true
          }
        }
      };

      const themeOverride = (theme: ThemeProps): ThemeProps => {
        const newTheme = { ...theme };
        newTheme.title.defaults = {
          ...theme.title.defaults,
          semibold: false,
          black: true // Override adds black weight to the primary appearance
        };
        newTheme.link.defaults = {
          ...theme.link.defaults,
          sm: true
        };
        return newTheme;
      };

      const { container } = render(
        <ThemeProvider theme={customTheme} themeOverride={themeOverride}>
          <Md content={content} />
        </ThemeProvider>
      );

      const h1 = container.querySelector('h1');
      const link = container.querySelector('a');

      // Title should have both custom theme (primary) and override (black)
      expect(h1).toHaveClass('text-(--text-color-primary)', 'font-black');
      expect(h1).toHaveClass('text-4xl');

      // Link should have override applied
      expect(link).toHaveClass('text-sm');
      expect(link).toHaveClass('text-(--text-color-link)');
    });

    it('should apply themeOverride with nested theme modifications', () => {
      const content = '# Nested Override\n[Nested Link](https://example.com)';
      
      const themeOverride = (theme: ThemeProps): ThemeProps => {
        const newTheme = { ...theme };
        // Since themes is readonly, we can only modify defaults
        newTheme.title.defaults = {
          ...theme.title.defaults,
          warning: true,
          default: false
        };
        return newTheme;
      };

      const { container } = render(
        <ThemeProvider themeOverride={themeOverride}>
          <Md content={content} />
        </ThemeProvider>
      );

      const h1 = container.querySelector('h1');

      // Title should have nested theme override applied
      expect(h1).toHaveClass('text-(--text-color-warning)');
      expect(h1).toHaveClass('text-4xl');
    });

    it('should create cohesive design system by overriding all component themes', () => {
      const content = `# Design System Header
[Navigation Link](https://example.com)
- System List Item
- Styled Content Item`;

      const themeOverride = (theme: ThemeProps): ThemeProps => {
        // Override title themes
        theme.title.base = 'border-b-2 border-indigo-200 pb-3 mb-6';
        theme.title.themes.appearance.text.brand = {
          base: 'text-indigo-800',
          hover: 'hover:text-indigo-900',
          active: 'active:text-indigo-950'
        };
        theme.title.themes.appearance.text.accent = {
          base: 'text-purple-700',
          hover: 'hover:text-purple-800',
          active: 'active:text-purple-900'
        };
        theme.title.themes.size.text.hero = 'text-5xl';
        theme.title.themes.size.text.display = 'text-6xl';
        theme.title.themes.typography.fontWeight.black = 'font-black tracking-tight';
        theme.title.themes.typography.fontWeight.extrabold = 'font-extrabold tracking-wide';
        theme.title.themes.typography.fontFamily.display = 'font-serif';

        // Override link themes
        theme.link.base = 'px-2 py-1 rounded transition-all duration-200';
        theme.link.themes.appearance.text.nav = {
          base: 'text-indigo-600',
          hover: 'hover:text-indigo-800',
          active: 'active:text-indigo-900'
        };
        theme.link.themes.appearance.text.brand = {
          base: 'text-purple-600',
          hover: 'hover:text-purple-700',
          active: 'active:text-purple-800'
        };
        theme.link.themes.size.text.nav = 'text-lg';
        theme.link.themes.size.text.hero = 'text-xl';
        theme.link.themes.typography.fontWeight.semibold = 'font-semibold';
        theme.link.themes.typography.fontWeight.bold = 'font-bold';
        theme.link.themes.typography.textDecoration['hover-underline'] = 'hover:underline';
        theme.link.themes.typography.textDecoration['always-underline'] = 'underline decoration-2';

        // Override list themes
        theme.list.base = 'space-y-2 border border-gray-200 rounded-lg p-4 bg-white shadow-sm';
        theme.list.themes.appearance.text.content = {
          base: 'text-gray-800',
          hover: 'hover:text-gray-900',
          active: 'active:text-gray-950'
        };
        theme.list.themes.appearance.text.muted = {
          base: 'text-gray-600',
          hover: 'hover:text-gray-700',
          active: 'active:text-gray-800'
        };
        theme.list.themes.size.text.content = 'text-lg leading-relaxed';
        theme.list.themes.size.text.compact = 'text-base leading-snug';
        theme.list.themes.size.paddingLeft.content = 'pl-6';
        theme.list.themes.size.paddingLeft.deep = 'pl-10';
        theme.list.themes.typography.fontWeight.medium = 'font-medium';
        theme.list.themes.typography.fontWeight.semibold = 'font-semibold';

        return theme;
      };

      const { container } = render(
        <ThemeProvider themeOverride={themeOverride}>
          <Md content={content} />
        </ThemeProvider>
      );

      const h1 = container.querySelector('h1');
      const link = container.querySelector('a');
      const list = container.querySelector('ul');

      expect(h1).toHaveClass('border-b-2', 'border-indigo-200', 'pb-3', 'mb-6');
      expect(link).toHaveClass('px-2', 'py-1', 'rounded', 'transition-all', 'duration-200');
      expect(list).toHaveClass('space-y-2', 'border', 'border-gray-200', 'rounded-lg', 'p-4', 'bg-white', 'shadow-sm');

      expect(h1).toBeInTheDocument();
      expect(link).toBeInTheDocument();
      expect(list).toBeInTheDocument();
      expect(link).toHaveAttribute('href', 'https://example.com');
    });

    it('should handle themeOverride with rerender', () => {
      const content = '# Dynamic Override';
      
      let overrideMode = 'danger';
      const themeOverride = (theme: ThemeProps): ThemeProps => {
        // Direct property assignment
        theme.title.defaults = {
          ...theme.title.defaults,
          [overrideMode]: true,
          default: false,
        };
        return theme;
      };

      const { container, rerender } = render(
        <ThemeProvider themeOverride={themeOverride}>
          <Md content={content} />
        </ThemeProvider>
      );

      let h1 = container.querySelector('h1');
      expect(h1).toHaveClass('text-(--text-color-danger)');

      // Change override mode and rerender
      overrideMode = 'success';
      rerender(
        <ThemeProvider themeOverride={themeOverride}>
          <Md content={content} />
        </ThemeProvider>
      );

      h1 = container.querySelector('h1');
      expect(h1).toHaveClass('text-(--text-color-success)');
      expect(h1).not.toHaveClass('text-(--text-color-danger)');
    });
  });
});